import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SettingsIcon } from '../../ui/SettingsIcons';
import { colors, font, radius, shadow } from '../../theme';
import { useT } from '../../i18n';

const WHO = ['Everyone', 'Friends only', 'Nobody'];

export default function CommunityPrivacyScreen({ navigation }: any) {
  const t = useT();
  const [feed, setFeed] = useState(true);
  const [cycle, setCycle] = useState(false);
  const [streaks, setStreaks] = useState(true);
  const [who, setWho] = useState('Friends only');

  const Toggle = ({ v, set, title, sub }: any) => (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}><Text style={styles.tTitle}>{title}</Text><Text style={styles.tSub}>{sub}</Text></View>
      <Switch value={v} onValueChange={set} trackColor={{ true: colors.coral, false: '#E4DAD0' }} thumbColor="#fff" />
    </View>
  );

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>‹</Text></Pressable>
          <Text style={styles.headerTitle}>{t('mob.communityPrivacy', "Community Privacy")}</Text><View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={styles.banner}>
            <View style={{flexDirection:'row',gap:8,alignItems:'flex-start'}}><SettingsIcon name="community" size={18} color="#2D6A4F" /><Text style={[styles.bannerTxt,{flex:1}]}>Being part of the community keeps you motivated. Customise what parts of your journey others can see.</Text></View>
          </View>

          <Text style={styles.sectionTitle}>{t('mob.profileVisibility', "PROFILE VISIBILITY")}</Text>
          <View style={styles.card}>
            <Toggle v={feed} set={setFeed} title={t('mob.showFeed', "Show in community feed")} sub="Let others see your posts and activity" />
            <Toggle v={cycle} set={setCycle} title={t('mob.showCycleStatus', "Show cycle status")} sub="Display your phase to friends" />
            <Toggle v={streaks} set={setStreaks} title={t('mob.showStreaks', "Show activity streaks")} sub="Share your consistency badges" />
          </View>

          <Text style={styles.sectionTitle}>{t('mob.whoFindMe', "WHO CAN FIND ME")}</Text>
          <View style={styles.card}>
            {WHO.map((w, i) => (
              <Pressable key={w} onPress={() => setWho(w)} style={[styles.radioRow, i < WHO.length - 1 && styles.rowBorder]}>
                <Text style={styles.radioLabel}>{w}</Text>
                <View style={[styles.radio, who === w && styles.radioOn]}>{who === w ? <View style={styles.radioDot} /> : null}</View>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>{t('mob.blockedCaps', "BLOCKED USERS")}</Text>
          <View style={styles.card}>
            <View style={styles.radioRow}><Text style={styles.radioLabel}>{t('mob.blockedUsers', "Blocked users")}</Text><Text style={styles.count}>0 ›</Text></View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4 },
  back: { fontSize: 30, color: colors.ink, width: 24 },
  headerTitle: { fontFamily: font.semibold, fontSize: 17, color: colors.ink },
  banner: { backgroundColor: '#E8F7F0', borderRadius: radius.md, padding: 14 },
  bannerTxt: { fontFamily: font.regular, fontSize: 12.5, color: '#2D6A4F', lineHeight: 18 },
  sectionTitle: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 1, color: colors.muted, marginTop: 20, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: 16, ...shadow.card },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F4EBE3' },
  tTitle: { fontFamily: font.medium, fontSize: 14.5, color: colors.ink },
  tSub: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  radioRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 52 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F4EBE3' },
  radioLabel: { fontFamily: font.medium, fontSize: 14.5, color: colors.ink },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#D9CFC6', alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.coral },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.coral },
  count: { fontFamily: font.medium, fontSize: 14, color: colors.faint },
});
