// NutriSync · Ajustes → Notificaciones (N2, 0.21)
// De maqueta a verdad: interruptor maestro (permiso patrón L8: se pide AQUÍ,
// al activarlo), 4 grupos espejo de notification_prefs (diario · fases ·
// rachas · reenganche) y horarios de mañana/noche. Cada toque persiste solo
// su columna (upsert parcial: jamás pisa lo que posee otro flujo).
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, shadow } from '../../theme';
import { useT, useI18n } from '../../i18n';
import { useSession } from '../../state/SessionProvider';
import { supabase } from '../../lib/supabase';
import { enablePush, disablePush } from '../../lib/push';

type Cols = { diario: boolean; fases: boolean; rachas: boolean; reenganche: boolean };
const MANANA = ['07:00', '08:00', '09:00', '10:00'];
const NOCHE = ['19:00', '20:00', '21:00', '22:00'];

export default function NotificationsScreen({ navigation }: any) {
  const t = useT();
  const { lang } = useI18n();
  const { session } = useSession();
  const uid = session?.user?.id;
  const [cargando, setCargando] = useState(true);
  const [push, setPush] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<'denied' | 'old' | null>(null);
  const [sw, setSw] = useState<Cols>({ diario: true, fases: true, rachas: true, reenganche: true });
  const [hManana, setHManana] = useState('09:00');
  const [hNoche, setHNoche] = useState('21:00');

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const { data } = await supabase.from('notification_prefs').select('*').eq('user_id', uid).maybeSingle();
      if (data) {
        setPush(!!data.push_token);
        setSw({ diario: !!data.diario, fases: !!data.fases, rachas: !!data.rachas, reenganche: !!data.reenganche });
        if (data.hora_manana) setHManana(String(data.hora_manana).slice(0, 5));
        if (data.hora_noche) setHNoche(String(data.hora_noche).slice(0, 5));
      }
      setCargando(false);
    })();
  }, [uid]);

  const guarda = async (patch: Record<string, unknown>) => {
    if (!uid) return;
    await supabase.from('notification_prefs').upsert({ user_id: uid, ...patch }, { onConflict: 'user_id' });
  };

  const togglePush = async (v: boolean) => {
    if (!uid || ocupado) return;
    setOcupado(true); setAviso(null);
    if (v) {
      const st = await enablePush(uid, lang);
      if (st === 'ok') setPush(true);
      else { setPush(false); setAviso(st === 'denied' ? 'denied' : 'old'); }
    } else {
      await disablePush(uid); setPush(false);
    }
    setOcupado(false);
  };

  const toggleCol = (k: keyof Cols) => (v: boolean) => {
    setSw((s) => ({ ...s, [k]: v }));           // optimista; el upsert lo consolida
    guarda({ [k]: v });
  };

  const Fila = ({ titulo, sub, val, onVal, ultima }: { titulo: string; sub: string; val: boolean; onVal: (v: boolean) => void; ultima?: boolean }) => (
    <View style={[styles.row, !ultima && styles.rowBorder]}>
      <View style={{ flex: 1 }}><Text style={styles.title}>{titulo}</Text><Text style={styles.sub}>{sub}</Text></View>
      <Switch value={val} onValueChange={onVal} trackColor={{ true: colors.coral, false: '#E4DAD0' }} thumbColor="#fff" />
    </View>
  );

  const Horas = ({ opciones, val, onVal }: { opciones: string[]; val: string; onVal: (h: string) => void }) => (
    <View style={styles.chipRow}>
      {opciones.map((h) => (
        <Pressable key={h} onPress={() => onVal(h)} style={[styles.chip, val === h && styles.chipOn]}>
          <Text style={[styles.chipTxt, val === h && styles.chipTxtOn]}>{h}</Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>‹</Text></Pressable>
          <Text style={styles.headerTitle}>{t('mob.notifReminders', 'Notifications & Reminders')}</Text><View style={{ width: 24 }} />
        </View>
        {cargando ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.coral} /> : (
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              <Fila titulo={t('mob.ntf.push', 'Push notifications')} sub={t('mob.ntf.pushSub', 'Master switch — asks permission when you turn it on')}
                val={push} onVal={togglePush} ultima />
            </View>
            {aviso ? <Text style={styles.aviso}>{aviso === 'denied' ? t('mob.ntfDenied', 'Permission denied — enable notifications for NutriSync in system Settings.') : t('mob.ntfOld', "Push isn't available here yet — it arrives with app version 0.21.")}</Text> : null}

            <Text style={styles.sectionTitle}>{t('mob.ntfSec.daily', 'DAILY REMINDERS')}</Text>
            <View style={styles.card}>
              <Fila titulo={t('mob.ntf.daily', 'Daily log reminder')} sub={t('mob.ntf.dailySub', 'A gentle nudge to log your day')} val={sw.diario} onVal={toggleCol('diario')} ultima />
            </View>

            <Text style={styles.sectionTitle}>{t('mob.ntfSec.cycle', 'CYCLE')}</Text>
            <View style={styles.card}>
              <Fila titulo={t('mob.ntf.phase', 'Phase-change nudges')} sub={t('mob.ntf.phaseSub', 'When you enter a new phase')} val={sw.fases} onVal={toggleCol('fases')} ultima />
            </View>

            <Text style={styles.sectionTitle}>{t('mob.ntfSec.streaks', 'STREAKS')}</Text>
            <View style={styles.card}>
              <Fila titulo={t('mob.ntf.streaks', 'Streak celebrations')} sub={t('mob.ntf.streaksSub', 'When you hit a milestone')} val={sw.rachas} onVal={toggleCol('rachas')} ultima />
            </View>

            <Text style={styles.sectionTitle}>{t('mob.ntfSec.reengage', 'RE-ENGAGE')}</Text>
            <View style={styles.card}>
              <Fila titulo={t('mob.ntf.reengage', 'Gentle comebacks')} sub={t('mob.ntf.reengageSub', "If you've been away a few days")} val={sw.reenganche} onVal={toggleCol('reenganche')} ultima />
            </View>

            <Text style={styles.sectionTitle}>{t('mob.ntfSec.times', 'TIMES')}</Text>
            <View style={[styles.card, { paddingVertical: 12 }]}>
              <Text style={styles.title}>{t('mob.ntf.morning', 'Morning reminder time')}</Text>
              <Horas opciones={MANANA} val={hManana} onVal={(h) => { setHManana(h); guarda({ hora_manana: h }); }} />
              <Text style={[styles.title, { marginTop: 12 }]}>{t('mob.ntf.evening', 'Evening reminder time')}</Text>
              <Horas opciones={NOCHE} val={hNoche} onVal={(h) => { setHNoche(h); guarda({ hora_noche: h }); }} />
            </View>

            <Text style={styles.note}>{t('mob.ntfPriv', 'Your lock screen never shows health details — the full message opens inside the app.')}</Text>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4 },
  back: { fontSize: 30, color: colors.ink, width: 24 },
  headerTitle: { fontFamily: font.semibold, fontSize: 16, color: colors.ink },
  sectionTitle: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 1, color: colors.muted, marginTop: 18, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: 16, ...shadow.card },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F4EBE3' },
  title: { fontFamily: font.medium, fontSize: 14.5, color: colors.ink },
  sub: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  aviso: { fontFamily: font.regular, fontSize: 12, color: '#C73A20', marginTop: 10, marginHorizontal: 4 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chip: { borderWidth: 1, borderColor: '#E4DAD0', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 13 },
  chipOn: { backgroundColor: colors.coral, borderColor: colors.coral },
  chipTxt: { fontFamily: font.medium, fontSize: 12.5, color: colors.ink },
  chipTxtOn: { color: '#fff' },
  note: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 18, textAlign: 'center' },
});
