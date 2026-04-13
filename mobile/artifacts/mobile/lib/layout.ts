import { Platform } from "react-native";

type BottomPaddingOptions = {
  hasTabBar?: boolean;
  extra?: number;
};

const BASE_GUTTER = 24;
const TAB_BAR_HEIGHT = Platform.OS === "web" ? 84 : 68;
const MIN_TAB_PADDING = Platform.OS === "web" ? 120 : 108;
const MIN_SCREEN_PADDING = Platform.OS === "web" ? 112 : 96;

export function getBottomContentPadding(
  insetBottom: number,
  options: BottomPaddingOptions = {}
): number {
  const { hasTabBar = false, extra = 0 } = options;
  const overlayHeight = hasTabBar ? TAB_BAR_HEIGHT : 0;
  const minPadding = hasTabBar ? MIN_TAB_PADDING : MIN_SCREEN_PADDING;
  const adaptivePadding = insetBottom + BASE_GUTTER + overlayHeight;

  return Math.max(minPadding, adaptivePadding) + extra;
}