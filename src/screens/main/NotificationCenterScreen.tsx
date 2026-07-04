import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, shadow, phaseColor, PhaseKey } from '../../theme';
import { useT } from '../../i18n';
import { LoadingView } from '../../ui/LoadingView';
import { useSession } from '../../state/SessionProvider';
import { getCurrentCycle } from '../../lib/api';
import { cycleDay, phaseForDay, displayPhase } from '../../lib/cas';
import { getTodayLog, getTodayScore } from '../../lib/daily';
import { fetchTips } from '../../lib/content';

type Note = { icon: string; title: string; body: string; accent: string; when: string };

/**
 * Notification Center — a live feed computed from the user's real cycle,
 * phase and today's logging state (no fake notifications).
 */
export default function NotificationCenterScreen({ navigation }: any) {
  const t = useT();
  const { userId } = useSession();
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    (async () => {
      if (!userId) { setLoading(false); return; }
      const cycle = await getCurrentCycle(userId);
      const [log, score] = await Promise.all([getTodayLog(userId), getTodayScore(userId)]);

      const out: Note[] = [];
      if (cycle) {
        const len = cycle.cycle_length ?? 28;
        const dur = cycle.period_duration ?? 5;
        const day = cycleDay(cycle.last_period_start_date, new Date(), len);
        const p5 = phaseForDay(day, len, dur);
        const ui = displayPhase(p5) as PhaseKey;
        const tips = await fetchTips(ui);

        out.push({
          icon: '🌙', accent: phaseColor[ui] ?? colors.coral,
          title: `You're in your ${ui} phase`,
          body: tips.daily_tip ?? `Day ${day} of ${len}. Your nutrition and movement guidance is tuned to this phase.`,
          when: 'Today',
        });

        // Logging nudge
        const notLogged = !log || log.mood == null || log.energy == null;
        if (notLogged) {
          out.push({
            icon: '📝', accent: colors.orange,
            title: 'Daily check-in is waiting',
            body: "Log today's mood & energy to keep your Cycle Sync Score accurate.",
            when: 'Today',
          });
        }

        // Score status
        if (score != null) {
          out.push({
            icon: '✨', accent: colors.good,
            title: `Today's Sync Score is ${Math.round(score)}`,
            body: score >= 70 ? "You're well aligned with your cycle today — keep it up." : 'A little logging and phase-friendly choices will lift this.',
            when: 'Today',
          });
        }

        // Cycle milestone
        if (day <= dur) {
          out.push({ icon: '🩸', accent: colors.menstrual, title: 'Menstrual phase — rest & replenish', body: 'Iron-rich foods and gentle movement help most right now.', when: 'Today' });
        } else if (Math.abs(day - Math.round(len / 2)) <= 1) {
          out.push({ icon: '⚡️', accent: colors.ovulatory, title: 'Ovulation window', body: 'Energy tends to peak — a good time for higher-intensity movement.', when: 'Today' });
        }
      } else {
        out.push({
          icon: '👋', accent: colors.coral,
          title: 'Welcome to NutriSync',
          body: 'Add your period to sync your cycle and unlock phase-based guidance.',
          when: 'Now',
        });
      }
      setNotes(out);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <LoadingView />;

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>‹</Text></Pressable>
          <Text style={styles.headerTitle}>{t('mob.notifications', "Notifications")}</Text><View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {notes.map((n, i) => (
            <View key={i} style={styles.card}>
              <View style={[styles.iconWrap, { backgroundColor: n.accent + '22' }]}>
                <Text style={styles.icon}>{n.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>{n.title}</Text>
                  <Text style={styles.when}>{n.when}</Text>
                </View>
                <Text style={styles.body}>{n.body}</Text>
              </View>
            </View>
          ))}
          <Text style={styles.note}>Reminders update through your day as you log and your phase shifts.</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.peachTop },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4 },
  back: { fontSize: 30, color: colors.ink, width: 24 },
  headerTitle: { fontFamily: font.semibold, fontSize: 17, color: colors.ink },
  card: { flexDirection: 'row', gap: 12, backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, marginTop: 12, ...shadow.card },
  iconWrap: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: font.semibold, fontSize: 14.5, color: colors.ink, flex: 1, paddingRight: 8, textTransform: 'capitalize' },
  when: { fontFamily: font.regular, fontSize: 11, color: colors.faint },
  body: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 3, lineHeight: 18 },
  note: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 18, textAlign: 'center' },
});
