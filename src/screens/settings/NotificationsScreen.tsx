import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, shadow } from '../../theme';
import { useT } from '../../i18n';

export default function NotificationsScreen({ navigation }: any) {
  const t = useT();
  const [state, setState] = useState<Record<string, boolean>>({
    daily: true, mood: true, phase: true, nutri: true, movement: false, community: false, quiet: true,
  });
  const set = (k: string) => (v: boolean) => setState((s) => ({ ...s, [k]: v }));

  const groups: { title: string; rows: { k: string; title: string; sub: string }[] }[] = [
    { title: 'DAILY REMINDERS', rows: [
      { k: 'daily', title: 'Daily log reminder', sub: 'A gentle nudge to log your day' },
      { k: 'mood', title: 'Mood & energy check-in', sub: 'Before-you-sync prompt each morning' },
      { k: 'nutri', title: 'NutriLog reminder', sub: "Today's Nutri Basics" },
      { k: 'movement', title: 'Movement reminder', sub: 'Phase-matched movement suggestion' },
    ]},
    { title: 'CYCLE', rows: [
      { k: 'phase', title: 'Phase-change nudges', sub: 'When you enter a new phase' },
    ]},
    { title: 'COMMUNITY', rows: [
      { k: 'community', title: 'Community activity', sub: 'Replies and streak milestones' },
    ]},
    { title: 'QUIET HOURS', rows: [
      { k: 'quiet', title: 'Pause 10pm – 7am', sub: 'No notifications overnight' },
    ]},
  ];

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>‹</Text></Pressable>
          <Text style={styles.headerTitle}>{t('mob.notifReminders', "Notifications & Reminders")}</Text><View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {groups.map((g) => (
            <View key={g.title}>
              <Text style={styles.sectionTitle}>{g.title}</Text>
              <View style={styles.card}>
                {g.rows.map((r, i) => (
                  <View key={r.k} style={[styles.row, i < g.rows.length - 1 && styles.rowBorder]}>
                    <View style={{ flex: 1 }}><Text style={styles.title}>{r.title}</Text><Text style={styles.sub}>{r.sub}</Text></View>
                    <Switch value={state[r.k]} onValueChange={set(r.k)} trackColor={{ true: colors.coral, false: '#E4DAD0' }} thumbColor="#fff" />
                  </View>
                ))}
              </View>
            </View>
          ))}
          <Text style={styles.note}>Push delivery requires notification permission (wired with the connectors work).</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.peachTop },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4 },
  back: { fontSize: 30, color: colors.ink, width: 24 },
  headerTitle: { fontFamily: font.semibold, fontSize: 16, color: colors.ink },
  sectionTitle: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 1, color: colors.muted, marginTop: 18, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: 16, ...shadow.card },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F4EBE3' },
  title: { fontFamily: font.medium, fontSize: 14.5, color: colors.ink },
  sub: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  note: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 18, textAlign: 'center' },
});
