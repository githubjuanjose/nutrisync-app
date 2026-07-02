/**
 * NutriSync design tokens — sampled from the Figma app screens.
 * Phase colours follow the developer spec (§2.2).
 */
export const colors = {
  // Brand
  coral: '#E8472A',
  coralDeep: '#C73A20',
  brandOrange: '#FF5509', // "NutriSync" wordmark accent (from Figma)
  orange: '#F5641E',
  orangeLight: '#FF9142',
  // Surfaces
  cream: '#F5F2EB',
  peachTop: '#FCF1EC',
  peachBottom: '#F6C6A8',
  white: '#FFFFFF',
  card: '#FFFFFF',
  // Text
  ink: '#241D1A',
  body: '#3F3833',
  muted: '#9A8F88',
  faint: '#C7BDB5',
  // Lines
  line: '#EADFD5',
  // Status
  good: '#3DBE8B',
  // Cycle phases (developer spec §2.2)
  menstrual: '#E8472A',
  follicular: '#6B9E6B',
  ovulatory: '#D4A017',
  luteal: '#7B5EA7',
} as const;

export type PhaseKey = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';

export const phaseColor: Record<PhaseKey, string> = {
  menstrual: colors.menstrual,
  follicular: colors.follicular,
  ovulatory: colors.ovulatory,
  luteal: colors.luteal,
};

export const font = {
  // The Figma app uses Poppins throughout (headings included).
  display: 'Poppins_600SemiBold',
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 100,
} as const;

export const spacing = (n: number) => n * 4;

export const shadow = {
  card: {
    shadowColor: '#B4402A',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
} as const;
