import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, Pressable } from 'react-native';
import Svg, { Path, Circle, ClipPath, Defs, G, Rect } from 'react-native-svg';
import { colors, font } from '../theme';

/**
 * R4 · Home cycle ring — reworked against the Round-4 wireframe review:
 *  • f4: the gap is FIXED at the upper-left and always the same small size —
 *    the ring reads as a decorated arc, never a closed loop and never a
 *    variable-size pie
 *  • f5: gradient runs along the drawn arc with the darkest/most saturated
 *    red at the TOP-RIGHT, lightening through orange toward the gap at the
 *    upper-left
 *  • f6: the day badge sits at the START of the gap (left side), overlapping
 *    the white unfilled section — fixed position, the NUMBER changes
 *  • F3: bigger centre text, still clamped inside the ring
 *  • f7: waves keep distinct pink / orange / maroon layers (stronger contrast)
 *  • f8: soft radial white→warm glow behind the ring (faux-radial concentric
 *    circles — avoids the react-native-svg RadialGradient banding on web)
 *  • scrub (R3-07) kept: dragging around the ring previews other days — it
 *    changes the centre text + badge number; geometry stays fixed
 */

const GAP_START = 0.86;              // fraction of circle, clockwise from 12 o'clock (~9:50, left)
const GAP_END = 0.96;                // (~11:30, upper-left)
const ARC_LEN = 1 - (GAP_END - GAP_START); // 90% of the circle is drawn
const BADGE_T = 0.872;               // f6: fixed badge just inside the gap, at its start (left)

/** gradient stops along the DRAWN ARC (u = 0 at gap end → 1 at gap start) */
const ARC_STOPS: [number, string][] = [
  [0.0, '#8F0F1F'],   // leaving the gap (upper-left → top): deep red
  [0.18, '#4A0812'],  // f5: darkest maroon at the TOP-RIGHT
  [0.45, '#B01326'],
  [0.72, '#F0663A'],
  [1.0, '#FFC79E'],   // f5: lightest orange arriving at the gap (upper-left)
];

function hex2rgb(h: string) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
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
  // R4-f31: today can legitimately exceed cycleLen (no auto-restart) — never clamp today itself
  const previewMax = Math.max(cycleLen, todayDay);
  const day = Math.max(1, Math.min(previewMax, Math.round(drag ?? scrub ?? todayDay)));
  const phase = phaseForDay(day);
  const label = phaseName(phase);
  const scrubbing = (scrub != null && scrub !== todayDay) || drag != null;

  const C = 165, R = 132, SW = 22;
  const scale = size / 330;
  const SEGS = 88;

  // f4/f5: fixed 90% arc, gradient mapped along it — geometry never changes
  const segs = useMemo(() => {
    const out: { d: string; c: string }[] = [];
    for (let i = 0; i < SEGS; i++) {
      const u0 = i / SEGS, u1 = (i + 1) / SEGS;
      const t0 = (GAP_END + u0 * ARC_LEN) % 1;
      const t1 = (GAP_END + u1 * ARC_LEN + 0.0015) % 1;
      const p0 = pt(C, C, R, t0), p1 = pt(C, C, R, t1);
      out.push({
        d: `M ${p0.x} ${p0.y} A ${R} ${R} 0 0 1 ${p1.x} ${p1.y}`,
        c: arcColor((u0 + u1) / 2),
      });
    }
    return out;
  }, []);

  const badge = pt(C, C, R, BADGE_T);

  // scrub: angle under the finger → previewed day (text + badge number only)
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

  // F3: noticeably bigger centre text, still adaptive so long phase names fit
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
          {/* f8: soft faux-radial glow behind the ring (white centre → warm edge) */}
          <Circle cx={C} cy={C} r={R + SW / 2} fill="#FFD9CB" opacity={0.35} />
          <Circle cx={C} cy={C} r={R - 8} fill="#FFE9E0" opacity={0.55} />
          <Circle cx={C} cy={C} r={R - 40} fill="#FFF4EE" opacity={0.75} />
          <Circle cx={C} cy={C} r={R - 72} fill="#FFFBF8" opacity={0.9} />
          <Circle cx={C} cy={C} r={R - 100} fill="#FFFFFF" opacity={0.95} />
          {/* white track — the visible fixed gap at the upper-left (f4) */}
          <Circle cx={C} cy={C} r={R} stroke="#FFFFFF" strokeWidth={SW} fill="none" />
          {/* the arc with the f5 gradient */}
          {segs.map((s, i) => <Path key={i} d={s.d} stroke={s.c} strokeWidth={SW} fill="none" />)}
          {/* f7: layered waves with real colour depth */}
          <G clipPath="url(#innerclip)" opacity={0.95}>
            <Path d="M40 214 C 90 180, 130 236, 176 208 C 220 182, 258 224, 300 198 L 300 330 L 30 330 Z" fill="#F9AFC0" opacity={0.8} />
            <Path d="M30 236 C 84 208, 138 252, 190 228 C 240 206, 272 244, 302 226 L 302 330 L 28 330 Z" fill="#F2803F" opacity={0.65} />
            <Path d="M28 258 C 90 236, 150 272, 206 252 C 250 236, 280 262, 302 252 L 302 330 L 28 330 Z" fill="#8E3B33" opacity={0.5} />
          </G>
          {/* f6: day badge FIXED at the start of the gap (left side), over the white section */}
          <Circle cx={badge.x} cy={badge.y} r={22} fill="#FFFFFF" />
          <Circle cx={badge.x} cy={badge.y} r={22} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={1} />
        </Svg>

        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={{ position: 'absolute', left: (badge.x / 330) * size - 22 * scale, top: (badge.y / 330) * size - 22 * scale, width: 44 * scale, height: 44 * scale, alignItems: 'center', justifyContent: 'center' }}>
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
