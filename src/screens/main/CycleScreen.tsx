import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, shadow } from '../../theme';
import { LoadingView } from '../../ui/LoadingView';
import { PhaseRing } from '../../ui/PhaseRing';
import { useSession } from '../../state/SessionProvider';
import { getProfile, getCurrentCycle, UserRow, CycleRow } from '../../lib/api';
import { cycleDay, phaseForDay, displayPhase, cycleProgress } from '../../lib/cas';
import { getTodayLog, getTodayScore } from '../../lib/daily';

const DAYNAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Mon–Sun strip around today, with real dates. */
function weekAroundToday() {
  const today = new Date();
  const dow = (today.getDay() + 6) % 7; // 0 = Monday
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { day: DAYNAMES[d.getDay()], n: d.getDate(), today: d.toDateString() === today.toDateString() };
  });
}

export default function CycleScreen({ navigation }: any) {
  const { userId } = useSession();
  const [profile, setProfile] = useState<UserRow | null>(null);
  const [cycle, setCycle] = useState<CycleRow | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let m = true;
    (async () => {
      if (!userId) { setLoading(false); return; }
      const [p, c, log] = await Promise.all([getProfile(userId), getCurrentCycle(userId), getTodayLog(userId)]);
      if (!m) return;
      setProfile(p); setCycle(c); setLoading(false);
      // Daily "Before we Sync" gate — show once per day if mood/energy not logged.
      if (c && (!log || log.mood == null || log.energy == null)) navigation.navigate('Gate');
    })();
    return () => { m = false; };
  }, [userId]);

  // Refresh the CAS score whenever this tab regains focus (after logging).
  useEffect(() => {
    const unsub = navigation.addListener('focus', async () => {
      if (userId) setScore(await getTodayScore(userId));
    });
    return unsub;
  }, [navigation, userId]);

  const week = weekAroundToday();
  const len = cycle?.cycle_length ?? 28;
  const dur = cycle?.period_duration ?? 5;
  const day = cycle ? cycleDay(cycle.last_period_start_date, new Date(), len) : 1;
  const phase = phaseForDay(day, len, dur);
  const label = displayPhase(phase);
  const firstName = profile?.first_name ?? 'there';

  if (loading) {
    return (
      <LoadingView />
    );
  }

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.brand}>NUTRISYNC ᖭ</Text>
            <View style={styles.headerRight}>
              <Pressable style={styles.bell} onPress={() => navigation.navigate('NotificationCenter')}>
                <Text style={styles.bellIcon}>🔔</Text>
              </Pressable>
              <Pressable style={styles.avatarWrap} onPress={() => navigation.navigate('Settings')}>
                <Image source={{ uri: 'https://i.pravatar.cc/100?img=47' }} style={styles.avatar} />
                <View style={styles.online} />
              </Pressable>
            </View>
          </View>

          <Text style={styles.hello}>Hello, <Text style={styles.helloBold}>{firstName}</Text></Text>
          <Text style={styles.synced}>{cycle ? 'cycle synced ✓' : 'add your period to sync'}</Text>

          <View style={styles.weekCard}>
            {week.map((w, i) => (
              <View key={i} style={styles.weekCol}>
                <Text style={[styles.weekDay, w.today && { color: colors.coral }]}>{w.day}</Text>
                {w.today ? (
                  <View style={styles.todayPill}><Text style={styles.todayNum}>{w.n}</Text></View>
                ) : (
                  <Text style={styles.weekNum}>{String(w.n).padStart(2, '0')}</Text>
                )}
              </View>
            ))}
          </View>

          <View style={styles.ringWrap}>
            <PhaseRing phase={label} phaseLabel={label} day={day} progress={cycleProgress(day, len)} badge={len} />
          </View>

          <View style={styles.actions}>
            <Pressable onPress={() => navigation.navigate('EditPeriod')}>
              <LinearGradient colors={['#F18BA0', '#E4708A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pill}>
                <Text style={styles.pillTxt}>edit period</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('EditHealth')}>
              <LinearGradient colors={[colors.orange, colors.orangeLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pill}>
                <Text style={styles.pillTxt}>edit health</Text>
              </LinearGradient>
            </Pressable>
          </View>

          <View style={styles.scoreCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.scoreLabel}>Cycle Sync Score</Text>
              <Text style={styles.scoreHint}>
                {score == null ? 'Log your day to build today’s score' : 'Updates live as you log'}
              </Text>
            </View>
            <Text style={styles.scoreVal}>{score == null ? '—' : Math.round(score)}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.peachTop },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 6 },
  brand: { fontFamily: font.semibold, fontSize: 13, letterSpacing: 1, color: colors.ink },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bell: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  bellIcon: { fontSize: 18 },
  avatarWrap: { width: 44, height: 44 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  online: { position: 'absolute', right: 0, top: 1, width: 11, height: 11, borderRadius: 6, backgroundColor: colors.good, borderWidth: 2, borderColor: colors.white },
  hello: { fontFamily: font.regular, fontSize: 28, color: colors.ink, paddingHorizontal: 22, marginTop: 10 },
  helloBold: { fontFamily: font.bold },
  synced: { fontFamily: font.medium, fontSize: 13, color: colors.good, paddingHorizontal: 22, marginTop: 6 },
  weekCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.white, marginHorizontal: 22, marginTop: 16, borderRadius: radius.lg, paddingVertical: 14, paddingHorizontal: 10, ...shadow.card },
  weekCol: { alignItems: 'center', flex: 1 },
  weekDay: { fontFamily: font.semibold, fontSize: 13, color: colors.ink },
  weekNum: { fontFamily: font.medium, fontSize: 14, color: colors.muted, marginTop: 10 },
  todayPill: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  todayNum: { fontFamily: font.bold, fontSize: 14, color: colors.white },
  ringWrap: { alignItems: 'center', marginTop: 20 },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 18 },
  pill: { paddingHorizontal: 26, height: 46, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  pillTxt: { fontFamily: font.semibold, fontSize: 14, color: colors.white },
  scoreCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, marginHorizontal: 22, marginTop: 22, borderRadius: radius.lg, padding: 20, ...shadow.card },
  scoreLabel: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  scoreHint: { fontFamily: font.regular, fontSize: 12.5, color: colors.muted, marginTop: 3 },
  scoreVal: { fontFamily: font.bold, fontSize: 34, color: colors.coral },
});
