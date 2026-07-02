import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { colors, PhaseKey } from '../../theme';
import { useSession } from '../../state/SessionProvider';
import { getProfile, getCurrentCycle } from '../../lib/api';
import { cycleDay, phaseForDay, displayPhase } from '../../lib/cas';
import { fetchBasics, fetchTips, BasicItem, Tips } from '../../lib/content';
import { saveChecklist, saveMeal } from '../../lib/daily';
import DailyLogScreen, { LogItem } from './DailyLogScreen';

export default function NutriLogScreen() {
  const { userId } = useSession();
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState(false);
  const [name, setName] = useState('there');
  const [phase, setPhase] = useState<PhaseKey>('menstrual');
  const [phase5, setPhase5] = useState<string>('menstrual');
  const [day, setDay] = useState(1);
  const [basics, setBasics] = useState<BasicItem[]>([]);
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
      const [b, t] = await Promise.all([fetchBasics(ui), fetchTips(ui)]);
      if (!m) return;
      setName(profile?.first_name ?? 'there'); setDay(d); setPhase(ui); setPhase5(p5);
      setBasics(b); setTips(t); setLoading(false);
    })();
    return () => { m = false; };
  }, [userId]);

  const onLog = async (checkedNames: string[], text: string) => {
    if (!userId) return;
    setLogging(true);
    try {
      const rows = basics.map((b) => ({
        phase: phase5, item_name: b.item_name, nutrient_tag: b.nutrient_tag,
        checked: checkedNames.includes(b.item_name),
      }));
      await saveChecklist(userId, 'nutrition_checklist', rows);
      if (text.trim()) await saveMeal(userId, text.trim());
    } finally {
      setLogging(false);
    }
  };

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.peachTop, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.coral} /></View>;

  const items: LogItem[] = basics.map((b) => ({ name: b.item_name, tag: b.nutrient_tag }));
  return (
    <DailyLogScreen
      title="NutriLog" greeting={`Good morning, ${name}`} checklistTitle="Nutri Basics"
      items={items} tips={{ primary: tips.daily_tip, insight: tips.body_insight }}
      phase={phase} day={day} mealTitle="TODAY'S MEAL" logging={logging} onLog={onLog}
    />
  );
}
