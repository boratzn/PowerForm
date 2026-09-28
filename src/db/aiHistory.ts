import { desc, eq, sql } from 'drizzle-orm';

import { supabase } from '../lib/supabase';
import { generateUuid } from '../lib/uuid';
import { db } from './client';
import { aiConversations, aiMessages, aiReports } from './schema';

export type AiReportRecord = {
  id: string;
  userId: string;
  reportType: string;
  periodStart: string;
  periodEnd: string;
  title: string;
  contentMd: string;
  metricsJson: string | null;
  isRead: boolean;
  createdAt: number;
};

export type AiConversationRecord = {
  id: string;
  userId: string;
  title: string;
  lastMessageAt: number;
  createdAt: number;
  messageCount?: number;
  lastMessageSnippet?: string;
};

export type AiMessageRecord = {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
};

// =========================================================
// AI RAPORLARI (HAFTALIK / DÖNEMSEL)
// =========================================================

export async function saveAiReport(params: {
  id?: string;
  userId: string;
  reportType?: string;
  periodStart: string;
  periodEnd: string;
  title: string;
  contentMd: string;
  metrics?: any;
}): Promise<AiReportRecord> {
  const id = params.id || generateUuid();
  const nowSec = Math.floor(Date.now() / 1000);
  const metricsJson = params.metrics ? JSON.stringify(params.metrics) : null;
  const reportType = params.reportType || 'weekly';

  const newReport = {
    id,
    userId: params.userId,
    reportType,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    title: params.title,
    contentMd: params.contentMd,
    metricsJson,
    isRead: false,
    createdAt: nowSec,
  };

  // 1. Yerel SQLite'a kaydet (offline-first)
  await db
    .insert(aiReports)
    .values(newReport)
    .onConflictDoUpdate({
      target: aiReports.id,
      set: {
        title: params.title,
        contentMd: params.contentMd,
        metricsJson,
      },
    });

  // 2. Supabase varsa arka planda senkron et (opsiyonel / fire-and-forget)
  (async () => {
    try {
      const { error } = await supabase.from('ai_reports').upsert({
        id,
        user_id: params.userId,
        report_type: reportType as any,
        period_start: params.periodStart,
        period_end: params.periodEnd,
        content_md: params.contentMd,
        metrics: params.metrics ?? null,
        is_read: false,
      });
      if (error) {
        console.warn('[aiHistory] Supabase ai_reports senkron uyarısı:', error.message);
      }
    } catch (err) {
      console.warn('[aiHistory] Supabase ai_reports senkron hatası:', err);
    }
  })();

  return newReport;
}

export async function getAiReports(userId: string): Promise<AiReportRecord[]> {
  try {
    const rows = await db
      .select()
      .from(aiReports)
      .where(eq(aiReports.userId, userId))
      .orderBy(desc(aiReports.createdAt));

    return rows.map((r) => ({
      ...r,
      isRead: Boolean(r.isRead),
    }));
  } catch (err) {
    console.warn('[aiHistory] getAiReports hatası:', err);
    return [];
  }
}

export async function getAiReportById(reportId: string): Promise<AiReportRecord | null> {
  try {
    const rows = await db
      .select()
      .from(aiReports)
      .where(eq(aiReports.id, reportId))
      .limit(1);

    if (rows.length === 0) return null;
    return {
      ...rows[0],
      isRead: Boolean(rows[0].isRead),
    };
  } catch (err) {
    console.warn('[aiHistory] getAiReportById hatası:', err);
    return null;
  }
}

export async function deleteAiReport(reportId: string): Promise<void> {
  try {
    await db.delete(aiReports).where(eq(aiReports.id, reportId));
    // Supabase arka plan silme
    supabase.from('ai_reports').delete().eq('id', reportId).then();
  } catch (err) {
    console.warn('[aiHistory] deleteAiReport hatası:', err);
  }
}

// =========================================================
// AI SOHBET GEÇMİŞİ (CONVERSATIONS & MESSAGES)
// =========================================================

