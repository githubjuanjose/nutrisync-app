import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { colors, PhaseKey } from '../../theme';
import { useT } from '../../i18n';
import { LoadingView } from '../../ui/LoadingView';
import { useSession } from '../../state/SessionProvider';
import { getProfile, getCurrentCycle } from '../../lib/api';
import { cycleDay, phaseForDay, displayPhase } from '../../lib/cas';
import { fetchMovement, fetchTips, MovementItem, Tips } from '../../lib/content';
import { saveChecklist } from '../../lib/daily';
import DailyLogScreen, { LogItem } from './DailyLogScreen';

export default function MovementLogScreen() {
  const t = useT();
  const { userId } = useSession();
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState(false);
  const [name, setName] = useState('there');
  const [phase, setPhase] = useState<PhaseKey>('menstrual');
  const [phase5, setPhase5] = useState<string>('menstrual');
  const [day, setDay] = useState(1);
  const [moves, setMoves] = useState<MovementItem[]>([]);
  const [tips, setTips] = useState<Tips>({});

  useEffect(() => {
    let m = true;
    (async () => {
      if (!userId) { setLoading(false); return; }
      const [profile, cycle] = await Promise.all([getProfile(userId), getCurrentCycle(userId)]);
      const len = cycle?.cycle_length ?? 28;
      const d = cycle ? cycleDay(cycle.last_period_start_date, new Date(), len) : 1;
      const p5 = phaseForDay(d, len, cycle?.period_duration ?? 5);
      const ui = displayPhase(p5);
      const [mv, t] = await Promise.all([fetchMovement(), fetchTips(ui)]);
      if (!m) return;
      setName(profile?.first_name ?? 'there'); setDay(d); setPhase(ui); setPhase5(p5);
      setMoves(mv); setTips(t); setLoading(false);
    })();
    return () => { m = false; };
  }, [userId]);

  const onLog = async (checkedNames: string[]) => {
    if (!userId) return;
    setLogging(true);
    try {
      const rows = moves.map((mv) => ({
        phase: phase5, item_name: mv.item_name, category_tag: mv.category_tag,
        intensity_level: mv.intensity, checked: checkedNames.includes(mv.item_name),
      }));
      await saveChecklist(userId, 'movement_checklist', rows);
    } finally {
      setLogging(false);
    }
  };

  if (loading) return <LoadingView />;

  const items: LogItem[] = moves.map((mv) => ({ name: mv.item_name, tag: mv.category_tag }));
  return (
    <DailyLogScreen
      title={t('mob.movementLog', "Movement Log")} greeting={`Good morning, ${name}`} checklistTitle={t('mob.movement', "Movement")}
      items={items} tips={{ primary: tips.daily_tip, insight: tips.body_insight }}
      phase={phase} day={day} mealTitle={t('mob.todaysMovement', "TODAY'S MOVEMENT")} logging={logging} onLog={onLog}
    />
  );
}
