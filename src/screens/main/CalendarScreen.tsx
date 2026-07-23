import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect, Circle as SvgCircle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, shadow } from '../../theme';
import { useT } from '../../i18n';
import { LoadingView } from '../../ui/LoadingView';
import { useSession } from '../../state/SessionProvider';
import { getCurrentCycle, getProfile, CycleRow } from '../../lib/api';
import { cycleDay, phaseForDay, displayPhase } from '../../lib/cas';
import { fetchSexDayTypes, fetchScoreHistory, splitCycles, ScoreRow } from '../../lib/progress';
import { NutriAvatar } from '../../ui/NutriAvatar';

/**
 * R3 Batch E · Calendar rebuild (R3-18…28 + sex stars from R3-17):
 *  18 — header: back arrow · "Calendar" · pencil → Cycle Health (edit period dates)
 *  19 — day knob sits ON the progress bar track
 *  20 — "→ Phase begins in X days" arrow glyph
 *  21 — Avg Period shown as a range ("6–7 days")
 *  22 — week starts SUNDAY (founder decision D2): S M T W T F S
 *  23 — date numbers inside solid phase-coloured circles (future = outline)
 *  24 — phase guidance card carries the specific date
 *  25 — Year = its own "Cycle History" layout: header + big year + Nutri,
 *       orange stats bar (real values), searchable phase history (paginated,
 *       lazy — bounded client derivation now; moves to a SQL RPC with ILIKE +
 *       range pagination when history outgrows one query)
 *  26 — mini-months use numbered, phase-coloured day cells
 *  27 — current month highlighted in Year view
 *  28 — Year view drops the Month hero/toggle/legend
 *  ★  — sex days: protected = filled ★, unprotected = outline ☆ (R3-17)
 */

type P4 = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';
const PAL: Record<P4, string> = { menstrual: '#E8837B', follicular: '#A8C3A0', ovulatory: '#E9C46A', luteal: '#B9A7D9' };
const iso = (d: Date) => d.toISOString().slice(0, 10);
const PAGE = 12;

