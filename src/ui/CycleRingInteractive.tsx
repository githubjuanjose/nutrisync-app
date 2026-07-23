import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, Pressable } from 'react-native';
import Svg, { Path, Circle, ClipPath, Defs, G, Rect } from 'react-native-svg';
import { colors, font } from '../theme';

/**
 * R5 · Home cycle ring — reworked to the Round-5 spec (supersedes R4 f4/f5/f6):
 *  • f22: the ring IS the cycle progress again — day 1 starts almost empty at
 *    12 o'clock, the arc grows CLOCKWISE day by day with the day badge riding
 *    the tip; on day ≥ cycle length the ring is fully CLOSED and stays closed
 *    until she logs a new period (the day counter itself never wraps — r4a).
 *  • f1: bright angular palette along the arc, starting #FF5338 then
 *    #FF002A → #FF002C → #FF8372 → #FE4E28 → #FCAD5E at the tip.
 *  • f2: the waves are the EXACT wireframe shapes (Ellipse 259–262.svg from
 *    the round-5 pack) with their own fills/opacities, clipped to the ring.
 *  • scrub (R3-07) kept: drag previews other days (arc + badge + text follow).
 */

const ARC_STOPS: [number, string][] = [
  [0.0, '#FF5338'], [0.2, '#FF002A'], [0.4, '#FF002C'],
  [0.6, '#FF8372'], [0.8, '#FE4E28'], [1.0, '#FCAD5E'],
];

function hex2rgb(h: string) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
/** colour at fraction k (0..1) along the DRAWN arc */
function arcColor(k: number): string {
  if (k <= 0) return ARC_STOPS[0][1];
  if (k >= 1) return ARC_STOPS[ARC_STOPS.length - 1][1];
  for (let i = 0; i < ARC_STOPS.length - 1; i++) {
    const [t0, c0] = ARC_STOPS[i]; const [t1, c1] = ARC_STOPS[i + 1];
    if (k >= t0 && k <= t1) {
      const f = (k - t0) / (t1 - t0);
      const a = hex2rgb(c0), b = hex2rgb(c1);
      return `rgb(${Math.round(lerp(a[0], b[0], f))},${Math.round(lerp(a[1], b[1], f))},${Math.round(lerp(a[2], b[2], f))})`;
    }
  }
  return ARC_STOPS[0][1];
}

