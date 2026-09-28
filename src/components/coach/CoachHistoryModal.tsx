import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '../../constants/theme';
import {
  deleteAiConversation,
  deleteAiReport,
  getAiConversations,
  getAiReports,
  type AiConversationRecord,
  type AiReportRecord,
} from '../../db/aiHistory';
import { FormattedCoachMessage } from './FormattedCoachMessage';

type Props = {
  visible: boolean;
  onClose: () => void;
  userId: string;
  currentConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onStartNewConversation: () => void;
};

export function CoachHistoryModal({
  visible,
  onClose,
  userId,
  currentConversationId,
  onSelectConversation,
  onStartNewConversation,
}: Props) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'chats' | 'reports'>('chats');
  const [conversations, setConversations] = useState<AiConversationRecord[]>([]);
  const [reports, setReports] = useState<AiReportRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Seçili raporun detay görünümü
  const [selectedReport, setSelectedReport] = useState<AiReportRecord | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [convList, reportList] = await Promise.all([
        getAiConversations(userId),
        getAiReports(userId),
      ]);
      setConversations(convList);
      setReports(reportList);
    } catch (err) {
      console.warn('[CoachHistoryModal] Veri yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setSelectedReport(null);
      loadData();
    }
  }, [visible, userId]);

  const handleDeleteConversation = (conv: AiConversationRecord) => {
    Alert.alert(
      'Sohbeti Sil',
      `"${conv.title}" başlıklı konuşmayı silmek istediğine emin misin?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            await deleteAiConversation(conv.id);
            setConversations((prev) => prev.filter((c) => c.id !== conv.id));
            if (currentConversationId === conv.id) {
              onStartNewConversation();
            }
          },
        },
      ]
    );
  };

  const handleDeleteReport = (report: AiReportRecord) => {
    Alert.alert(
      'Raporu Sil',
      `"${report.title}" raporunu silmek istediğine emin misin?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            await deleteAiReport(report.id);
            setReports((prev) => prev.filter((r) => r.id !== report.id));
            if (selectedReport?.id === report.id) {
              setSelectedReport(null);
            }
          },
        },
      ]
    );
  };

  const handleCopyReportContent = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2000);
    } catch (err) {
      console.warn('[CoachHistoryModal] Kopyalama hatası:', err);
    }
  };

  const formatDate = (timestampSec: number) => {
    const d = new Date(timestampSec * 1000);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) {
      return `Bugün ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top || 16, paddingBottom: insets.bottom || 16 }]}>
        {/* MODAL ÜST BAŞLIK */}
        <View style={styles.header}>
          {selectedReport ? (
            <Pressable
              onPress={() => setSelectedReport(null)}
              style={styles.backBtn}
              hitSlop={12}
            >
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
              <Text style={styles.backBtnText}>Raporlar</Text>
            </Pressable>
          ) : (
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconContainer}>
                <Ionicons name="time" size={18} color={colors.accentAlt} />
              </View>
              <Text style={styles.title}>AI Koç Geçmişi</Text>
            </View>
          )}

          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* EĞER BİR RAPOR SEÇİLMİŞSE DETAYINI GÖSTER */}
        {selectedReport ? (
          <View style={styles.reportDetailContainer}>
            <View style={styles.reportDetailHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.reportBadgeRow}>
                  <View style={styles.reportTypeBadge}>
                    <Text style={styles.reportTypeBadgeText}>Haftalık Analiz</Text>
                  </View>
                  <Text style={styles.reportPeriodText}>
                    {selectedReport.periodStart} ➔ {selectedReport.periodEnd}
                  </Text>
                </View>
                <Text style={styles.reportDetailTitle}>{selectedReport.title}</Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Pressable
                  onPress={() => handleCopyReportContent(selectedReport.contentMd)}
                  style={styles.actionIconBtn}
                  hitSlop={8}
                >
                  <Ionicons
                    name={copiedReport ? 'checkmark-circle' : 'copy-outline'}
                    size={20}
                    color={copiedReport ? colors.accent : colors.textMuted}
                  />
                </Pressable>
                <Pressable
                  onPress={() => handleDeleteReport(selectedReport)}
                  style={styles.actionIconBtn}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </Pressable>
              </View>
            </View>

            <ScrollView
              style={styles.reportScroll}
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              <FormattedCoachMessage content={selectedReport.contentMd} />
            </ScrollView>
          </View>
        ) : (
          <>
            {/* SEKME SEÇİCİ (Sohbetler / Haftalık Raporlar) */}
            <View style={styles.tabContainer}>
              <Pressable
                onPress={() => setActiveTab('chats')}
                style={[styles.tabButton, activeTab === 'chats' && styles.tabButtonActive]}
              >
                <Ionicons
                  name="chatbubbles"
                  size={16}
                  color={activeTab === 'chats' ? colors.accentAlt : colors.textMuted}
                />
                <Text
                  style={[styles.tabText, activeTab === 'chats' && styles.tabTextActive]}
                >
                  Sohbetler ({conversations.length})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab('reports')}
                style={[styles.tabButton, activeTab === 'reports' && styles.tabButtonActive]}
              >
                <Ionicons
                  name="analytics"
                  size={16}
                  color={activeTab === 'reports' ? colors.accent : colors.textMuted}
                />
                <Text
                  style={[styles.tabText, activeTab === 'reports' && styles.tabTextActive]}
                >
                  Haftalık Raporlar ({reports.length})
                </Text>
              </Pressable>
            </View>

            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="small" color={colors.accentAlt} />
                <Text style={styles.loadingText}>Kayıtlar yükleniyor...</Text>
              </View>
            ) : activeTab === 'chats' ? (
              /* SOHBETLER LİSTESİ */
              <View style={{ flex: 1 }}>
                {/* YENİ SOHBET BAŞLAT BUTONU */}
                <Pressable
                  onPress={() => {
                    onClose();
                    onStartNewConversation();
                  }}
                  style={styles.newChatBtn}
                >
                  <View style={styles.newChatIconCircle}>
                    <Ionicons name="add" size={18} color="#0B0F14" />
                  </View>
                  <Text style={styles.newChatBtnText}>Yeni Sohbet Başlat</Text>
                </Pressable>

                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                >
                  {conversations.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="chatbubble-ellipses-outline" size={44} color={colors.textMuted} />
                      <Text style={styles.emptyTitle}>Henüz Kayıtlı Sohbet Yok</Text>
                      <Text style={styles.emptySubtitle}>
                        AI Koç ile konuşmaya başladığında sohbetlerin burada otomatik olarak saklanır.
                      </Text>
                    </View>
                  ) : (
                    conversations.map((c) => {
                      const isActive = c.id === currentConversationId;
                      return (
                        <Pressable
                          key={c.id}
                          onPress={() => {
                            onSelectConversation(c.id);
                            onClose();
                          }}
                          style={[styles.itemCard, isActive && styles.itemCardActive]}
                        >
                          <View style={styles.itemHeader}>
                            <View style={styles.itemTitleRow}>
                              <Ionicons
                                name={isActive ? 'chatbubble-ellipses' : 'chatbubble-outline'}
                                size={17}
                                color={isActive ? colors.accentAlt : colors.textMuted}
                              />
                              <Text
                                style={[styles.itemTitle, isActive && styles.itemTitleActive]}
                                numberOfLines={1}
                              >
                                {c.title}
                              </Text>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              {isActive && (
                                <View style={styles.activePill}>
                                  <Text style={styles.activePillText}>Aktif</Text>
                                </View>
                              )}
                              <Pressable
                                onPress={() => handleDeleteConversation(c)}
                                style={styles.deleteBtn}
                                hitSlop={8}
                              >
                                <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
                              </Pressable>
                            </View>
                          </View>

                          {c.lastMessageSnippet ? (
                            <Text style={styles.itemSnippet} numberOfLines={2}>
                              {c.lastMessageSnippet}
                            </Text>
                          ) : null}

                          <View style={styles.itemFooter}>
                            <View style={styles.metaRow}>
                              <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                              <Text style={styles.metaText}>{formatDate(c.lastMessageAt)}</Text>
                            </View>

                            <View style={styles.metaRow}>
                              <Ionicons name="layers-outline" size={12} color={colors.textMuted} />
                              <Text style={styles.metaText}>{c.messageCount || 0} mesaj</Text>
                            </View>
                          </View>
                        </Pressable>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            ) : (
              /* HAFTALIK RAPORLAR LİSTESİ */
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              >
                {reports.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="calendar-outline" size={44} color={colors.textMuted} />
                    <Text style={styles.emptyTitle}>Henüz Kayıtlı Rapor Yok</Text>
                    <Text style={styles.emptySubtitle}>
                      Haftalık check-in tamamladığında oluşan tüm detaylı antrenman ve kilo analiz raporların burada listelenir.
                    </Text>
                  </View>
                ) : (
                  reports.map((r) => (
                    <Pressable
                      key={r.id}
                      onPress={() => setSelectedReport(r)}
                      style={styles.itemCard}
                    >
                      <View style={styles.itemHeader}>
                        <View style={styles.reportBadgeRow}>
                          <View style={styles.reportTypeBadge}>
                            <Text style={styles.reportTypeBadgeText}>Haftalık Analiz</Text>
                          </View>
                          <Text style={styles.reportPeriodText}>
                            {r.periodStart} ➔ {r.periodEnd}
                          </Text>
                        </View>

                        <Pressable
                          onPress={() => handleDeleteReport(r)}
                          style={styles.deleteBtn}
                          hitSlop={8}
                        >
                          <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
                        </Pressable>
                      </View>

                      <Text style={styles.reportItemTitle} numberOfLines={1}>
                        {r.title}
                      </Text>

                      <Text style={styles.itemSnippet} numberOfLines={2}>
                        {r.contentMd.replace(/[#*`_]/g, '').slice(0, 110)}...
                      </Text>

                      <View style={styles.reportFooter}>
                        <View style={styles.metaRow}>
                          <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                          <Text style={styles.metaText}>{formatDate(r.createdAt)}</Text>
                        </View>

                        <View style={styles.readMoreRow}>
                          <Text style={styles.readMoreText}>Raporu Oku</Text>
                          <Ionicons name="chevron-forward" size={14} color={colors.accent} />
                        </View>
                      </View>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            )}
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backBtnText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    backgroundColor: colors.bgSurface,
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: colors.bgElevated,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accentAlt,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },
  newChatIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatBtnText: {
    color: '#0B0F14',
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  itemCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
  },
  itemCardActive: {
    borderColor: 'rgba(56, 189, 248, 0.45)',
    backgroundColor: 'rgba(56, 189, 248, 0.06)',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  itemTitleActive: {
    color: colors.accentAlt,
    fontWeight: '700',
  },
  activePill: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activePillText: {
    color: colors.accentAlt,
    fontSize: 10,
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 4,
  },
  itemSnippet: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  reportBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportTypeBadge: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  reportTypeBadgeText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  reportPeriodText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  reportItemTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 4,
  },
  reportFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 8,
    marginTop: 2,
  },
  readMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readMoreText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  reportDetailContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  reportDetailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  reportDetailTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 6,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportScroll: {
    flex: 1,
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
