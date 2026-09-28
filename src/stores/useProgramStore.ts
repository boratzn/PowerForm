import { create } from 'zustand';

import {
  cloneTemplateToUserProgram,
  getActiveProgram,
  getProgramById,
  getTemplatePrograms,
  getUserPrograms,
  type ProgramDetail,
  seedLocalTemplatesIfEmpty,
  setActiveProgram as dbSetActiveProgram,
  syncTemplatesFromSupabase,
} from '../db/programs';
import { useAuthStore } from './useAuthStore';

type ProgramState = {
  activeProgram: ProgramDetail | null;
  templates: ProgramDetail[];
  userPrograms: ProgramDetail[];
  selectedDayIndex: number;
  isLoading: boolean;

  initialize: () => Promise<void>;
  loadActiveProgram: () => Promise<void>;
  loadTemplates: () => Promise<void>;
  loadUserPrograms: () => Promise<void>;
  setSelectedDayIndex: (index: number) => void;
  activateProgram: (programClientUuid: string) => Promise<void>;
  cloneAndActivateTemplate: (templateClientUuid: string) => Promise<string>;
};

export const useProgramStore = create<ProgramState>((set, get) => ({
  activeProgram: null,
  templates: [],
  userPrograms: [],
  selectedDayIndex: 1,
  isLoading: false,

  initialize: async () => {
    set({ isLoading: true });
    try {
      await seedLocalTemplatesIfEmpty();
      syncTemplatesFromSupabase().catch(() => {}); // arka planda sessiz senkron
      await Promise.all([get().loadActiveProgram(), get().loadTemplates(), get().loadUserPrograms()]);
    } finally {
      set({ isLoading: false });
    }
  },

  loadActiveProgram: async () => {
    const userId = useAuthStore.getState().session?.user.id;
    if (!userId) {
      set({ activeProgram: null });
      return;
    }
    const prog = await getActiveProgram(userId);
    set({ activeProgram: prog });
  },

  loadTemplates: async () => {
    const t = await getTemplatePrograms();
    set({ templates: t });
  },

  loadUserPrograms: async () => {
    const userId = useAuthStore.getState().session?.user.id;
    if (!userId) {
      set({ userPrograms: [] });
      return;
    }
    const u = await getUserPrograms(userId);
    set({ userPrograms: u });
  },

  setSelectedDayIndex: (index: number) => {
    set({ selectedDayIndex: index });
  },

  activateProgram: async (programClientUuid: string) => {
    const userId = useAuthStore.getState().session?.user.id;
    if (!userId) throw new Error('Oturum açık değil');
    set({ isLoading: true });
    try {
      await dbSetActiveProgram(programClientUuid, userId);
      await Promise.all([get().loadActiveProgram(), get().loadUserPrograms()]);
    } finally {
      set({ isLoading: false });
    }
  },

  cloneAndActivateTemplate: async (templateClientUuid: string) => {
    const userId = useAuthStore.getState().session?.user.id;
    if (!userId) throw new Error('Oturum açık değil');
    set({ isLoading: true });
    try {
      const newUuid = await cloneTemplateToUserProgram(templateClientUuid, userId, true);
      await Promise.all([get().loadActiveProgram(), get().loadUserPrograms()]);
      return newUuid;
    } finally {
      set({ isLoading: false });
    }
  },
}));
