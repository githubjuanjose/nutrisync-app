import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, Pressable } from 'react-native';
import Svg, { Path, Circle, ClipPath, Defs, G, Rect } from 'react-native-svg';
import { colors, font } from '../theme';

/**
 * R2-H · F26 — the interactive Home cycle ring, per the reference spec:
 *  • progress runs CLOCKWISE from 12 o'clock, rounded caps
 *  • the arc uses the EXACT multi-stop gradient: #570B18 5% → #BD1833 18% →
 *    #D34D64 30% → #FF3519 40% → #FE4E28 59% → #FCAD5E 71%, smoothly blended
 *    (drawn as 72 interpolated segments — SVG has no angular gradient), rest white
 *  • white knob with the day number rides the ring; drag/scrub anywhere on the
 *    ring to preview ANY day of the cycle — day, phase and colours update live
 *  • phase name always fits inside the circle (responsive type), F6 % = day/len
 *  • fixed organic wave illustration in the lower half
 *  • battery button (F24) opens the energy/mood check-in — it never auto-opens
 */

const STOPS: [number, string][] = [
  [0.05, '#570B18'], [0.18, '#BD1833'], [0.30, '#D34D64'],
  [0.40, '#FF3519'], [0.59, '#FE4E28'], [0.71, '#FCAD5E'],
];

function hex2rgb(h: string) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function colorAt(t: number): string {
  if (t <= STOPS[0][0]) return STOPS[0][1];
  if (t >= STOPS[STOPS.length - 1][0]) return STOPS[STOPS.length - 1][1];
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [t0, c0] = STOPS[i]; const [t1, c1] = STOPS[i + 1];
    if (t >= t0 && t <= t1) {
      const k = (t - t0) / (t1 - t0);
      const a = hex2rgb(c0), b = hex2rgb(c1);
      return `rgb(${Math.round(lerp(a[0], b[0], k))},${Math.round(lerp(a[1], b[1], k))},${Math.round(lerp(a[2], b[2], k))})`;
    }
  }
  return STOPS[0][1];
}

/** point on the ring at fraction t (0 = 12 o'clock, clockwise) */
function pt(cx: number, cy: number, r: number, t: number) {
  const a = (t * 360 - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function Battery({ level = 3 }: { level?: number }) {
  return (
    <Svg width={30} height={16} viewBox="0 0 30 16">
      <Rect x={1} y={1} width={25} height={14} rx={4} stroke={colors.ink} strokeWidth={1.6} fill="none" />
      <Rect x={27.4} y={5} width={2.4} height={6} rx={1.2} fill={colors.ink} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Rect key={i} x={3.4 + i * 4.6} y={3.4} width={3.4} height={9.2} rx={1.4}
          fill={i < level ? '#EA5740' : '#F0E4DA'} />
      ))}
    </Svg>
  );
}

type Props = {
  size?: number;
  todayDay: number;
  cycleLen: number;
  periodDur: number;
  /** localized display name for a 4-phase key */
  phaseName: (k: 'menstrual' | 'follicular' | 'ovulatory' | 'luteal') => string;
  phaseForDay: (day: number) => 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';
  onEnergyPress?: () => void;
  energyLevel?: number | null;
};