export default function CalendarScreen({ navigation }: any) {
  const t = useT();
  const { userId } = useSession();
  const [cycle, setCycle] = useState<CycleRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'month' | 'year'>('month');
  const [filter, setFilter] = useState<P4 | null>(null);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [sexDays, setSexDays] = useState<Map<string, 'protected' | 'unprotected'>>(new Map());
  const [nutri, setNutri] = useState<any>(null);
  const [history, setHistory] = useState<ScoreRow[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      if (!userId) { setLoading(false); return; }
      const c = await getCurrentCycle(userId);
      setCycle(c); setLoading(false);
      const from = new Date(); from.setMonth(0, 1);
      fetchSexDayTypes(userId, iso(from)).then(setSexDays).catch(() => {});
      getProfile(userId).then((p: any) => setNutri(p?.nutri_avatar ?? null)).catch(() => {});
      fetchScoreHistory(userId, 365).then(setHistory).catch(() => {});
    })();
  }, [userId]);

  const today = new Date();
  const len = cycle?.cycle_length ?? 28;
  const dur = cycle?.period_duration ?? 5;
  const lps = cycle?.last_period_start_date ?? null;
  const dayOf = (d: Date) => (lps ? cycleDay(lps, d, len) : null);
  const phaseOf = (d: Date): P4 | null => { const n = dayOf(d); return n ? displayPhase(phaseForDay(n, len, dur)) : null; };
  const todayDay = dayOf(today) ?? 1;
  const todayPhase = phaseOf(today) ?? 'follicular';

  const ovStart = len - 14, ovEnd = ovStart + 2;
  const spans: [P4, number][] = [
    ['menstrual', dur], ['follicular', Math.max(1, ovStart - dur - 1)],
    ['ovulatory', 3], ['luteal', Math.max(1, len - ovEnd)],
  ];
  const nextInfo = useMemo(() => {
    if (!lps) return null;
    for (let i = 1; i <= len; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i);
      const p = phaseOf(d);
      if (p && p !== todayPhase) {
        const name = t('phaseNames.' + p, p[0].toUpperCase() + p.slice(1));
        return i === 1 ? `${name} ${t('mob.beginsTomorrow', 'begins tomorrow')}` : `${name} ${t('mob.beginsIn', 'begins in')} ${i} ${t('mob.days', 'days')}`;
      }
    }
    return null;
  }, [lps, todayPhase, len]);

  // R3-25: real cycle-history stats from logged data (honest "—" before enough history)
  const cycles = useMemo(() => splitCycles(history), [history]);
  const cyclesTracked = cycles.length;
  const lengths = cycles.slice(0, -1).map((c) => c.length).filter((n) => n >= 15);
  const variance = lengths.length >= 2
    ? Math.round((Math.max(...lengths) - Math.min(...lengths)) / 2)
    : null;

  // R3-25/D3: searchable phase history — consecutive same-phase runs, newest first,
  // filtered in real time, PAGE-sized lazy loading (bounded work per render).
  const episodes = useMemo(() => {
    const eps: { phase: string; from: string; to: string; days: number }[] = [];
    for (const row of history) {
      const p = (row as any).phase || '';
      const last = eps[eps.length - 1];
      if (last && last.phase === p) { last.to = row.date; last.days++; }
      else eps.push({ phase: p, from: row.date, to: row.date, days: 1 });
    }
    return eps.reverse();
  }, [history]);
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return episodes;
    return episodes.filter((e) => {
      const raw = e.phase.toLowerCase();
      const loc = t('phaseNames.' + displayPhase(e.phase as any), e.phase).toLowerCase();
      return raw.includes(q) || loc.includes(q);
    });
  }, [episodes, q, t]);
  const visible = filtered.slice(0, page * PAGE);

  if (loading) return <LoadingView />;

  const monthCells = (y: number, m: number) => {
    const first = new Date(y, m, 1);
    const off = first.getDay();                                // R3-22: SUNDAY-first
    const dim = new Date(y, m + 1, 0).getDate();
    const rows = Math.ceil((off + dim) / 7);
    return Array.from({ length: rows * 7 }, (_, i) => {
      const n = i - off + 1;
      return n >= 1 && n <= dim ? new Date(y, m, n, 12) : null;
    });
  };
  const monthName = (m: number) => new Date(2026, m, 1).toLocaleDateString(undefined, { month: 'long' });
  const dows = [t('dowsS.0', 'S'), t('dowsS.1', 'M'), t('dowsS.2', 'T'), t('dowsS.3', 'W'), t('dowsS.4', 'T'), t('dowsS.5', 'F'), t('dowsS.6', 'S')];

  const Star = ({ d, mini }: { d: Date; mini?: boolean }) => {
    const kind = sexDays.get(iso(d));
    if (!kind) return null;
    return <Text style={mini ? styles.miniStar : styles.star}>{kind === 'protected' ? '★' : '☆'}</Text>;
  };

  // R4-F14 + R5-F17: neutral #FFFAF9 date circles with dark numbers (month AND year);
  // R5-f18: cycle-day badges use per-phase RADIAL gradients from the round-5 spec.
  const BADGE_GRAD: Record<P4, [string, string]> = {   // [inside, outside]
    menstrual: ['#C9354E', '#FF7A59'],
    follicular: ['#9BC19E', '#89AC8C'],
    ovulatory: ['#FFAB40', '#E9870A'],
    luteal: ['#AD70B1', '#E0749A'],
  };
  const PhaseBadge = ({ p, n }: { p: P4; n: number }) => (
    <View style={styles.cdBadge}>
      <Svg width={15} height={15} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={`pb${p}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={BADGE_GRAD[p][0]} />
            <Stop offset="100%" stopColor={BADGE_GRAD[p][1]} />
          </RadialGradient>
        </Defs>
        <SvgCircle cx={7.5} cy={7.5} r={7.5} fill={`url(#pb${p})`} />
      </Svg>
      <Text style={styles.cdTxt}>{n}</Text>
    </View>
  );
  const DayCell = ({ d, mini }: { d: Date | null; mini?: boolean }) => {
    if (!d) return <View style={[styles.cell, mini && styles.cellMini]} />;
    const p = phaseOf(d);
    const isToday = d.toDateString() === today.toDateString();
    const future = d > today;
    const faded = filter && p !== filter;
    const col = p ? PAL[p] : '#E7DCD3';
    if (mini) {
      // R5-F17: year view goes neutral too — cream circles, dark numbers
      return (
        <View style={[styles.cellMini, { opacity: faded ? 0.15 : 1 }]}>
          <View style={[styles.miniC, styles.miniNeutral, future && { opacity: 0.7 }]}>
            <Text style={styles.miniN}>{d.getDate()}</Text>
          </View>
          <Star d={d} mini />
        </View>
      );
    }
    const cd = dayOf(d);
    return (
      <View style={[styles.cell, { opacity: faded ? 0.25 : 1 }]}>
        <View>
          {isToday ? (
            <LinearGradient colors={['#FF7600', '#FD400C']} style={styles.dayC}>
              <Text style={styles.dayTxtOn}>{d.getDate()}</Text>
            </LinearGradient>
          ) : (
            <View style={[styles.dayC, styles.dayNeutral, future && { opacity: 0.75 }]}>
              <Text style={styles.dayTxtNeutral}>{d.getDate()}</Text>
            </View>
          )}
          {/* R5-f18: cycle-day badge with the per-phase radial gradient */}
          {cd != null && p ? <PhaseBadge p={p} n={cd} /> : null}
        </View>
        <View style={styles.starRow}><Star d={d} /></View>
      </View>
    );
  };

  const phaseLoc = (p: string) => t('phaseNames.' + displayPhase(p as any), p ? p[0].toUpperCase() + p.slice(1) : '');
  const fmtShort = (isoD: string) => new Date(isoD + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        {/* R3-18: page header — back · title · pencil (edit period dates) */}
        <View style={styles.pageHead}>
          <Pressable hitSlop={10} onPress={() => navigation.navigate('Cycle')}><Text style={styles.back}>‹</Text></Pressable>
          <Text style={styles.pageTitle}>{view === 'month' ? t('mob.calendar', 'Calendar') : t('mob.cycleHistory', 'Cycle History')}</Text>
          {view === 'month' ? (
            <Pressable hitSlop={10} onPress={() => navigation.navigate('CycleHealth')}><Text style={styles.pencil}>✎</Text></Pressable>
          ) : (
            <NutriAvatar variant={nutri} size={34} />
          )}
        </View>

        <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 6, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
          {view === 'month' ? (
            <>
              <View style={[styles.hero, { overflow: 'hidden' }]}>
                {/* R4-F13: wireframe radial — FF7000 core (to 23%) -> FF5509 edge */}
                <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                  <Defs>
                    <RadialGradient id="calHero" cx="50%" cy="38%" r="85%">
                      <Stop offset="0%" stopColor="#FF7000" />
                      <Stop offset="23%" stopColor="#FF7000" />
                      <Stop offset="100%" stopColor="#FF5509" />
                    </RadialGradient>
                  </Defs>
                  <Rect x="0" y="0" width="100%" height="100%" fill="url(#calHero)" />
                </Svg>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View>
                    <Text style={styles.heroSmall}>{t('mob.today', 'Today')} · {today.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}</Text>
                    <Text style={styles.heroTitle}>{t('ui.cycleDay', 'Cycle Day')} {todayDay}</Text>
                  </View>
                  <View style={styles.phasePill}><Text style={styles.phasePillTxt}>{t('phaseNames.' + todayPhase, todayPhase)}</Text></View>
                </View>
                <View style={styles.segBar}>
                  {(() => { let acc = 0; return spans.map(([p, n], i) => {
                    const w = (n / len) * 100; const has = todayDay > acc && todayDay <= acc + n;
                    const frac = has ? (todayDay - acc) / n : 0; acc += n;
                    return (
                      <View key={i} style={[styles.seg, { width: `${w}%`, backgroundColor: PAL[p] + (p === todayPhase ? '' : '88') }]}>
                        {has ? (
                          /* R3-19: knob vertically centred ON the track */
                          <View style={[styles.segKnob, { left: `${Math.min(88, Math.max(0, frac * 100 - 8))}%` }]}>
                            <Text style={styles.segKnobTxt}>{todayDay}</Text>
                          </View>
                        ) : null}
                      </View>
                    );
                  }); })()}
                </View>
                {nextInfo ? <Text style={styles.heroNote}>→ {nextInfo}</Text> : null}
                <View style={styles.heroStats}>
                  <View style={styles.heroStat}><Text style={styles.heroStatLbl}>{t('mob.avgCycle', 'Avg cycle')}</Text><Text style={styles.heroStatVal}>{len} {t('mob.days', 'days')}</Text></View>
                  {/* R3-21: period communicated as a range */}
                  <View style={styles.heroStat}><Text style={styles.heroStatLbl}>{t('mob.avgPeriod', 'Avg period')}</Text><Text style={styles.heroStatVal}>{dur}–{dur + 1} {t('mob.days', 'days')}</Text></View>
                </View>
              </View>

              <View style={styles.toggleRow}>
                {(['month', 'year'] as const).map((v) => (
                  <Pressable key={v} onPress={() => setView(v)} style={[styles.toggle, view === v && styles.toggleOn]}>
                    <Text style={[styles.toggleTxt, view === v && styles.toggleTxtOn]}>{v === 'month' ? t('mob.month', 'Month') : t('mob.year', 'Year')}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.legend}>
                {(Object.keys(PAL) as P4[]).map((p) => {
                  const on = filter === p;
                  return (
                    <Pressable key={p} onPress={() => setFilter(on ? null : p)} style={[styles.legendItem, on && styles.legendOn]}>
                      <View style={[styles.legendDot, { backgroundColor: PAL[p] }]} />
                      <Text style={[styles.legendTxt, on && { color: colors.ink, fontFamily: font.semibold }]}>{t('phaseNames.' + p, p)}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.card}>
                <View style={styles.monthHead}>
                  <Pressable hitSlop={10} onPress={() => setCursor(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }))}><Text style={styles.nav}>‹</Text></Pressable>
                  <Text style={styles.monthTitle}>{monthName(cursor.m)} {cursor.y}</Text>
                  <Pressable hitSlop={10} onPress={() => setCursor(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }))}><Text style={styles.nav}>›</Text></Pressable>
                </View>
                <View style={styles.dowRow}>{dows.map((d, i) => <Text key={i} style={styles.dow}>{d}</Text>)}</View>
                <View style={styles.grid}>{monthCells(cursor.y, cursor.m).map((d, i) => <DayCell key={i} d={d} />)}</View>
              </View>

              {/* R3-24: guidance card tied to the specific date */}
              <View style={styles.guide}>
                <Text style={styles.guideDate}>{today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
                <Text style={styles.guideTitle}>{t('phaseNames.' + todayPhase, todayPhase)}</Text>
                <Text style={styles.guideTxt}>{t('phase.' + todayPhase + '.copy', '')}</Text>
              </View>
            </>
          ) : (
            <>
              {/* R3-25/28: Year = its own Cycle History layout */}
              <View style={styles.yearHeadRow}>
                <Text style={styles.yearBig}>{cursor.y}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable hitSlop={8} onPress={() => setCursor(({ y, m }) => ({ y: y - 1, m }))}><Text style={styles.nav}>‹</Text></Pressable>
                  <Pressable hitSlop={8} onPress={() => setCursor(({ y, m }) => ({ y: y + 1, m }))}><Text style={styles.nav}>›</Text></Pressable>
                </View>
              </View>

              <LinearGradient colors={['#FB8A4E', '#F4633A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statsBar}>
                <View style={styles.statCol}><Text style={styles.statVal}>{cyclesTracked || '—'}</Text><Text style={styles.statLbl}>{t('mob.cyclesTracked', 'Cycles Tracked')}</Text></View>
                <View style={styles.statDiv} />
                <View style={styles.statCol}><Text style={styles.statVal}>{len}</Text><Text style={styles.statLbl}>{t('mob.avgLength', 'Avg Length')}</Text></View>
                <View style={styles.statDiv} />
                <View style={styles.statCol}><Text style={styles.statVal}>{variance != null ? `±${variance}d` : '—'}</Text><Text style={styles.statLbl}>{variance != null && variance <= 2 ? t('mob.regular', 'Regular') : t('mob.variance', 'Variance')}</Text></View>
              </LinearGradient>

              {/* D3: real-time text search over phase history, paginated */}
              <View style={styles.searchBox}>
                <Text style={styles.searchIcon}>⌕</Text>
                <TextInput
                  value={query} onChangeText={(v) => { setQuery(v); setPage(1); }}
                  placeholder={t('mob.searchPhases', 'Search your cycle history (e.g. menstrual)')}
                  placeholderTextColor={colors.faint} style={styles.searchInput}
                />
              </View>
              {q !== '' && (
                <View style={styles.card}>
                  {visible.length === 0 ? (
                    <Text style={styles.emptyTxt}>{t('mob.noMatches', 'No phases match — history builds as you log.')}</Text>
                  ) : visible.map((e, i) => (
                    <View key={i} style={styles.epRow}>
                      <View style={[styles.legendDot, { backgroundColor: PAL[displayPhase(e.phase as any) as P4] ?? '#E7DCD3' }]} />
                      <Text style={styles.epPhase}>{phaseLoc(e.phase)}</Text>
                      <Text style={styles.epDates}>{fmtShort(e.from)} – {fmtShort(e.to)} · {e.days}d</Text>
                    </View>
                  ))}
                  {filtered.length > visible.length && (
                    <Pressable onPress={() => setPage((p) => p + 1)} style={styles.moreBtn}>
                      <Text style={styles.moreTxt}>{t('mob.showMore', 'Show more')} ({filtered.length - visible.length})</Text>
                    </Pressable>
                  )}
                </View>
              )}

              <View style={styles.yearWrap}>
                {Array.from({ length: 12 }, (_, m) => {
                  const isCur = cursor.y === today.getFullYear() && m === today.getMonth();
                  return (
                    <Pressable key={m} style={[styles.miniCard, isCur && styles.miniCur]} onPress={() => { setCursor({ y: cursor.y, m }); setView('month'); }}>
                      <Text style={[styles.miniTitle, isCur && { color: colors.coralDeep }]}>{new Date(2026, m, 1).toLocaleDateString(undefined, { month: 'short' })}</Text>
                      <View style={styles.miniGrid}>{monthCells(cursor.y, m).map((d, i) => <DayCell key={i} d={d} mini />)}</View>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable onPress={() => setView('month')} style={styles.toggleRow}>
                <View style={[styles.toggle, styles.toggleOn]}><Text style={styles.toggleTxtOn}>{t('mob.backToMonth', '‹ Back to Month view')}</Text></View>
              </Pressable>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  pageHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 2 },
  back: { fontSize: 30, color: colors.ink, width: 26, marginTop: -3 },
  pageTitle: { fontFamily: font.semibold, fontSize: 17, color: colors.ink },
  pencil: { fontSize: 19, color: colors.ink, width: 26, textAlign: 'right' },
  hero: { borderRadius: 30, padding: 22 },
  heroSmall: { fontFamily: font.medium, fontSize: 12.5, color: 'rgba(255,255,255,0.85)' },
  heroTitle: { fontFamily: font.semibold, fontSize: 30, color: '#fff', marginTop: 4 },
  phasePill: { backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 6 },
  phasePillTxt: { fontFamily: font.medium, fontSize: 12, color: '#fff' },
  segBar: { flexDirection: 'row', height: 22, alignItems: 'center', marginTop: 16, gap: 2 },
  seg: { height: 12, borderRadius: 6, position: 'relative', justifyContent: 'center' },
  segKnob: { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  segKnobTxt: { fontFamily: font.bold, fontSize: 10.5, color: '#F4633A' },
  heroNote: { fontFamily: font.regular, fontSize: 12.5, color: 'rgba(255,255,255,0.92)', marginTop: 12 },
  heroStats: { flexDirection: 'row', gap: 10, marginTop: 14 },
  heroStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 16, padding: 12 },
  heroStatLbl: { fontFamily: font.regular, fontSize: 11.5, color: 'rgba(255,255,255,0.85)' },
  heroStatVal: { fontFamily: font.semibold, fontSize: 17, color: '#fff', marginTop: 2 },
  toggleRow: { flexDirection: 'row', backgroundColor: '#F6EEE7', borderRadius: 999, padding: 4, gap: 4, marginTop: 16 },
  toggle: { flex: 1, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  toggleOn: { backgroundColor: '#fff', ...shadow.card },
  toggleTxt: { fontFamily: font.medium, fontSize: 13, color: colors.muted },
  toggleTxtOn: { color: colors.ink, fontFamily: font.semibold, fontSize: 13 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EFE3D7' },
  legendOn: { borderColor: colors.coral },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendTxt: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
  card: { backgroundColor: '#fff', borderRadius: 26, padding: 18, marginTop: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 3 },
  monthHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  monthTitle: { fontFamily: font.semibold, fontSize: 16.5, color: colors.ink },
  nav: { fontFamily: font.semibold, fontSize: 22, color: colors.ink, paddingHorizontal: 10 },
  dowRow: { flexDirection: 'row', marginBottom: 4 },
  dow: { flex: 1, textAlign: 'center', fontFamily: font.medium, fontSize: 11, color: colors.faint },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 6 },
  dayC: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dayTxtOn: { fontFamily: font.semibold, fontSize: 13, color: '#fff' },
  // R4-F14/f15
  dayNeutral: { backgroundColor: '#FFFAF9', borderWidth: 1, borderColor: '#F0E4DC' },
  dayTxtNeutral: { fontFamily: font.semibold, fontSize: 13, color: colors.ink },
  cdBadge: { position: 'absolute', top: -4, left: -6, width: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cdTxt: { fontFamily: font.bold, fontSize: 8, color: '#fff' },
  miniNeutral: { backgroundColor: '#FFFAF9', borderWidth: 0.5, borderColor: '#EDDFD6' },  // R5-F17
  starRow: { height: 11, marginTop: 1, alignItems: 'center', justifyContent: 'center' },
  star: { fontSize: 9, color: '#E9A23B' },
  yearHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  yearBig: { fontFamily: font.bold, fontSize: 34, color: colors.ink },
  statsBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingVertical: 14, paddingHorizontal: 8, marginTop: 12 },
  statCol: { flex: 1, alignItems: 'center' },
  statVal: { fontFamily: font.bold, fontSize: 19, color: '#fff' },
  statLbl: { fontFamily: font.regular, fontSize: 11, color: 'rgba(255,255,255,0.9)', marginTop: 2, textAlign: 'center' },
  statDiv: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.35)' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 16, marginTop: 12, height: 46, ...shadow.card },
  searchIcon: { fontSize: 18, color: colors.muted, marginRight: 8 },
  searchInput: { flex: 1, fontFamily: font.regular, fontSize: 14, color: colors.ink },
  epRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F5EDE5' },
  epPhase: { fontFamily: font.semibold, fontSize: 13.5, color: colors.ink, flex: 1 },
  epDates: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
  emptyTxt: { fontFamily: font.regular, fontSize: 13, color: colors.muted, textAlign: 'center', paddingVertical: 8 },
  moreBtn: { alignItems: 'center', paddingTop: 12 },
  moreTxt: { fontFamily: font.semibold, fontSize: 13, color: colors.coralDeep },
  yearWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  miniCard: { width: '31%', backgroundColor: '#fff', borderRadius: 16, padding: 7, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  miniCur: { borderWidth: 2, borderColor: colors.coral },
  miniTitle: { fontFamily: font.semibold, fontSize: 11.5, color: colors.ink, marginBottom: 4, textAlign: 'center' },
  miniGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  cellMini: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 1 },
  miniC: { width: 12, height: 12, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  miniN: { fontFamily: font.medium, fontSize: 6.5, color: '#fff' },
  miniStar: { fontSize: 5, color: '#E9A23B', position: 'absolute', right: -1, top: -1 },
  guide: { backgroundColor: '#fff', borderRadius: 22, padding: 18, marginTop: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  guideDate: { fontFamily: font.medium, fontSize: 12, color: colors.coralDeep },
  guideTitle: { fontFamily: font.semibold, fontSize: 15.5, color: colors.ink, marginTop: 3 },
  guideTxt: { fontFamily: font.regular, fontSize: 13, color: colors.muted, lineHeight: 19, marginTop: 6 },
});
