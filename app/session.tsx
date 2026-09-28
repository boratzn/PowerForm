import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ModernConfirmModal } from '../src/components/ui';
import {
  ExerciseCard,
  ExercisePickerSheet,
  ExerciseProgressModal,
  NumericKeypad,
  RestTimerBar,
  SessionCompletedModal,
  type ActiveField,
} from '../src/components/session';
import { getProgramDayExercises } from '../src/db/programs';
import type { LocalExercise } from '../src/db/queries';
import { calculateVolume, formatDurationHuman } from '../src/lib/calculations';
import { cancelRestEndNotification, scheduleRestEndNotification } from '../src/lib/restNotification';
import { useLanguageStore } from '../src/stores/useLanguageStore';
import { useSessionStore } from '../src/stores/useSessionStore';

type ActiveFieldRef = { exerciseClientUuid: string; setClientUuid: string; field: ActiveField } | null;

const FIELD_CONFIG: Record<ActiveField, { label: string; allowDecimal: boolean; step: number }> = {
  weightKg: { label: 'KG', allowDecimal: true, step: 2.5 },
  reps: { label: 'TEKRAR', allowDecimal: false, step: 1 },
  rir: { label: 'RIR', allowDecimal: false, step: 1 },
};

// Uygulamanın en kritik ekranı (§10.2). Tamamen yerel SQLite üzerinden çalışır —
// Supabase/Anthropic bağlantısı bilerek bu iş paketinin dışında tutuldu (bkz. PROGRESS.md).
export default function SessionScreen() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const sessionClientUuid = useSessionStore((s) => s.sessionClientUuid);
  const startedAt = useSessionStore((s) => s.startedAt);
  const exercises = useSessionStore((s) => s.exercises);
  const restTimer = useSessionStore((s) => s.restTimer);
  const resumeOrStartSession = useSessionStore((s) => s.resumeOrStartSession);
  const addExercise = useSessionStore((s) => s.addExercise);
  const removeExercise = useSessionStore((s) => s.removeExercise);
  const updateExerciseNotes = useSessionStore((s) => s.updateExerciseNotes);
  const addSet = useSessionStore((s) => s.addSet);
  const updateDraftSet = useSessionStore((s) => s.updateDraftSet);
  const confirmSet = useSessionStore((s) => s.confirmSet);
  const reopenSet = useSessionStore((s) => s.reopenSet);
  const deleteSet = useSessionStore((s) => s.deleteSet);
  const tickRestTimer = useSessionStore((s) => s.tickRestTimer);
  const adjustRestTimer = useSessionStore((s) => s.adjustRestTimer);
  const skipRestTimer = useSessionStore((s) => s.skipRestTimer);
  const endSession = useSessionStore((s) => s.endSession);
  const resetSession = useSessionStore((s) => s.reset);

  const params = useLocalSearchParams<{ programId?: string; programDayId?: string }>();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [activeField, setActiveField] = useState<ActiveFieldRef>(null);
  const [draftValue, setDraftValue] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedExerciseForProgress, setSelectedExerciseForProgress] = useState<string | null>(null);

  const [finishModalVisible, setFinishModalVisible] = useState(false);
  const [completedSummary, setCompletedSummary] = useState<{
    durationSeconds: number;
    totalVolumeKg: number;
    prCount: number;
  } | null>(null);
  const [deleteSetTarget, setDeleteSetTarget] = useState<{
    exerciseClientUuid: string;
    setClientUuid: string;
  } | null>(null);

  const t = useLanguageStore((s) => s.t);
  const isEndingRef = useRef(false);
  const isInitializedRef = useRef(false);

  // Yarım kalan bir seans varsa ondan devam eder; yoksa programa bağlı veya ad-hoc başlar.
  // Yalnızca ekran ilk açıldığında (mount) bir kez çalışır; seans bitirildiğinde tekrar tetiklenmez.
  useEffect(() => {
    if (isInitializedRef.current || isEndingRef.current) return;
    isInitializedRef.current = true;

    if (!sessionClientUuid) {
      if (params.programDayId) {
        getProgramDayExercises(params.programDayId)
          .then((initialExercises) => {
            if (isEndingRef.current) return;
            return resumeOrStartSession({
              programId: params.programId,
              programDayId: params.programDayId,
              initialExercises,
            });
          })
          .catch((err) => console.error('[session] resumeOrStartSession hatası:', err));
      } else {
        resumeOrStartSession().catch((err) => console.error('[session] resumeOrStartSession hatası:', err));
      }
    }
  }, []);

  // Süre sayacı
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setElapsedSeconds(Math.floor(Date.now() / 1000) - startedAt), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  // Dinlenme sayacı — her saniye tick, bitince titreşim (kural 5)
  const wasRestRunning = useRef(false);
  useEffect(() => {
    if (!restTimer.isRunning) {
      if (wasRestRunning.current) {
        Vibration.vibrate(400);
        cancelRestEndNotification();
      }
      wasRestRunning.current = false;
      return;
    }
    wasRestRunning.current = true;
    const id = setInterval(tickRestTimer, 1000);
    return () => clearInterval(id);
  }, [restTimer.isRunning, tickRestTimer]);

  // Dinlenme sayacı başladığında/uzadığında arka plan bildirimini (yeniden) zamanla
  useEffect(() => {
    if (restTimer.isRunning) {
      scheduleRestEndNotification(restTimer.secondsLeft, t('tab_workout')).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restTimer.isRunning, restTimer.totalSeconds]);

  useEffect(() => {
    return () => {
      cancelRestEndNotification();
    };
  }, []);

  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const completedSets = exercises.reduce((acc, ex) => acc + ex.sets.filter((s) => s.isCompleted).length, 0);
  const totalVolumeKg = exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.isCompleted).reduce((a, s) => a + calculateVolume(s.weightKg, s.reps), 0),
    0
  );

  const handleFieldPress = (exerciseClientUuid: string, setClientUuid: string, field: ActiveField) => {
    const ex = exercises.find((e) => e.clientUuid === exerciseClientUuid);
    const s = ex?.sets.find((s) => s.clientUuid === setClientUuid);
    const current = s?.[field];
    setActiveField({ exerciseClientUuid, setClientUuid, field });
    setDraftValue(current != null ? String(current) : '');
  };

  const commitDraft = (nextValue: string) => {
    if (!activeField) return;
    setDraftValue(nextValue);
    const parsed = nextValue === '' ? null : parseFloat(nextValue);
    updateDraftSet(activeField.exerciseClientUuid, activeField.setClientUuid, {
      [activeField.field]: parsed == null || Number.isNaN(parsed) ? null : parsed,
    });
  };

  const sameAsLastInfo = (() => {
    if (!activeField || activeField.field === 'rir') return null;
    const ex = exercises.find((e) => e.clientUuid === activeField.exerciseClientUuid);
    if (!ex) return null;
    const idx = ex.sets.findIndex((s) => s.clientUuid === activeField.setClientUuid);
    const prev = idx > 0 ? ex.sets[idx - 1] : undefined;
    if (!prev?.isCompleted) return null;
    const value = activeField.field === 'weightKg' ? prev.weightKg : prev.reps;
    if (value == null) return null;
    return { label: `${prev.weightKg ?? '?'}×${prev.reps ?? '?'}`, value: String(value) };
  })();

  const isConfirmingRef = useRef(false);

  const handleToggleComplete = async (exerciseClientUuid: string, setClientUuid: string) => {
    if (isConfirmingRef.current) return;
    const ex = exercises.find((e) => e.clientUuid === exerciseClientUuid);
    const s = ex?.sets.find((s) => s.clientUuid === setClientUuid);
    if (!s) return;
    if (s.isCompleted) {
      reopenSet(exerciseClientUuid, setClientUuid);
    } else {
      isConfirmingRef.current = true;
      try {
        setActiveField(null);
        await confirmSet(exerciseClientUuid, setClientUuid);
      } finally {
        isConfirmingRef.current = false;
      }
    }
  };

  const handleLongPressSet = (exerciseClientUuid: string, setClientUuid: string) => {
    setDeleteSetTarget({ exerciseClientUuid, setClientUuid });
  };

  const handleSelectExercise = (exercise: LocalExercise) => {
    addExercise(exercise).catch((err) => console.error('[session] addExercise hatası:', err));
  };

  const confirmEndSession = async () => {
    setFinishModalVisible(false);
    isEndingRef.current = true;
    try {
      const summary = await endSession();
      resetSession();
      setCompletedSummary(summary);
    } catch (err) {
      isEndingRef.current = false;
      console.error('Seans sonlandırma hatası:', err);
    }
  };

  return (
    <View className="flex-1 bg-bg-primary" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between border-b border-bg-elevated px-lg pb-sm">
        <View>
          <Text className="text-lg font-semibold tabular-nums text-text-primary">
            {String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:{String(elapsedSeconds % 60).padStart(2, '0')}
          </Text>
          <Text className="text-xs text-text-muted">
            {completedSets}/{totalSets} {t('set').toLowerCase()} · {totalVolumeKg} kg
          </Text>
        </View>
        <Button label={t('finish')} variant="secondary" onPress={() => setFinishModalVisible(true)} />
      </View>

      <ScrollView className="flex-1 px-lg" contentContainerStyle={{ paddingTop: 16, paddingBottom: 24, gap: 16 }}>
        {exercises.map((ex) => (
          <ExerciseCard
            key={ex.clientUuid}
            exercise={ex}
            activeFieldRef={
              activeField?.exerciseClientUuid === ex.clientUuid
                ? { setClientUuid: activeField.setClientUuid, field: activeField.field }
                : null
            }
            onFieldPress={(setClientUuid, field) => handleFieldPress(ex.clientUuid, setClientUuid, field)}
            onToggleComplete={(setClientUuid) => handleToggleComplete(ex.clientUuid, setClientUuid)}
            onLongPressSet={(setClientUuid) => handleLongPressSet(ex.clientUuid, setClientUuid)}
            onAddSet={() => addSet(ex.clientUuid)}
            onRemoveExercise={() => removeExercise(ex.clientUuid)}
            onUpdateNotes={(notes) => updateExerciseNotes(ex.clientUuid, notes)}
            onPressExercise={() => setSelectedExerciseForProgress(ex.exerciseId)}
          />
        ))}

        <Button label={t('add_exercise')} variant="secondary" onPress={() => setPickerVisible(true)} />
      </ScrollView>

      {activeField ? (
        <NumericKeypad
          label={FIELD_CONFIG[activeField.field].label}
          value={draftValue}
          onChangeValue={commitDraft}
          allowDecimal={FIELD_CONFIG[activeField.field].allowDecimal}
          quickAdjustStep={FIELD_CONFIG[activeField.field].step}
          sameAsLabel={sameAsLastInfo?.label}
          onSameAsLast={sameAsLastInfo ? () => commitDraft(sameAsLastInfo.value) : undefined}
          onConfirm={() => setActiveField(null)}
        />
      ) : restTimer.isRunning ? (
        <RestTimerBar
          secondsLeft={restTimer.secondsLeft}
          totalSeconds={restTimer.totalSeconds}
          onAdjust={adjustRestTimer}
          onSkip={skipRestTimer}
        />
      ) : (
        <View style={{ height: insets.bottom }} />
      )}

      <ExercisePickerSheet visible={pickerVisible} onClose={() => setPickerVisible(false)} onSelect={handleSelectExercise} />

      <ExerciseProgressModal
        visible={!!selectedExerciseForProgress}
        exerciseId={selectedExerciseForProgress}
        onClose={() => setSelectedExerciseForProgress(null)}
      />

      {/* Modern Seansı Bitir Onay Modalı */}
      <ModernConfirmModal
        visible={finishModalVisible}
        title={t('finish_session_title')}
        description={t('finish_session_desc')}
        icon="flag-outline"
        confirmText={t('finish')}
        cancelText={t('cancel')}
        isDestructive
        onConfirm={confirmEndSession}
        onCancel={() => setFinishModalVisible(false)}
      />

      {/* Modern Seans Tamamlandı Kutlama Modalı */}
      {completedSummary && (
        <SessionCompletedModal
          visible={!!completedSummary}
          durationSeconds={completedSummary.durationSeconds}
          totalVolumeKg={completedSummary.totalVolumeKg}
          prCount={completedSummary.prCount}
          onClose={() => {
            setCompletedSummary(null);
            router.back();
          }}
        />
      )}

      {/* Modern Set Silme Onay Modalı */}
      <ModernConfirmModal
        visible={!!deleteSetTarget}
        title={t('delete_set_title')}
        description={t('delete_set_confirm')}
        icon="trash-outline"
        confirmText={t('delete')}
        cancelText={t('cancel')}
        isDestructive
        onConfirm={() => {
          if (deleteSetTarget) {
            deleteSet(deleteSetTarget.exerciseClientUuid, deleteSetTarget.setClientUuid);
            setDeleteSetTarget(null);
          }
        }}
        onCancel={() => setDeleteSetTarget(null)}
      />
    </View>
  );
}
