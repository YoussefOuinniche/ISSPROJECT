import { Platform, StyleSheet } from "react-native";

import Colors from "@/constants/colors";

const hairline = StyleSheet.hairlineWidth;

export const AppFonts = {
  body: "Newsreader_400Regular",
  medium: "Newsreader_500Medium",
  semibold: "Newsreader_600SemiBold",
  bold: "Newsreader_700Bold",
  display: "Newsreader_600SemiBold",
  displayBold: "Newsreader_700Bold",
} as const;

export const AppSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 32,
  page: 20,
} as const;

export const AppRadius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const AppType = {
  displayLarge: {
    fontFamily: AppFonts.displayBold,
    fontSize: 38,
    lineHeight: 40,
    letterSpacing: -1.1,
  },
  displayMedium: {
    fontFamily: AppFonts.display,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.8,
  },
  screenTitle: {
    fontFamily: AppFonts.display,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.6,
  },
  sectionTitle: {
    fontFamily: AppFonts.semibold,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: AppFonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  bodyStrong: {
    fontFamily: AppFonts.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontFamily: AppFonts.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.1,
  },
  label: {
    fontFamily: AppFonts.semibold,
    fontSize: 13,
    lineHeight: 18,
  },
} as const;

export const AppShadow = {
  subtle: Platform.select({
    ios: {
      shadowColor: "#111111",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
    },
    android: {
      elevation: 1,
    },
    default: {},
  }),
  floating: Platform.select({
    ios: {
      shadowColor: "#111111",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }),
} as const;

export function alpha(hex: string, opacity: number) {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
        .split("")
        .map((char) => `${char}${char}`)
        .join("")
      : normalized;

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

export const AppTheme = {
  colors: Colors,
  fonts: AppFonts,
  spacing: AppSpacing,
  radius: AppRadius,
  type: AppType,
  shadow: AppShadow,
  hairline,
} as const;
