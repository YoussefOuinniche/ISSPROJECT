'use no memo';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient as SvgGradient,
  Path,
  Rect,
  Stop,
  Line,
  G,
} from 'react-native-svg';
import Reanimated, {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { AppTheme } from '@/constants/theme';

const { width: SW } = Dimensions.get('window');
const W = SW;
const H = 270;

// Switchback trail nodes — zigzag up the mountain face
const TRAIL_NX = [0.12, 0.28, 0.58, 0.36, 0.64, 0.44, 0.50];
const TRAIL_NY = [0.92, 0.76, 0.66, 0.52, 0.40, 0.26, 0.08];
const N_NODES = TRAIL_NX.length;
// Pre-computed pixel coords and t values (safe for worklets)
const TRAIL_XS: number[] = TRAIL_NX.map(nx => nx * W);
const TRAIL_YS: number[] = TRAIL_NY.map(ny => ny * H);
const TRAIL_TS: number[] = TRAIL_NX.map((_, i) => i / (N_NODES - 1));

function trailX(t: number) {
  'worklet';
  return interpolate(t, TRAIL_TS, TRAIL_XS);
}
function trailY(t: number) {
  'worklet';
  return interpolate(t, TRAIL_TS, TRAIL_YS);
}

// Build the SVG path string for the full trail
function buildTrailPath() {
  return TRAIL_NX.map((nx, i) => {
    const cmd = i === 0 ? 'M' : 'L';
    return `${cmd}${nx * W},${TRAIL_NY[i] * H}`;
  }).join(' ');
}

// Mountain face paths
const SUMMIT_X = W * 0.50;
const SUMMIT_Y = H * 0.06;

const mtnMainLeft = `M${SUMMIT_X},${SUMMIT_Y} C${W * 0.38},${H * 0.32} ${W * 0.20},${H * 0.65} ${W * 0.03},${H}`;
const mtnMainRight = `M${SUMMIT_X},${SUMMIT_Y} C${W * 0.62},${H * 0.32} ${W * 0.80},${H * 0.65} ${W * 0.97},${H}`;
const mtnMainFull = `${mtnMainLeft} L${W * 0.97},${H} L${W * 0.03},${H} Z`;
const mtnShadowLeft = `M${SUMMIT_X},${SUMMIT_Y} C${W * 0.38},${H * 0.32} ${W * 0.20},${H * 0.65} ${W * 0.03},${H} L${W * 0.03},${H} Z`;

// Background mountains
const mtnBg1 = `M-${W * 0.05},${H} L${W * 0.28},${H * 0.30} L${W * 0.58},${H} Z`;
const mtnBg2 = `M${W * 0.48},${H} L${W * 0.76},${H * 0.36} L${W * 1.08},${H} Z`;

// Snow cap
const snowCap = [
  `M${SUMMIT_X},${SUMMIT_Y}`,
  `C${W * 0.47},${H * 0.16} ${W * 0.44},${H * 0.20} ${W * 0.42},${H * 0.24}`,
  `L${W * 0.58},${H * 0.24}`,
  `C${W * 0.56},${H * 0.20} ${W * 0.53},${H * 0.16} Z`,
].join(' ');

const STARS = [
  { cx: W * 0.07, cy: H * 0.07, r: 1.2, op: 0.80 },
  { cx: W * 0.18, cy: H * 0.03, r: 0.9, op: 0.55 },
  { cx: W * 0.30, cy: H * 0.09, r: 1.3, op: 0.75 },
  { cx: W * 0.45, cy: H * 0.04, r: 0.8, op: 0.65 },
  { cx: W * 0.62, cy: H * 0.06, r: 1.1, op: 0.70 },
  { cx: W * 0.78, cy: H * 0.03, r: 1.3, op: 0.60 },
  { cx: W * 0.88, cy: H * 0.10, r: 0.9, op: 0.50 },
  { cx: W * 0.94, cy: H * 0.05, r: 1.2, op: 0.72 },
  { cx: W * 0.14, cy: H * 0.14, r: 0.7, op: 0.40 },
  { cx: W * 0.72, cy: H * 0.13, r: 0.8, op: 0.45 },
];

interface Props {
  completedSteps: number;
  totalSteps: number;
  theme: AppTheme;
}

export function MountainClimberScene({ completedSteps, totalSteps, theme }: Props) {
  const progress = useSharedValue(
    totalSteps > 0 ? completedSteps / totalSteps : 0
  );

  // Bob animation for the character
  const bob = useSharedValue(0);

  useEffect(() => {
    const target = totalSteps > 0 ? completedSteps / totalSteps : 0;
    progress.value = withSpring(target, { damping: 16, stiffness: 80, mass: 1.2 });
  }, [completedSteps, totalSteps]);

  useEffect(() => {
    bob.value = withRepeat(
      withSequence(
        withTiming(-2.5, { duration: 700 }),
        withTiming(2.5, { duration: 700 })
      ),
      -1,
      true
    );
  }, []);

  // Character position derived from progress
  const charX = useDerivedValue(() => trailX(progress.value));
  const charY = useDerivedValue(() => trailY(progress.value));

  // Character animated style (absolute overlay)
  const charStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: charX.value - 12 },
      { translateY: charY.value + bob.value - 28 },
    ],
  }));

  // Shadow style under character
  const shadowStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: charX.value - 8 },
      { translateY: charY.value - 4 },
    ],
  }));

  // Checkpoint positions on the trail
  const checkpoints = totalSteps > 1
    ? Array.from({ length: totalSteps }, (_, i) => {
        const t = i / (totalSteps - 1);
        return { t, x: trailX(t), y: trailY(t) };
      })
    : totalSteps === 1
      ? [{ t: 0, x: trailX(0), y: trailY(0) }]
      : [];

  const trailPath = buildTrailPath();

  return (
    <View style={styles.container}>
      {/* Static SVG layers */}
      <Svg width={W} height={H} style={StyleSheet.absoluteFillObject}>
        <Defs>
          <SvgGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.sky1} stopOpacity="1" />
            <Stop offset="1" stopColor={theme.sky2} stopOpacity="1" />
          </SvgGradient>
          <SvgGradient id="mtnLitG" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={theme.mtn4} stopOpacity="1" />
            <Stop offset="1" stopColor={theme.mtn2} stopOpacity="1" />
          </SvgGradient>
          <SvgGradient id="fadeBot" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.5" stopColor={theme.bg} stopOpacity="0" />
            <Stop offset="1" stopColor={theme.bg} stopOpacity="1" />
          </SvgGradient>
        </Defs>

        {/* Sky */}
        <Rect x={0} y={0} width={W} height={H} fill="url(#skyG)" />

        {/* Stars */}
        {theme.isDark && STARS.map((s, i) => (
          <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={theme.starColor} opacity={s.op} />
        ))}

        {/* Background mountains (depth layers) */}
        <Path d={mtnBg1} fill={theme.mtn1} opacity={0.65} />
        <Path d={mtnBg2} fill={theme.mtn2} opacity={0.55} />

        {/* Main mountain — lit right face */}
        <Path d={mtnMainFull} fill="url(#mtnLitG)" />

        {/* Shadow on left face */}
        <Path
          d={mtnShadowLeft + ` L${W * 0.03},${H} Z`}
          fill={theme.mtn1}
          opacity={0.55}
        />

        {/* Snow cap */}
        <Path d={snowCap} fill="rgba(255,255,255,0.88)" />
        {/* Snow highlight */}
        <Path
          d={`M${SUMMIT_X},${SUMMIT_Y} C${W*0.49},${H*0.10} ${W*0.51},${H*0.12} ${W*0.52},${H*0.14}`}
          stroke="rgba(255,255,255,0.55)"
          strokeWidth={1.5}
          fill="none"
          strokeLinecap="round"
        />

        {/* Trail — full dashed path */}
        <Path
          d={trailPath}
          stroke={theme.pathColor}
          strokeWidth={2.2}
          strokeDasharray="5,7"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.6}
        />

        {/* Checkpoints */}
        {checkpoints.map((cp, i) => {
          const done = i < completedSteps;
          const current = i === completedSteps;
          return (
            <G key={i}>
              {(done || current) && (
                <Circle
                  cx={cp.x}
                  cy={cp.y}
                  r={current ? 9 : 7}
                  fill={theme.accent}
                  opacity={0.18}
                />
              )}
              <Circle
                cx={cp.x}
                cy={cp.y}
                r={done ? 5 : current ? 5.5 : 4}
                fill={done ? theme.accent : theme.surface}
                stroke={done ? theme.accent : current ? theme.warm : theme.textTertiary}
                strokeWidth={1.5}
                opacity={done ? 1 : current ? 1 : 0.55}
              />
              {done && (
                <Path
                  d={`M${cp.x - 2.5},${cp.y} L${cp.x - 0.5},${cp.y + 2.5} L${cp.x + 3},${cp.y - 2.5}`}
                  stroke={theme.textOnAccent}
                  strokeWidth={1.5}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </G>
          );
        })}

        {/* Summit star / flag when complete */}
        {completedSteps > 0 && completedSteps === totalSteps && (
          <G>
            <Line
              x1={SUMMIT_X}
              y1={SUMMIT_Y - 14}
              x2={SUMMIT_X}
              y2={SUMMIT_Y - 4}
              stroke={theme.warm}
              strokeWidth={1.5}
            />
            <Path
              d={`M${SUMMIT_X},${SUMMIT_Y - 14} L${SUMMIT_X + 8},${SUMMIT_Y - 10} L${SUMMIT_X},${SUMMIT_Y - 6} Z`}
              fill={theme.warm}
            />
          </G>
        )}

        {/* Fade bottom overlay (blends into screen bg) */}
        <Rect x={0} y={H * 0.75} width={W} height={H * 0.25} fill="url(#fadeBot)" />
      </Svg>

      {/* Character shadow (absolute) */}
      <Reanimated.View style={[styles.charShadow, shadowStyle]}>
        <Svg width={16} height={5}>
          <Ellipse cx={8} cy={2.5} rx={6} ry={2} fill="rgba(0,0,0,0.35)" />
        </Svg>
      </Reanimated.View>

      {/* Character (absolute overlay) */}
      <Reanimated.View style={[styles.charWrap, charStyle]}>
        <Svg width={24} height={32} viewBox="0 0 24 32">
          {/* Backpack */}
          <Rect x={13} y={11} width={5} height={7} rx={2} fill={theme.warm} opacity={0.85} />
          {/* Body */}
          <Line x1={12} y1={11} x2={12} y2={22} stroke={theme.text} strokeWidth={2.2} strokeLinecap="round" />
          {/* Arms */}
          <Line x1={6} y1={14} x2={18} y2={14} stroke={theme.text} strokeWidth={2.2} strokeLinecap="round" />
          {/* Left leg */}
          <Line x1={12} y1={22} x2={7} y2={30} stroke={theme.text} strokeWidth={2.2} strokeLinecap="round" />
          {/* Right leg */}
          <Line x1={12} y1={22} x2={17} y2={30} stroke={theme.text} strokeWidth={2.2} strokeLinecap="round" />
          {/* Head */}
          <Circle cx={12} cy={6} r={5.5} fill={theme.warm} />
          {/* Face dot eyes */}
          <Circle cx={10} cy={5.5} r={0.9} fill={theme.bg} />
          <Circle cx={14} cy={5.5} r={0.9} fill={theme.bg} />
          {/* Smile */}
          <Path d="M9.5,8 Q12,10 14.5,8" stroke={theme.bg} strokeWidth={0.8} fill="none" strokeLinecap="round" />
        </Svg>
      </Reanimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: W,
    height: H,
  },
  charWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  charShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
