import { Platform, useColorScheme } from 'react-native';

export const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
export const SANS = 'Inter_700Bold';
export const SANS_MED = 'Inter_500Medium';
export const SANS_REG = 'Inter_400Regular';

export const DarkTheme = {
  // Backgrounds — deep navy like the screenshot
  bg: '#060C18',
  bg2: '#0A1424',
  surface: '#0F1D32',
  surfaceCard: '#162540',
  surfaceWarm: '#1A2E4C',

  // Borders
  border: 'rgba(64,128,216,0.20)',
  borderSubtle: 'rgba(64,128,216,0.10)',

  // Text
  text: '#E0ECFF',
  textSecondary: '#7096C4',
  textTertiary: '#3A5880',
  textOnAccent: '#060C18',

  // Brand
  primary: '#2D68C4',
  accent: '#4A90E2',
  accentDark: '#2A70CC',
  warm: '#F0AE30',
  warmLight: 'rgba(240,174,48,0.16)',
  gold: '#F0AE30',

  // Brand surfaces
  sky1: '#03080F',
  sky2: '#060C18',
  panel1: '#091422',
  panel2: '#0E1E36',
  panel3: '#14284A',
  panel4: '#1A3260',
  starColor: 'rgba(224,236,255,0.70)',
  pathColor: 'rgba(74,144,226,0.55)',

  // Tab bar
  tabBg: '#060C18',
  tabBorder: 'rgba(64,128,216,0.15)',
  tabActive: '#FFFFFF',
  tabInactive: '#2A4878',
  tabLabelActive: '#FFFFFF',
  tabLabelInactive: '#3A5880',

  isDark: true as const,
} as const;

export const LightTheme = {
  // Backgrounds — clean white with blue tint
  bg: '#F4F7FF',
  bg2: '#E8EEF8',
  surface: '#FFFFFF',
  surfaceCard: '#FFFFFF',
  surfaceWarm: '#FFF8EC',

  // Borders
  border: 'rgba(30,70,150,0.13)',
  borderSubtle: 'rgba(30,70,150,0.07)',

  // Text
  text: '#0C1C34',
  textSecondary: '#3C5E90',
  textTertiary: '#8AAACE',
  textOnAccent: '#FFFFFF',

  // Brand
  primary: '#2A5CAE',
  accent: '#3A72D4',
  accentDark: '#2A60C0',
  warm: '#E07820',
  warmLight: 'rgba(224,120,32,0.13)',
  gold: '#C88E0A',

  // Brand surfaces
  sky1: '#BACED8',
  sky2: '#D0E2EE',
  panel1: '#7AA0C0',
  panel2: '#9AB8D0',
  panel3: '#B4CAE0',
  panel4: '#C8DCF0',
  starColor: 'rgba(255,255,255,0.95)',
  pathColor: 'rgba(30,80,180,0.28)',

  // Tab bar
  tabBg: '#FFFFFF',
  tabBorder: 'rgba(30,70,150,0.10)',
  tabActive: '#2A5CAE',
  tabInactive: '#8AAACE',
  tabLabelActive: '#2A5CAE',
  tabLabelInactive: '#8AAACE',

  isDark: false as const,
} as const;

export type AppTheme = typeof DarkTheme;

export function useTheme(): AppTheme {
  const scheme = useColorScheme();
  return (scheme === 'dark' ? DarkTheme : LightTheme) as AppTheme;
}