export async function createAiConversation(
  userId: string,
  title?: string
): Promise<AiConversationRecord> {
  const id = generateUuid();
  const nowSec = Math.floor(Date.now() / 1000);
  const convTitle = title || `Sohbet - ${new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}`;

  const newConv = {
    id,
    userId,
    title: convTitle,
    lastMessageAt: nowSec,
    createdAt: nowSec,
  };

  await db.insert(aiConversations).values(newConv);
  return newConv;
}

export async function getOrCreateActiveConversation(
  userId: string
): Promise<AiConversationRecord> {
  try {
    const convs = await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.userId, userId))
      .orderBy(desc(aiConversations.lastMessageAt))
      .limit(1);

    if (convs.length > 0) {
      return convs[0];
    }
  } catch (err) {
    console.warn('[aiHistory] getOrCreateActiveConversation arama hatası:', err);
  }

  return await createAiConversation(userId);
}

export async function getAiConversations(userId: string): Promise<AiConversationRecord[]> {
  try {
    const convList = await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.userId, userId))
      .orderBy(desc(aiConversations.lastMessageAt));

    // Her sohbet için mesaj sayısı ve son mesaj özeti ekle
    const result: AiConversationRecord[] = [];
    for (const c of convList) {
      const msgs = await db
        .select({
          content: aiMessages.content,
          createdAt: aiMessages.createdAt,
        })
        .from(aiMessages)
        .where(eq(aiMessages.conversationId, c.id))
        .orderBy(desc(aiMessages.createdAt))
        .limit(1);

      const countRes = await db
        .select({ count: sql<number>`count(*)` })
        .from(aiMessages)
        .where(eq(aiMessages.conversationId, c.id));

      result.push({
        ...c,
        messageCount: countRes[0]?.count ?? 0,
        lastMessageSnippet: msgs[0]?.content
          ? msgs[0].content.slice(0, 60).replace(/\n/g, ' ')
          : undefined,
      });
    }

    return result;
  } catch (err) {
    console.warn('[aiHistory] getAiConversations hatası:', err);
    return [];
  }
}

export async function getAiConversationMessages(
  conversationId: string
): Promise<AiMessageRecord[]> {
  try {
    const rows = await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, conversationId))
      .orderBy(aiMessages.createdAt);

    return rows.map((r) => ({
      ...r,
      role: r.role as 'user' | 'assistant' | 'system',
    }));
  } catch (err) {
    console.warn('[aiHistory] getAiConversationMessages hatası:', err);
    return [];
  }
}

export async function saveAiMessage(params: {
  id?: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: number;
}): Promise<AiMessageRecord> {
  const id = params.id || generateUuid();
  const nowSec = params.createdAt
    ? Math.floor(params.createdAt > 1e11 ? params.createdAt / 1000 : params.createdAt)
    : Math.floor(Date.now() / 1000);

  const newMsg = {
    id,
    conversationId: params.conversationId,
    role: params.role,
    content: params.content,
    createdAt: nowSec,
  };

  await db.insert(aiMessages).values(newMsg);

  // Sohbetin son mesaj tarihini güncelle
  await db
    .update(aiConversations)
    .set({ lastMessageAt: nowSec })
    .where(eq(aiConversations.id, params.conversationId));

  // Eğer kullanıcı mesajıysa ve sohbet başlığı default ise, ilk mesajla anlamlı başlık ver
  if (params.role === 'user') {
    try {
      const conv = await db
        .select({ title: aiConversations.title })
        .from(aiConversations)
        .where(eq(aiConversations.id, params.conversationId))
        .limit(1);

      if (conv.length > 0 && conv[0].title.startsWith('Sohbet -')) {
        const cleanTitle = params.content.trim().slice(0, 36).replace(/\n/g, ' ');
        if (cleanTitle.length > 3) {
          await db
            .update(aiConversations)
            .set({ title: cleanTitle })
            .where(eq(aiConversations.id, params.conversationId));
        }
      }
    } catch (e) {
      // sessizce geç
    }
  }

  return newMsg;
}

export async function deleteAiConversation(conversationId: string): Promise<void> {
  try {
    await db.delete(aiMessages).where(eq(aiMessages.conversationId, conversationId));
    await db.delete(aiConversations).where(eq(aiConversations.id, conversationId));
  } catch (err) {
    console.warn('[aiHistory] deleteAiConversation hatası:', err);
  }
}
