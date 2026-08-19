/**
 * Today P2 (UST-02 v2, 19-ago) — el dashboard de Lucía con navegador temporal.
 *
 * ORDEN (L1): ‹ pill › → Daily Tip → Body Insight COMPLETO (texto + Nutri +
 * Mood/Energy/Flow dentro) → Nutri Basics → 3 recetas de la fase → comidas
 * del día → CTA único «📷 + Log Your Meal». Sin pestañas, sin checklist
 * (T1: las sugerencias viven ahora en Add Manually).
 *
 * EL TIEMPO (L3/L5): la escalera vive en lib/tiempo (pura, 12 tests).
 * Hoy = todo. Ayer = lectura + CTA (registra con fecha de ayer; la BD lo
 * blinda). Días previos = solo lectura. Mes/tri/año = agregados (L4, v1
 * con la propuesta aceptada — revisión de founders posterior).
 *
 * DESVIACIONES DECLARADAS (regla UST):
 *  · Mood/Energy/Flow siguen siendo INPUT en hoy (cyclear guarda) — el
 *    diseño los pinta como chips; perder el dedo sería regresión del CAS.
 *  · Los síntomas se conservan DENTRO de la tarjeta de insight (transición):
 *    son input de daily_logs y aún no tienen otra casa. Revisar con Lucía.
 *  · Recetas: foto placeholder hasta los assets de Lucía (L2, dependencia
 *    anotada) — puente de contenido: el motor ya aprobado (nutri_basics).
 *  · Tip/insight/recetas solo se enseñan HOY: son guía del día, no historia.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { colors, font, radius, shadow, screenGrad } from '../../theme';
import { useT, useTc, useI18n } from '../../i18n';
import { flags } from '../../lib/flags';
import { etiquetaMood, etiquetaEnergia, etiquetaFlujo, pinta, FLOWS } from '../../lib/etiquetas';
import { LoadingView } from '../../ui/LoadingView';
import { useSession } from '../../state/SessionProvider';
import { getProfile } from '../../lib/api';
import { pickVariantIndex } from '../../ui/NutriAvatar';
import { localDayISO } from '../../lib/localDay';
import {
  Periodo, periodoHoy, atras, adelante, rango, esEditable, etiqueta, sumaDias,
} from '../../lib/tiempo';
import {
  fetchDailyRecs, DailyRecs, orderedCategories, saveQuickLog, getQuickLog,
  getQuickLogDe, countMealsDe, fetchMealsDe, MealDelDia, fetchMiniaturas,
  fetchAgregado, Agregado, fetchTiersDe,
} from '../../lib/recs';

const TIP_CHARS = [
  require('../../../assets/nutrilog/tip-char-1.png'),
  require('../../../assets/nutrilog/tip-char-2.png'),
  require('../../../assets/nutrilog/tip-char-3.png'),
  require('../../../assets/nutrilog/tip-char-4.png'),
];
const INSIGHT_CHAR = require('../../../assets/nutrilog/insight-character.png');

const MealIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Circle cx={12} cy={12} r={9} stroke="#E4572E" strokeWidth={1.8} fill="none" />
    <Circle cx={12} cy={12} r={4.5} stroke="#E4572E" strokeWidth={1.6} fill="none" />
    <Path d="M2.5 7v5M4.6 7v5M3.55 12v5" stroke="#E4572E" strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);
const DropIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Path d="M12 3 C12 3 5.5 11 5.5 15.5 a6.5 6.5 0 0 0 13 0 C18.5 11 12 3 12 3 Z" stroke="#E4572E" strokeWidth={1.8} fill="none" strokeLinejoin="round" />
  </Svg>
);
const ClockIcon = () => (
  <Svg width={26} height={26} viewBox="0 0 28 28">
    <Rect width={28} height={28} rx={14} fill="#FF4343" />
    <Path d="M14 8.99962V14L17.3336 15.6668M22.334 14C22.334 18.6028 18.6027 22.334 14 22.334C9.39726 22.334 5.666 18.6028 5.666 14C5.666 9.39727 9.39726 5.66602 14 5.66602C18.6027 5.66602 22.334 9.39727 22.334 14Z" stroke="white" strokeWidth={2} strokeLinecap="round" fill="none" />
  </Svg>
);

const SYMPTOMS = ['Cramps', 'Bloating', 'Fatigue', 'Headache'];
const TIER_DOT: Record<string, string> = {
  Excellent: '#22C55E', Great: '#4CAF50', Good: '#F59E0B', Fair: '#9E9E9E',
};
// Placeholder de receta hasta los assets de Lucía (L2): emoji por categoría.
const CAT_EMOJI: Record<string, string> = {
  proteins: '🍗', greens: '🥬', vegetables: '🥦', fruits: '🫐', grains: '🌾',
  'seeds & nuts': '🌰', dairy: '🥛', fats: '🥑', hydration: '💧',
};
// Si el perfil no trae fecha de alta, el suelo es el arranque del piloto.
const ALTA_FALLBACK = '2026-06-01';

type Quick = { mood: number | null; energy: number | null; flow_level: number | null; pain_symptoms: string[] };

export default function NutriLogScreen() {
  const t = useT();
  const tc = useTc();
  const { lang } = useI18n();
  const nav = useNavigation<any>();
  const { userId } = useSession();

  const hoyISO = localDayISO();
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoHoy(localDayISO()));
  const [alta, setAlta] = useState<string>(ALTA_FALLBACK);
  const [charIdx, setCharIdx] = useState(0);
  const [cargando, setCargando] = useState(true);

  const [recs, setRecs] = useState<DailyRecs | null>(null);
  const [quick, setQuick] = useState<Quick>({ mood: null, energy: null, flow_level: null, pain_symptoms: [] });
  const [meals, setMeals] = useState<MealDelDia[]>([]);
  const [nMeals, setNMeals] = useState(0);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [tiers, setTiers] = useState<{ meal_id: string; tier: string }[]>([]);
  const [agregado, setAgregado] = useState<Agregado | null>(null);

  const esDia = periodo.tipo === 'dia';
  const esHoy = esDia && (periodo as any).fecha === hoyISO;
  const editable = esEditable(periodo, hoyISO);

  useEffect(() => {
    if (!userId) return;
    getProfile(userId).then((p: any) => {
      setCharIdx(pickVariantIndex(p?.nutri_avatar));
      const c = String(p?.created_at ?? '').slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(c)) setAlta(c);
    }).catch(() => {});
  }, [userId]);

  const carga = useCallback(async () => {
    if (!userId) { setCargando(false); return; }
    setCargando(true);
    try {
      if (esDia) {
        const fecha = (periodo as any).fecha as string;
        const [q, ms, n, tr, r] = await Promise.all([
          fecha === hoyISO ? getQuickLog(userId) : getQuickLogDe(userId, fecha),
          fetchMealsDe(userId, fecha),
          countMealsDe(userId, fecha),
          fetchTiersDe(fecha, sumaDias(fecha, 1)).catch(() => []),
          fecha === hoyISO ? fetchDailyRecs(lang) : Promise.resolve(null),
        ]);
        setQuick(q); setMeals(ms); setNMeals(n); setTiers(tr); setRecs(r);
        const ids = ms.map((m) => m.capture_id).filter(Boolean) as string[];
        setThumbs(ids.length ? await fetchMiniaturas(ids).catch(() => ({})) : {});
        setAgregado(null);
      } else {
        const { desde, hasta } = rango(periodo);
        setAgregado(await fetchAgregado(desde, hasta));
        setRecs(null); setMeals([]); setThumbs({}); setTiers([]);
      }
    } finally { setCargando(false); }
  }, [userId, periodo, lang, hoyISO, esDia]);
  useEffect(() => { carga(); }, [carga]);
  useEffect(() => { const u = nav.addListener('focus', carga); return u; }, [nav, carga]);

  // ── quick log: INPUT solo hoy (desviación declarada) ─────────────────────
  const guarda = async (patch: Partial<Quick>) => {
    setQuick((prev) => ({ ...prev, ...patch }));
    if (userId && esHoy) try { await saveQuickLog(userId, patch as any); } catch {}
  };
  const cycleMood = () => esHoy && guarda({ mood: quick.mood == null ? 1 : (quick.mood % 5) + 1 });
  const cycleEnergy = () => esHoy && guarda({ energy: quick.energy == null ? 1 : (quick.energy % 5) + 1 });
  const cycleFlow = () => esHoy && guarda({ flow_level: quick.flow_level == null ? 0 : (quick.flow_level + 1) % FLOWS.length });
  const toggleSymptom = (s: string) => {
    if (!esHoy) return;
    const list = quick.pain_symptoms.includes(s)
      ? quick.pain_symptoms.filter((x) => x !== s) : [...quick.pain_symptoms, s];
    guarda({ pain_symptoms: list });
  };

  // ── etiqueta del pill ─────────────────────────────────────────────────────
  const labelPill = () => {
    const e = etiqueta(periodo, hoyISO);
    const mes = (n?: number) => t('mob.tiempo.mes.' + n, String(n));
    switch (e.clase) {
      case 'hoy': return t('mob.today', 'Today');
      case 'ayer': return t('mob.tiempo.ayer', 'Yesterday');
      case 'dia': { const [, m, d] = (e.fecha as string).split('-'); return `${Number(d)} ${mes(Number(m))}`; }
      case 'mes': return `${mes(e.mes)} ${e.anio}`;
      case 'tri': return `${t('mob.tiempo.tri', 'Q')}${e.tri} ${e.anio}`;
      case 'anio': return String(e.anio);
    }
  };
  const puedeAtras = atras(periodo, hoyISO, alta) != null;
  const puedeAdelante = adelante(periodo, hoyISO) != null;

  if (cargando && esHoy && !recs) return <LoadingView />;

  const badge = recs
    ? `${t('phaseNames.' + (recs.phase || ''), recs.phase || '').toUpperCase()} · ${t('mob.dayWord', 'Day').toUpperCase()} ${recs.cycle_day}`
    : '';
  const tip = recs?.nutrition_tip;
  const ins = recs?.nutrition_insight;
  // L6 puente: las 3 recetas = lo mejor del motor aprobado (una por categoría)
  const recetas = orderedCategories(recs?.nutri_basics)
    .slice(0, 3).map(([cat, items]) => ({ cat, item: items[0] })).filter((r) => r.item);
  const tierDe = (capId: string | null) =>
    capId ? tiers.find((x) => x.meal_id === capId)?.tier ?? null : null;
  const horaDe = (iso: string) => {
    const f = new Date(iso);
    return `${String(f.getHours()).padStart(2, '0')}:${String(f.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <View style={styles.fill}>
      <LinearGradient colors={screenGrad.colors as any} locations={screenGrad.locations as any} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.fill} edges={['top']}>
        {/* ── navegador temporal (L3) + historial ── */}
        <View style={styles.header}>
          <Pressable disabled={!puedeAtras} hitSlop={8}
            onPress={() => { const p = atras(periodo, hoyISO, alta); if (p) setPeriodo(p); }}
            style={[styles.navBtn, !puedeAtras && styles.navBtnOff]}>
            <Text style={[styles.navTxt, !puedeAtras && styles.navTxtOff]}>‹</Text>
          </Pressable>
          <View style={styles.pill}><Text style={styles.pillTxt}>{labelPill()}</Text></View>
          <Pressable disabled={!puedeAdelante} hitSlop={8}
            onPress={() => { const p = adelante(periodo, hoyISO); if (p) setPeriodo(p); }}
            style={[styles.navBtn, !puedeAdelante && styles.navBtnOff]}>
            <Text style={[styles.navTxt, !puedeAdelante && styles.navTxtOff]}>›</Text>
          </Pressable>
          <Pressable onPress={() => nav.navigate('MealHistory')} hitSlop={8} style={styles.histBtn}>
            <ClockIcon />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
          {esDia ? (
            <>
              {/* ── Daily Tip (solo hoy: guía del día) ── */}
              {esHoy && (
                <View style={styles.card}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.kicker}>{badge}</Text>
                    <Text style={styles.headline}>{tip?.headline ?? t('mob.tipFallback', 'Eat with your phase today')}</Text>
                    <Text style={styles.body}>{tip?.body ?? ''}</Text>
                    {tip?.why ? <Text style={styles.why}>{tip.why}</Text> : null}
                  </View>
                  <Image source={TIP_CHARS[charIdx]} style={styles.character} resizeMode="contain" />
                </View>
              )}

              {/* ── Body Insight completo (indicadores DENTRO, L1) ── */}
              <View style={[styles.card, { flexDirection: 'column', alignItems: 'stretch' }]}>
                {esHoy ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.kicker}>{t('mob.bodyInsights', 'Body Insights').toUpperCase()}</Text>
                      <Text style={styles.headline}>{ins?.headline ?? ''}</Text>
                      <Text style={styles.body}>{ins?.body ?? ''}</Text>
                    </View>
                    <Image source={INSIGHT_CHAR} style={styles.character} resizeMode="contain" />
                  </View>
                ) : (
                  <Text style={styles.kicker}>{t('mob.bodyInsights', 'Body Insights').toUpperCase()} · {t('mob.hoy.soloLectura', 'Read-only day')}</Text>
                )}
                <View style={styles.indRow}>
                  <Pressable style={styles.ind} onPress={cycleMood} disabled={!esHoy}>
                    <Image source={require('../../../assets/nutrilog/mood.png')} style={styles.indIcon} />
                    <Text style={styles.indVal}>{pinta(etiquetaMood(quick.mood), t)}</Text>
                    <Text style={styles.indLbl}>{t('mob.mood', 'Mood')}</Text>
                  </Pressable>
                  <Pressable style={styles.ind} onPress={cycleEnergy} disabled={!esHoy}>
                    <Image source={require('../../../assets/nutrilog/energy.png')} style={styles.indIcon} />
                    <Text style={styles.indVal}>{pinta(etiquetaEnergia(quick.energy), t)}</Text>
                    <Text style={styles.indLbl}>{t('mob.energy', 'Energy')}</Text>
                  </Pressable>
                  <Pressable style={styles.ind} onPress={cycleFlow} disabled={!esHoy}>
                    <Image source={require('../../../assets/nutrilog/flow.png')} style={styles.indIcon} />
                    <Text style={styles.indVal}>{pinta(etiquetaFlujo(quick.flow_level), t)}</Text>
                    <Text style={styles.indLbl}>{t('mob.flow', 'Flow')}</Text>
                  </Pressable>
                </View>
                {esHoy && (
                  <View style={styles.symRow}>
                    {SYMPTOMS.map((s) => {
                      const on = quick.pain_symptoms.includes(s);
                      return (
                        <Pressable key={s} onPress={() => toggleSymptom(s)} style={[styles.sym, on && styles.symOn]}>
                          <Text style={[styles.symTxt, on && styles.symTxtOn]}>{tc(s)}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* ── Nutri Basics ── */}
              <View style={styles.statRow}>
                <View style={styles.stat}>
                  <View style={styles.statHead}><MealIcon /><Text style={styles.statTag}>FUEL</Text></View>
                  <Text style={styles.statVal}>{nMeals} / 3</Text>
                  <Text style={styles.statLbl}>{t('mob.mealsLogged', 'Meals Logged')}</Text>
                </View>
                <View style={styles.stat}>
                  <View style={styles.statHead}><DropIcon /><Text style={styles.statTag}>VITALITY</Text></View>
                  <Text style={styles.statVal}>1.8 L</Text>
                  <Text style={styles.statLbl}>{t('mob.hydrationRec', 'Hydration Rec')}</Text>
                </View>
              </View>

              {/* ── 3 recetas de la fase (solo hoy; puente L6) ── */}
              {esHoy && recetas.map(({ cat, item }) => (
                <View key={item.id} style={styles.receta}>
                  <View style={styles.recetaFoto}>
                    <Text style={{ fontSize: 24 }}>{CAT_EMOJI[cat.toLowerCase()] ?? '🍽'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.recetaKicker}>{tc(cat).toUpperCase()}</Text>
                      <View style={styles.syncChip}>
                        <Text style={styles.syncChipTxt}>● {t('phaseNames.' + (recs?.phase || ''), recs?.phase || '').toUpperCase()} SYNC</Text>
                      </View>
                    </View>
                    <Text style={styles.recetaNombre}>{tc(item.name)}</Text>
                  </View>
                </View>
              ))}

              {/* ── comidas del día ── */}
              <Text style={styles.section}>{esHoy ? t('mob.hoy.comidas', "Today's Meals") : t('mob.hoy.comidasDe', 'Meals that day')}</Text>
              <View style={styles.mealsCard}>
                {meals.length === 0 && (
                  <Text style={styles.vacio}>{t('mob.hoy.sinComidas', 'Nothing logged this day')}</Text>
                )}
                {meals.map((m, i) => {
                  const tr = tierDe(m.capture_id);
                  const u = m.capture_id ? thumbs[m.capture_id] : undefined;
                  return (
                    <View key={m.id} style={[styles.mealRow, i > 0 && styles.mealRowBorde]}>
                      {u ? <Image source={{ uri: u }} style={styles.mealThumb} />
                         : <View style={styles.mealThumbPh}><Text style={{ fontSize: 15 }}>🍽</Text></View>}
                      <View style={{ flex: 1, paddingRight: 6 }}>
                        <Text style={styles.mealTxt} numberOfLines={1}>{m.description}</Text>
                        <Text style={styles.mealSub}>
                          {m.meal_type ? t('mob.foto.tipo.' + m.meal_type, m.meal_type) + ' · ' : ''}{horaDe(m.created_at)}
                        </Text>
                      </View>
                      {tr && (
                        <View style={styles.tierPill}>
                          <View style={[styles.tierDot, { backgroundColor: TIER_DOT[tr] ?? '#9E9E9E' }]} />
                          <Text style={styles.tierTxt}>{t('mob.foto.tier.' + tr.toLowerCase(), tr)}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              {!esHoy && editable && (
                <View style={styles.ayerAviso}>
                  <Text style={styles.ayerAvisoTxt}>🕘 {t('mob.hoy.enAyer', 'Logging for yesterday')}</Text>
                </View>
              )}

              {/* ── CTA único (L1): cámara DENTRO del botón largo ── */}
              {editable && (
                <Pressable style={styles.cta}
                  onPress={() => {
                    const params = esHoy ? undefined : { fecha: (periodo as any).fecha };
                    flags.mealPhoto ? nav.navigate('MealPhoto', params) : nav.navigate('MealLog', params);
                  }}>
                  <Text style={styles.ctaTxt}>📷  + {t('mob.logTodaysMeal', "Log Today's Meal")}</Text>
                </Pressable>
              )}
            </>
          ) : (
            /* ── vista agregada (L4, propuesta aceptada — revisión posterior) ── */
            <>
              {!agregado || agregado.dias_con_datos === 0 ? (
                <View style={styles.card}><Text style={styles.vacio}>{t('mob.hoy.agregado.vacio', 'No data for this period yet')}</Text></View>
              ) : (
                <>
                  <View style={styles.statRow}>
                    <View style={styles.stat}>
                      <Text style={styles.statTag}>{t('mob.hoy.agregado.cas', 'AVG CAS')}</Text>
                      <Text style={styles.statVal}>{agregado.cas_medio}</Text>
                      <Text style={styles.statLbl}>{agregado.dias_con_datos} {t('mob.hoy.agregado.dias', 'days with data')}</Text>
                    </View>
                    <View style={styles.stat}>
                      <Text style={styles.statTag}>{t('mob.hoy.agregado.comidas', 'MEALS LOGGED')}</Text>
                      <Text style={styles.statVal}>{agregado.comidas}</Text>
                      <Text style={styles.statLbl}>{t('mob.mealsLogged', 'Meals Logged')}</Text>
                    </View>
                  </View>
                  <View style={styles.statRow}>
                    <View style={styles.stat}>
                      <Text style={styles.statTag}>{t('mob.hoy.agregado.mood', 'AVG MOOD')}</Text>
                      <Text style={styles.statVal}>{agregado.mood_medio || '—'}</Text>
                      <Text style={styles.statLbl}>{t('mob.mood', 'Mood')} 1–5</Text>
                    </View>
                    <View style={styles.stat}>
                      <Text style={styles.statTag}>{t('mob.hoy.agregado.energia', 'AVG ENERGY')}</Text>
                      <Text style={styles.statVal}>{agregado.energia_media || '—'}</Text>
                      <Text style={styles.statLbl}>{t('mob.energy', 'Energy')} 1–5</Text>
                    </View>
                  </View>
                  <Text style={styles.section}>{t('mob.hoy.agregado.mezcla', 'Alignment mix')}</Text>
                  <View style={styles.mealsCard}>
                    {(['Excellent', 'Great', 'Good', 'Fair'] as const).map((k, i) => {
                      const n = (agregado.tiers as any)?.[k.toLowerCase()] ?? 0;
                      return (
                        <View key={k} style={[styles.mealRow, i > 0 && styles.mealRowBorde]}>
                          <View style={[styles.tierDot, { backgroundColor: TIER_DOT[k] }]} />
                          <Text style={[styles.mealTxt, { flex: 1, marginLeft: 8 }]}>{t('mob.foto.tier.' + k.toLowerCase(), k)}</Text>
                          <Text style={styles.mealSub}>{n}</Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 4, paddingHorizontal: 18, gap: 8 },
  navBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  navBtnOff: { backgroundColor: 'rgba(255,255,255,0.45)' },
  navTxt: { fontSize: 18, color: colors.ink, marginTop: -2 },
  navTxtOff: { color: colors.faint },
  pill: { flex: 1, height: 36, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' },
  pillTxt: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  histBtn: { marginLeft: 2 },

  card: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, ...shadow.card, alignItems: 'center', marginTop: 12 },
  kicker: { fontFamily: font.semibold, fontSize: 10.5, letterSpacing: 1, color: colors.coral },
  headline: { fontFamily: font.semibold, fontSize: 17, color: colors.ink, marginTop: 6, lineHeight: 22 },
  body: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 6, lineHeight: 18 },
  why: { fontFamily: font.regular, fontSize: 11.5, color: '#3E7357', marginTop: 8, lineHeight: 16 },
  character: { width: 74, height: 92 },

  indRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  ind: { flex: 1, borderWidth: 1, borderColor: '#F3E6E1', borderRadius: 14, paddingVertical: 10, alignItems: 'center' },
  indIcon: { width: 22, height: 22, marginBottom: 4 },
  indVal: { fontFamily: font.semibold, fontSize: 13, color: colors.ink },
  indLbl: { fontFamily: font.regular, fontSize: 10.5, color: colors.muted, marginTop: 1 },
  symRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  sym: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: '#EADFD5' },
  symOn: { backgroundColor: colors.coral, borderColor: colors.coral },
  symTxt: { fontFamily: font.medium, fontSize: 12, color: colors.muted },
  symTxtOn: { color: '#fff' },

  statRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  stat: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, ...shadow.card },
  statHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statTag: { fontFamily: font.semibold, fontSize: 9.5, letterSpacing: 1.2, color: colors.coral },
  statVal: { fontFamily: font.bold, fontSize: 22, color: colors.ink, marginTop: 4 },
  statLbl: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 2 },

  receta: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: radius.lg, padding: 12, marginTop: 10, ...shadow.card },
  recetaFoto: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#FFF1E6', alignItems: 'center', justifyContent: 'center' },
  recetaKicker: { fontFamily: font.semibold, fontSize: 9.5, letterSpacing: 0.6, color: colors.coral },
  recetaNombre: { fontFamily: font.semibold, fontSize: 14.5, color: colors.ink, marginTop: 3 },
  syncChip: { backgroundColor: '#FBE3F0', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  syncChipTxt: { fontFamily: font.semibold, fontSize: 8, color: '#993556' },

  section: { fontFamily: font.semibold, fontSize: 15, color: colors.ink, marginTop: 18, marginBottom: 8 },
  mealsCard: { backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: 14, ...shadow.card },
  mealRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  mealRowBorde: { borderTopWidth: 1, borderTopColor: '#F7F0E9' },
  mealThumb: { width: 36, height: 36, borderRadius: 10, marginRight: 10 },
  mealThumbPh: { width: 36, height: 36, borderRadius: 10, marginRight: 10, backgroundColor: '#FFF1E6', alignItems: 'center', justifyContent: 'center' },
  mealTxt: { fontFamily: font.medium, fontSize: 13.5, color: colors.ink },
  mealSub: { fontFamily: font.regular, fontSize: 11.5, color: colors.muted, marginTop: 1 },
  tierPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F5F0F2', borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  tierDot: { width: 8, height: 8, borderRadius: 4 },
  tierTxt: { fontFamily: font.semibold, fontSize: 10.5, color: colors.ink },
  vacio: { fontFamily: font.regular, fontSize: 13, color: colors.muted, paddingVertical: 14, textAlign: 'center' },

  ayerAviso: { backgroundColor: '#FFF3E0', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, marginTop: 14, borderWidth: 1, borderColor: '#F5DFC0' },
  ayerAvisoTxt: { fontFamily: font.semibold, fontSize: 12.5, color: '#8a5a00', textAlign: 'center' },

  cta: { marginTop: 14, backgroundColor: colors.coral, borderRadius: radius.pill, height: 54, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  ctaTxt: { fontFamily: font.semibold, fontSize: 15.5, color: '#fff' },
});
