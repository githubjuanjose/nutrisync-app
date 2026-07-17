import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop, Ellipse, Path } from 'react-native-svg';
import { colors, font, radius } from '../../theme';
import { useT } from '../../i18n';
import { useSession } from '../../state/SessionProvider';
import { supabase } from '../../lib/supabase';
import { NUTRI_VARIANTS } from '../../ui/NutriAvatar';

const VARIANTS = [
  { key: 'coral', a: '#FFC27A', b: '#FF5509' },
  { key: 'red', a: '#FF7A4D', b: '#E23A0E' },
  { key: 'pink', a: '#FF8FB0', b: '#E33B7A' },
  { key: 'blue', a: '#FFA84D', b: '#F5641E', halo: '#8CA3FE' },
];

function Avatar({ a, b, halo, size = 120 }: { a: string; b: string; halo?: string; size?: number }) {
  const id = a + b;
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <RadialGradient id={id} cx="38%" cy="33%" r="72%">
          <Stop offset="0.22" stopColor={a} /><Stop offset="0.8" stopColor={b} />
        </RadialGradient>
        {halo && (
          <RadialGradient id={id + 'h'} cx="50%" cy="50%" r="50%">
            <Stop offset="0.5" stopColor={halo} stopOpacity="0.5" /><Stop offset="1" stopColor={halo} stopOpacity="0" />
          </RadialGradient>
        )}
      </Defs>
      {halo && <Circle cx={100} cy={100} r={96} fill={`url(#${id}h)`} />}
      <Circle cx={100} cy={100} r={64} fill={`url(#${id})`} />
      <Ellipse cx={90} cy={92} rx={4.2} ry={6} fill="#2A1206" />
      <Ellipse cx={110} cy={92} rx={4.2} ry={6} fill="#2A1206" />
      <Path d="M92 106 Q100 113 108 106" stroke="#2A1206" strokeWidth={2.4} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

export default function NutriAvatarScreen({ navigation }: any) {
  const t = useT();
  const { userId } = useSession();
  const [sel, setSel] = useState('coral');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!userId) return;
    setBusy(true);
    try { await supabase.from('users').update({ nutri_avatar: sel }).eq('id', userId); navigation.goBack(); }
    catch { navigation.goBack(); }
  };

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>‹</Text></Pressable>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ paddingHorizontal: 26, flex: 1 }}>
          <Text style={styles.title}>{t('mob.chooseNutri', "Choose Your Nutri")}</Text>
          <Text style={styles.sub}>{t('mob.selectNutri', "Select your Nutri profile")}</Text>
          <View style={styles.grid}>
            {VARIANTS.map((v) => (
              <Pressable key={v.key} onPress={() => setSel(v.key)} style={[styles.cell, sel === v.key && styles.cellOn]}>
                <Avatar a={v.a} b={v.b} halo={(v as any).halo} />
              </Pressable>
            ))}
          </View>
          <View style={{ flex: 1 }} />
          <Pressable onPress={save} disabled={busy} style={styles.save}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveTxt}>{t('mob.save', "Save")}</Text>}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  headerBar: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 4 },
  back: { fontSize: 30, color: colors.ink, width: 24 },
  title: { fontFamily: font.bold, fontSize: 24, color: colors.ink, marginTop: 6 },
  sub: { fontFamily: font.regular, fontSize: 14, color: colors.muted, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 30, gap: 16 },
  cell: { width: '46%', aspectRatio: 1, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  cellOn: { borderColor: colors.coral, backgroundColor: '#FFF3EE' },
  save: { backgroundColor: '#F6A99A', height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  saveTxt: { fontFamily: font.semibold, fontSize: 16, color: '#fff' },
});
