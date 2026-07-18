import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { colors } from '../theme';

/**
 * F39 — line-icon set for Settings rows (replaces emoji). Minimal 24×24 strokes
 * in the app ink/coral palette; Design's final SVG pass can swap paths in place.
 */
const S = { stroke: colors.ink, strokeWidth: 1.8, fill: 'none' as const, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function SettingsIcon({ name, size = 20, color }: { name: string; size?: number; color?: string }) {
  const p = { ...S, stroke: color ?? S.stroke };
  const I: Record<string, React.ReactNode> = {
    person: (<><Circle cx={12} cy={8} r={3.4} {...p} /><Path d="M5 20c1.2-3.4 3.8-5 7-5s5.8 1.6 7 5" {...p} /></>),
    health: (<><Path d="M4 12h4l2-5 3 9 2-4h5" {...p} /></>),
    watch: (<><Rect x={8} y={7} width={8} height={10} rx={2.5} {...p} /><Path d="M10 7V4h4v3M10 17v3h4v-3" {...p} /></>),
    lock: (<><Rect x={6} y={10} width={12} height={9} rx={2} {...p} /><Path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" {...p} /></>),
    shield: (<><Path d="M12 3l7 3v5c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6l7-3z" {...p} /><Path d="M9.5 12l2 2 3.5-4" {...p} /></>),
    community: (<><Circle cx={9} cy={9} r={2.6} {...p} /><Circle cx={16.5} cy={10} r={2.1} {...p} /><Path d="M4 19c.9-2.7 2.8-4 5-4s4.1 1.3 5 4M14.5 15.4c1.9.2 3.4 1.4 4.2 3.6" {...p} /></>),
    gear: (<><Circle cx={12} cy={12} r={3} {...p} /><Path d="M12 4v2.2M12 17.8V20M4 12h2.2M17.8 12H20M6.3 6.3l1.6 1.6M16.1 16.1l1.6 1.6M17.7 6.3l-1.6 1.6M7.9 16.1l-1.6 1.6" {...p} /></>),
    bell: (<><Path d="M6 17h12l-1.5-2v-4a4.5 4.5 0 0 0-9 0v4L6 17z" {...p} /><Path d="M10.3 19.5a1.8 1.8 0 0 0 3.4 0" {...p} /></>),
    nutrition: (<><Path d="M12 20c-4 0-6.5-2.6-6.5-6.2C5.5 9 9 5.6 12 4c3 1.6 6.5 5 6.5 9.8C18.5 17.4 16 20 12 20z" {...p} /><Path d="M12 20V9" {...p} /></>),
    nutri: (<><Circle cx={12} cy={12} r={7} {...p} /><Circle cx={9.8} cy={10.8} r={0.9} fill={color ?? colors.ink} /><Circle cx={14.2} cy={10.8} r={0.9} fill={color ?? colors.ink} /><Path d="M9.8 14a3 3 0 0 0 4.4 0" {...p} /></>),
    key: (<><Circle cx={8} cy={12} r={3.2} {...p} /><Path d="M11.2 12H20M17 12v3M14.5 12v2" {...p} /></>),
    sms: (<><Path d="M4 5h16v11H10l-4 3.5V16H4V5z" {...p} /><Path d="M8 9h8M8 12h5" {...p} /></>),
    faceid: (<><Path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" {...p} /><Circle cx={9.3} cy={10} r={0.9} fill={color ?? colors.ink} /><Circle cx={14.7} cy={10} r={0.9} fill={color ?? colors.ink} /><Path d="M9.5 14.2a3.4 3.4 0 0 0 5 0" {...p} /></>),
    phone: (<><Rect x={7.5} y={3.5} width={9} height={17} rx={2.2} {...p} /><Path d="M10.8 18.4h2.4" {...p} /></>),
    laptop: (<><Rect x={5} y={5.5} width={14} height={9.5} rx={1.5} {...p} /><Path d="M3 18.5h18" {...p} /></>),
    download: (<><Path d="M12 4v10M8.5 10.5 12 14l3.5-3.5" {...p} /><Path d="M5 17v2.5h14V17" {...p} /></>),
    feedback: (<><Path d="M4 6h16v10H9l-5 4V6z" {...p} /><Path d="M8 10h8M8 12.8h5" {...p} /></>),
  };
  return <Svg width={size} height={size} viewBox="0 0 24 24">{I[name] ?? I.gear}</Svg>;
}
