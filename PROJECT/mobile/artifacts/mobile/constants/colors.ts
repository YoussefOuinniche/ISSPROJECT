const Colors = {
  // ── Terminal Dark ─────────────────────────────────────────────────────────────
  primary: '#E84335',          // Terminal orange-red (main accent)
  primaryDark: '#B5251A',
  primaryLight: '#FF6B5B',
  accent: '#22C55E',           // Terminal green (success/active)
  accentDark: '#16A34A',
  accentLight: '#22C55E20',

  success: '#22C55E',
  successLight: '#22C55E18',
  warning: '#F59E0B',
  warningLight: '#F59E0B18',
  danger: '#E84335',
  dangerLight: '#E8433518',

  // ── Surfaces — Deep Dark ──────────────────────────────────────────────────────
  background: '#08090D',
  background2: '#0D0F14',
  background3: '#111520',
  backgroundSecondary: '#0D0F14',
  surface: '#111520',
  surfaceElevated: '#181D28',
  border: 'rgba(232,67,53,0.18)',
  borderSubtle: 'rgba(255,255,255,0.05)',

  // ── Text ─────────────────────────────────────────────────────────────────────
  textPrimary: '#E8E6E1',
  textSecondary: '#4A5568',
  textTertiary: '#2D3748',
  textInverse: '#08090D',

  // ── Gradients ────────────────────────────────────────────────────────────────
  gradientPrimary: ['#E84335', '#B5251A'] as [string, string],
  gradientAccent: ['#22C55E', '#16A34A'] as [string, string],
  gradientSuccess: ['#22C55E', '#16A34A'] as [string, string],
  gradientWarm: ['#F59E0B', '#E84335'] as [string, string],
  gradientDark: ['#111520', '#08090D'] as [string, string],
  gradientCard: ['#181D28', '#111520'] as [string, string],

  // ── Nav ──────────────────────────────────────────────────────────────────────
  tint: '#E84335',
  tabIconDefault: '#2D3748',
  tabIconSelected: '#E84335',

  // ── Utilities ────────────────────────────────────────────────────────────────
  shadow: 'rgba(0,0,0,0.6)',
  shadowStrong: 'rgba(0,0,0,0.8)',
  overlay: 'rgba(0,0,0,0.7)',
  glass: 'rgba(17,21,32,0.96)',
  glassBorder: 'rgba(255,255,255,0.06)',

  // ── Skill levels ─────────────────────────────────────────────────────────────
  skillBeginner: '#22C55E',
  skillIntermediate: '#F59E0B',
  skillAdvanced: '#E84335',
  skillExpert: '#E8E6E1',
};

export default Colors;