/** point on the ring at fraction t of the full circle (0 = 12 o'clock, clockwise) */
function pt(cx: number, cy: number, r: number, t: number) {
  const a = (t * 360 - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/* f2 — exact wireframe wave shapes (Ellipse 259–262.svg), positioned inside
   the ring's inner clip. Native path data straight from the delivered files. */
const WAVES = (
  <>
    {/* Ellipse 262 — red base */}
    <G transform="translate(30, 172) scale(0.9)" opacity={0.5}>
      <Path fill="#FF0731" d="M300 52.7371C283.361 77.9934 259.412 98.2913 230.944 111.264C202.477 124.236 170.665 129.348 139.219 126.003C107.772 122.659 77.9875 110.996 53.3379 92.3739C28.6883 73.7522 10.1899 48.9397 0 20.8299C0 20.8299 36.6008 -9.37299 56.0117 2.95886C88.4329 23.5563 52.1264 78.647 65.7414 92.3739C81.6537 104.395 127.765 79.2098 161.046 96.4955C186.763 107.68 212.568 110.462 230.944 102.088C249.321 93.7138 257.711 69.0411 268.452 52.7371C280.996 33.6962 300 52.7371 300 52.7371Z" />
    </G>
    {/* Ellipse 260 — warm yellow, tall */}
    <G transform="translate(52, 128) scale(0.86)">
      <Path fill="#FCAD5F" d="M218.093 175.375C217.321 176.199 216.48 176.887 215.487 177.423C194.654 188.657 135.581 199.411 112.95 200.595C93.8801 201.592 34.7454 170.834 2.64178 154.644C-1.70442 152.452 -0.399112 145.514 4.45042 145.095L15.4505 145.095C15.4505 145.095 21.4505 145.095 27.9505 145.095C31.8557 145.095 40.9505 144.163 40.9505 144.163L41.6833 144.163C42.5257 144.163 43.3658 144.074 44.1896 143.898L47.9504 143.095L52.9504 142.095L59.731 140.898C60.8713 140.697 61.968 140.341 63.021 139.86C69.929 136.7 89.238 127.767 100.017 97.8068C100.654 96.0375 101.585 94.371 102.265 92.6175C107.578 78.8984 117.458 17.5628 121.836 1.79279C122.537 -0.731518 124.012 -0.502536 124.984 1.92995C125.293 2.70256 125.493 3.51466 125.576 4.34255L130.95 57.5946L138.365 122.847C138.42 123.327 138.657 123.767 139.028 124.076C140.121 124.987 141.81 124.432 142.155 123.052C145.039 111.513 157.161 71.0939 185.451 71.0941C209.036 71.0943 228.951 120.095 237.451 141.094C239.327 145.73 253.951 137.594 258.951 132.094C269.258 120.755 225.77 167.178 218.093 175.375Z" />
    </G>
    {/* Ellipse 259 — orange */}
    <G transform="translate(25, 190) scale(0.86)" opacity={0.6}>
      <Path fill="#FF4200" d="M324 55.5C288.5 113 249.039 129.195 217.577 139.844C186.114 150.492 152.16 151.337 120.208 142.265C88.255 133.193 59.1728 115.093 38 89.5C17 62.5 1.5 34 0 0C0 0 34.1055 20.57 36 42C38.2267 67.1875 46.5 71.5 68.8048 64.0823C91 58.5 159.675 10.0941 183.999 17.0002C208.323 23.9062 216.548 61.6066 240.499 53.5001C264.45 45.3937 275.211 39.4675 299.499 46.5001C325.401 54.0001 324 55.5 324 55.5Z" />
    </G>
    {/* Ellipse 261 — maroon crest */}
    <G transform="translate(52, 208)" opacity={0.5}>
      <Path fill="#AE3146" d="M199.773 75.3586C198.816 76.7009 197.611 77.8249 196.164 78.6138C174.89 90.2089 119.194 107.332 96.8134 108.513C78.2041 109.495 31.8481 99.4945 3.39084 90.6284C-1.62141 89.0668 -0.880584 82.6836 4.31885 81.9576L15.7182 78.7524C16.4513 78.5463 17.1609 78.2726 17.8378 77.9238C19.6154 77.0076 23.3336 75.0467 25.8222 73.4238C29.0975 71.288 30.8848 69.9834 33.8243 67.4022C40.9402 61.154 43.6387 56.2657 48.8307 48.3369C54.8743 39.1077 61.839 23.2534 61.839 23.2534C61.839 23.2534 65.0925 16.8634 67.8423 13.2197C70.7472 9.37069 72.4883 6.69787 76.3458 4.27221C81.0838 1.29287 84.7145 0.234042 88.647 0.0264996C92.5795 -0.181043 97.8593 0.850214 100.49 2.60852C101.99 3.61094 104.846 7.77484 104.846 7.77484C104.846 7.77484 107.323 11.8055 107.843 14.7122C109.983 26.6818 115.834 45.8082 115.834 45.8082C115.834 45.8082 119.719 54.7914 123.829 59.3486C127.471 63.3857 129.986 65.4106 134.827 67.872C141.079 71.0505 145.431 72.4703 152.327 71.8795C175.828 69.8657 180.329 68.3596 201.833 57.8193C209.73 53.9487 214.336 50.2916 219.337 44.7726C229.18 33.9107 205.926 66.7257 199.773 75.3586Z" />
    </G>
  </>
);

function Battery({ level = 0, logged = false }: { level?: number; logged?: boolean }) {
  const fill = logged ? '#3DBE8B' : '#EA5740';
  const n = logged ? 5 : Math.max(0, Math.min(5, level));
  return (
    <Svg width={30} height={16} viewBox="0 0 30 16">
      <Rect x={1} y={1} width={25} height={14} rx={4} stroke={colors.ink} strokeWidth={1.6} fill="none" />
      <Rect x={27.4} y={5} width={2.4} height={6} rx={1.2} fill={colors.ink} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Rect key={i} x={3.4 + i * 4.6} y={3.4} width={3.4} height={9.2} rx={1.4}
          fill={i < n ? fill : '#F0E4DA'} />
      ))}
    </Svg>
  );
}