export function CycleRingInteractive({
  size = 330, todayDay, cycleLen, periodDur, phaseName, phaseForDay, onEnergyPress, energyLevel,
}: Props) {
  const [scrub, setScrub] = useState<number | null>(null);
  const day = scrub ?? todayDay;
  const t = Math.max(0.02, Math.min(1, day / cycleLen));   // F6: fill = day/len
  const phase = phaseForDay(day);
  const label = phaseName(phase);
  const scrubbing = scrub != null && scrub !== todayDay;

  const C = 165, R = 132, SW = 22;
  const scale = size / 330;
  const SEGS = 72;

  // interpolated arc segments up to t (clockwise from top)
  const segs = useMemo(() => {
    const out: { d: string; c: string }[] = [];
    const n = Math.max(2, Math.ceil(SEGS * t));
    for (let i = 0; i < n; i++) {
      const f0 = (i / n) * t, f1 = ((i + 1) / n) * t;
      const p0 = pt(C, C, R, f0), p1 = pt(C, C, R, f1 + 0.002);
      out.push({
        d: `M ${p0.x} ${p0.y} A ${R} ${R} 0 0 1 ${p1.x} ${p1.y}`,
        c: colorAt((f0 + f1) / 2),
      });
    }
    return out;
  }, [t]);

  const knob = pt(C, C, R, t);
  const capStart = pt(C, C, R, 0);

  // drag/scrub → angle → day (view-only preview; today's data untouched)
  const wrapRef = useRef<View>(null);
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: (e) => {
      // only claim touches near the ring band so centre content stays scrollable
      const { locationX: x, locationY: y } = e.nativeEvent;
      const dx = x / scale - C, dy = y / scale - C;
      const d = Math.sqrt(dx * dx + dy * dy);
      return d > (R - 34) && d < (R + 34);
    },
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (e) => {
      const { locationX: x, locationY: y } = e.nativeEvent;
      const dx = x / scale - C, dy = y / scale - C;
      let ang = Math.atan2(dy, dx) * (180 / Math.PI) + 90; // 0 at top, clockwise
      if (ang < 0) ang += 360;
      const d = Math.max(1, Math.min(cycleLen, Math.round((ang / 360) * cycleLen)));
      setScrub(d);
    },
  })).current;

  // phase label always fits (F26: never touches the ring)
  const labelSize = label.length > 11 ? 19 : label.length > 8 ? 23 : 27;

  return (
    <View style={{ width: size, alignItems: 'center' }}>
      {/* battery entry — F24 (top-right of the ring, never auto-opens) */}
      <Pressable onPress={onEnergyPress} style={[styles.battery, { right: size * 0.04 }]} hitSlop={10}>
        <Battery level={energyLevel ?? 0} />
      </Pressable>

      <View ref={wrapRef} {...pan.panHandlers} style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox="0 0 330 330">
          <Defs>
            <ClipPath id="innerclip"><Circle cx={C} cy={C} r={R - SW / 2 - 6} /></ClipPath>
          </Defs>
          {/* track */}
          <Circle cx={C} cy={C} r={R} stroke="#FFFFFF" strokeWidth={SW} fill="none" />
          {/* progress: interpolated multi-stop arc */}
          {segs.map((s, i) => <Path key={i} d={s.d} stroke={s.c} strokeWidth={SW} fill="none" />)}
          {/* rounded caps */}
          <Circle cx={capStart.x} cy={capStart.y} r={SW / 2} fill={colorAt(0)} />
          <Circle cx={knob.x} cy={knob.y} r={SW / 2} fill={colorAt(t)} />
          {/* fixed wave illustration, lower half, never touching the ring */}
          <G clipPath="url(#innerclip)" opacity={0.85}>
            <Path d="M40 214 C 90 180, 130 236, 176 208 C 220 182, 258 224, 300 198 L 300 330 L 30 330 Z" fill="#FBD9C8" opacity={0.55} />
            <Path d="M30 236 C 84 208, 138 252, 190 228 C 240 206, 272 244, 302 226 L 302 330 L 28 330 Z" fill="#F6A98B" opacity={0.5} />
            <Path d="M28 258 C 90 236, 150 272, 206 252 C 250 236, 280 262, 302 252 L 302 330 L 28 330 Z" fill="#EA5740" opacity={0.42} />
          </G>
          {/* knob: white with day number */}
          <Circle cx={knob.x} cy={knob.y} r={19} fill="#fff" />
          <Circle cx={knob.x} cy={knob.y} r={19} fill="#fff" opacity={0.001} stroke="rgba(0,0,0,0.08)" strokeWidth={1} />
        </Svg>

        {/* knob number + centre content as RN Text (crisper than SvgText) */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill]}>
          <View style={{ position: 'absolute', left: (knob.x / 330) * size - 19 * scale, top: (knob.y / 330) * size - 19 * scale, width: 38 * scale, height: 38 * scale, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: font.bold, fontSize: 14, color: '#F5641E' }}>{day}</Text>
          </View>
          <View style={styles.centre} pointerEvents="none">
            <Text style={[styles.phase, { fontSize: labelSize }]} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
            <Text style={styles.day}>{scrubbing ? `Day ${day}` : `Day ${day}`}</Text>
          </View>
        </View>
      </View>

      {scrubbing ? (
        <Pressable onPress={() => setScrub(null)} style={styles.backToday}>
          <Text style={styles.backTodayTxt}>‹ Back to today (Day {todayDay})</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  battery: { position: 'absolute', top: -2, zIndex: 5, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 9, paddingVertical: 7, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  centre: { position: 'absolute', left: 0, right: 0, top: '34%', alignItems: 'center', paddingHorizontal: 70 },
  phase: { fontFamily: font.semibold, color: colors.ink, textAlign: 'center' },
  day: { fontFamily: font.regular, fontSize: 15, color: colors.muted, marginTop: 4 },
  backToday: { marginTop: 10, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  backTodayTxt: { fontFamily: font.semibold, fontSize: 12.5, color: colors.coral },
});
