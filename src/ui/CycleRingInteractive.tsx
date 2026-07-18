import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, Pressable } from 'react-native';
import Svg, { Path, Circle, ClipPath, Defs, G, Rect } from 'react-native-svg';
import { colors, font } from '../theme';

/**
 * R3 · Home cycle ring — rebuilt against the founders' reference (18 Jul):
 *  • progress arc starts at 12 o'clock and runs CLOCKWISE; the rest of the ring
 *    stays a white track, so a gap is always visible (041: capped at 94% so it
 *    never reads as a closed loop)
 *  • the gradient maps along the DRAWN ARC (042): darkest maroon at the start
 *    cap → bright red-orange at the tip, whatever day it is
 *  • the day badge (043) is a white circle with the day number riding the TIP
 *    of the arc — where the fill meets the white gap
 *  • smooth continuous scrub (R3-07): the arc follows the finger; release keeps
 *    the previewed day; "Back to today" restores
 *  • battery (R3-08): red segments while unlogged, ALL GREEN once today's
 *    check-in is saved; opens the gate on tap (never auto-opens)
 *  • layered multi-colour waves (R3-10): pink / orange / maroon tones
 */

const ARC_STOPS: [number, string][] = [
  [0.0, '#4A0812'], [0.28, '#7A0E1D'], [0.55, '#B01326'], [0.8, '#E02318'], [1.0, '#FF3B1D'],
];

function hex2rgb(h: string) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
/** colour at fraction k (0..1) ALONG THE ARC (not the cycle) */
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
  /** R3-08: true once today's mood/energy check-in is saved → battery turns green */
  loggedToday?: boolean;
};

export function CycleRingInteractive({
  size = 330, todayDay, cycleLen, periodDur, phaseName, phaseForDay, onEnergyPress, energyLevel, loggedToday,
}: Props) {
  const [scrub, setScrub] = useState<number | null>(null);      // committed preview day
  const [drag, setDrag] = useState<number | null>(null);        // live float while dragging
  const day = Math.max(1, Math.min(cycleLen, Math.round(drag ?? scrub ?? todayDay)));
  const frac = (drag ?? day) / cycleLen;
  const t = Math.max(0.04, Math.min(0.94, frac));               // 041: gap always visible
  const phase = phaseForDay(day);
  const label = phaseName(phase);
  const scrubbing = (scrub != null && scrub !== todayDay) || drag != null;

  const C = 165, R = 132, SW = 22;
  const scale = size / 330;
  const SEGS = 72;

  // interpolated arc segments up to t — colour mapped along the arc (042)
  const segs = useMemo(() => {
    const out: { d: string; c: string }[] = [];
    const n = Math.max(2, Math.ceil(SEGS * t));
    for (let i = 0; i < n; i++) {
      const f0 = (i / n) * t, f1 = ((i + 1) / n) * t;
      const p0 = pt(C, C, R, f0), p1 = pt(C, C, R, f1 + 0.002);
      out.push({
        d: `M ${p0.x} ${p0.y} A ${R} ${R} 0 0 1 ${p1.x} ${p1.y}`,
        c: arcColor(((f0 + f1) / 2) / t),
      });
    }
    return out;
  }, [t]);

  const tip = pt(C, C, R, t);
  const capStart = pt(C, C, R, 0);

  // continuous scrub (R3-07): the arc follows the finger; day = rounded angle
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
      setDrag(Math.max(0.5, (ang / 360) * cycleLen));   // float → arc glides with the finger
    },
    onPanResponderRelease: () => {
      setDrag((d) => { if (d != null) setScrub(Math.max(1, Math.min(cycleLen, Math.round(d)))); return null; });
    },
    onPanResponderTerminate: () => setDrag(null),
  })).current;

  const labelSize = label.length > 11 ? 20 : label.length > 8 ? 24 : 28;

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
          {/* white track (the "unfilled" remainder = the visible gap) */}
          <Circle cx={C} cy={C} r={R} stroke="#FFFFFF" strokeWidth={SW} fill="none" />
          {/* progress arc, gradient along the arc */}
          {segs.map((s, i) => <Path key={i} d={s.d} stroke={s.c} strokeWidth={SW} fill="none" />)}
          {/* rounded dark start cap at 12 o'clock */}
          <Circle cx={capStart.x} cy={capStart.y} r={SW / 2} fill={arcColor(0)} />
          {/* layered multi-colour waves (R3-10): pink / orange / maroon */}
          <G clipPath="url(#innerclip)" opacity={0.9}>
            <Path d="M40 214 C 90 180, 130 236, 176 208 C 220 182, 258 224, 300 198 L 300 330 L 30 330 Z" fill="#F9C2CE" opacity={0.6} />
            <Path d="M30 236 C 84 208, 138 252, 190 228 C 240 206, 272 244, 302 226 L 302 330 L 28 330 Z" fill="#F49E7A" opacity={0.6} />
            <Path d="M28 258 C 90 236, 150 272, 206 252 C 250 236, 280 262, 302 252 L 302 330 L 28 330 Z" fill="#B65A4B" opacity={0.45} />
          </G>
          {/* day badge riding the tip of the arc (043) */}
          <Circle cx={tip.x} cy={tip.y} r={22} fill="#FFFFFF" />
          <Circle cx={tip.x} cy={tip.y} r={22} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={1} />
        </Svg>

        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={{ position: 'absolute', left: (tip.x / 330) * size - 22 * scale, top: (tip.y / 330) * size - 22 * scale, width: 44 * scale, height: 44 * scale, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: font.bold, fontSize: 16, color: '#F5641E' }}>{day}</Text>
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
  centre: { position: 'absolute', left: 0, right: 0, top: '32%', alignItems: 'center', paddingHorizontal: 70 },
  phase: { fontFamily: font.bold, color: colors.ink, textAlign: 'center' },
  day: { fontFamily: font.regular, fontSize: 16, color: colors.muted, marginTop: 6 },
  backToday: { marginTop: 10, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  backTodayTxt: { fontFamily: font.semibold, fontSize: 12.5, color: colors.coral },
});