type Props = {
  size?: number;
  todayDay: number;
  cycleLen: number;
  periodDur: number;
  phaseName: (k: 'menstrual' | 'follicular' | 'ovulatory' | 'luteal') => string;
  phaseForDay: (day: number) => 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';
  onEnergyPress?: () => void;
  energyLevel?: number | null;
  loggedToday?: boolean;
};

export function CycleRingInteractive({
  size = 330, todayDay, cycleLen, periodDur, phaseName, phaseForDay, onEnergyPress, energyLevel, loggedToday,
}: Props) {
  const [scrub, setScrub] = useState<number | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  // r4a: today may exceed cycleLen (no auto-restart) → ring stays CLOSED then
  const previewMax = Math.max(cycleLen, todayDay);
  const day = Math.max(1, Math.min(previewMax, Math.round(drag ?? scrub ?? todayDay)));
  const fracRaw = (drag ?? day) / cycleLen;
  const frac = Math.min(1, Math.max(0.035, fracRaw));   // f22: day 1 ≈ empty; ≥ len = closed
  const closed = frac >= 0.999;
  const phase = phaseForDay(day);
  const label = phaseName(phase);
  const scrubbing = (scrub != null && scrub !== todayDay) || drag != null;

  const C = 165, R = 132, SW = 22;
  const scale = size / 330;
  const SEGS = 88;

  // f22: arc from 12 o'clock, clockwise, up to frac — gradient along the arc (f1)
  const segs = useMemo(() => {
    const out: { d: string; c: string }[] = [];
    const n = Math.max(2, Math.ceil(SEGS * frac));
    for (let i = 0; i < n; i++) {
      const f0 = (i / n) * frac, f1 = ((i + 1) / n) * frac;
      const p0 = pt(C, C, R, f0), p1 = pt(C, C, R, Math.min(f1 + 0.002, frac));
      out.push({
        d: `M ${p0.x} ${p0.y} A ${R} ${R} 0 0 1 ${p1.x} ${p1.y}`,
        c: arcColor(((f0 + f1) / 2) / frac),
      });
    }
    return out;
  }, [frac]);

  const tip = pt(C, C, R, closed ? 1 : frac);

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: (e) => {
      const { locationX: x, locationY: y } = e.nativeEvent;
      const dx = x / scale - C, dy = y / scale - C;
      const d = Math.sqrt(dx * dx + dy * dy);
      return d > (R - 40) && d < (R + 40);
    },
    onMoveShouldSetPanResponder: (e) => {
      const { locationX: x, locationY: y } = e.nativeEvent;
      const dx = x / scale - C, dy = y / scale - C;
      const d = Math.sqrt(dx * dx + dy * dy);
      return d > (R - 40) && d < (R + 40);
    },
    onPanResponderGrant: (e) => {
      const { locationX: x, locationY: y } = e.nativeEvent;
      const dx = x / scale - C, dy = y / scale - C;
      let ang = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (ang < 0) ang += 360;
      setDrag(Math.max(0.5, (ang / 360) * cycleLen));
    },
    onPanResponderMove: (e) => {
      const { locationX: x, locationY: y } = e.nativeEvent;
      const dx = x / scale - C, dy = y / scale - C;
      let ang = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (ang < 0) ang += 360;
      setDrag(Math.max(0.5, (ang / 360) * cycleLen));
    },
    onPanResponderRelease: () => {
      setDrag((d) => { if (d != null) setScrub(Math.max(1, Math.min(cycleLen, Math.round(d)))); return null; });
    },
    onPanResponderTerminate: () => setDrag(null),
  })).current;

  const labelSize = label.length > 11 ? 24 : label.length > 8 ? 28 : 34;

  return (
    <View style={{ width: size, alignItems: 'center' }}>
      <Pressable onPress={onEnergyPress} style={[styles.battery, { right: size * 0.04 }]} hitSlop={10}>
        <Battery level={energyLevel ?? 0} logged={!!loggedToday} />
      </Pressable>

      <View {...pan.panHandlers} style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox="0 0 330 330">
          <Defs>
            <ClipPath id="innerclip"><Circle cx={C} cy={C} r={R - SW / 2 - 6} /></ClipPath>
          </Defs>
          {/* soft glow behind the ring (kept from r4b, faux-radial) */}
          <Circle cx={C} cy={C} r={R + SW / 2} fill="#FFD9CB" opacity={0.35} />
          <Circle cx={C} cy={C} r={R - 8} fill="#FFE9E0" opacity={0.55} />
          <Circle cx={C} cy={C} r={R - 40} fill="#FFF4EE" opacity={0.75} />
          <Circle cx={C} cy={C} r={R - 72} fill="#FFFBF8" opacity={0.9} />
          <Circle cx={C} cy={C} r={R - 100} fill="#FFFFFF" opacity={0.95} />
          {/* white track — the unfilled remainder of the cycle */}
          <Circle cx={C} cy={C} r={R} stroke="#FFFFFF" strokeWidth={SW} fill="none" />
          {/* the progress arc (f1 palette) */}
          {segs.map((s, i) => <Path key={i} d={s.d} stroke={s.c} strokeWidth={SW} fill="none" />)}
          {/* rounded start cap at 12 o'clock */}
          <Circle cx={pt(C, C, R, 0).x} cy={pt(C, C, R, 0).y} r={SW / 2} fill={arcColor(0)} />
          {/* f2: EXACT wireframe waves, clipped to the inner circle */}
          <G clipPath="url(#innerclip)">{WAVES}</G>
          {/* f22: day badge riding the TIP of the arc */}
          <Circle cx={tip.x} cy={tip.y} r={22} fill="#FFFFFF" />
          <Circle cx={tip.x} cy={tip.y} r={22} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={1} />
        </Svg>

        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={{ position: 'absolute', left: (tip.x / 330) * size - 22 * scale, top: (tip.y / 330) * size - 22 * scale, width: 44 * scale, height: 44 * scale, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: font.bold, fontSize: 17, color: '#F5641E' }}>{day}</Text>
          </View>
          <View style={styles.centre} pointerEvents="none">
            <Text style={[styles.phase, { fontSize: labelSize }]} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
            <Text style={styles.day}>{`Day ${day}`}</Text>
          </View>
        </View>
      </View>

      {scrubbing && drag == null ? (
        <Pressable onPress={() => setScrub(null)} style={styles.backToday}>
          <Text style={styles.backTodayTxt}>‹ Back to today (Day {todayDay})</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  battery: { position: 'absolute', top: -2, zIndex: 5, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 9, paddingVertical: 7, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  centre: { position: 'absolute', left: 0, right: 0, top: '31%', alignItems: 'center', paddingHorizontal: 62 },
  phase: { fontFamily: font.bold, color: colors.ink, textAlign: 'center' },
  day: { fontFamily: font.regular, fontSize: 18, color: colors.muted, marginTop: 6 },
  backToday: { marginTop: 10, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  backTodayTxt: { fontFamily: font.semibold, fontSize: 12.5, color: colors.coral },
});
