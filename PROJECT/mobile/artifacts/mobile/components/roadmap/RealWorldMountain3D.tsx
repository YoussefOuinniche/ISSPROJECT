'use no memo';

import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import Mapbox from '@rnmapbox/maps';

export interface CheckpointDef {
  id: string;
  title: string;
  status: 'locked' | 'available' | 'in_progress' | 'completed' | 'skipped';
  difficulty?: number;
}

type ViewMode = 'overview' | 'focused';
type Position = [number, number];
type LineFeature = {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: { type: 'LineString'; coordinates: Position[] };
};
type PointFeature = {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: { type: 'Point'; coordinates: Position };
};
type FeatureCollection<T extends LineFeature | PointFeature> = {
  type: 'FeatureCollection';
  features: T[];
};

interface Props {
  steps: CheckpointDef[];
  completedSteps: number;
  seed?: number;
  scaleBoost?: number;
  viewMode?: ViewMode;
  focusedStepIndex?: number;
  onStepFocus?: (index: number) => void;
  onExitFocus?: () => void;
}

type MountainRoute = {
  id: string;
  name: string;
  summit: string;
  center: Position;
  overviewZoom: number;
  focusZoom: number;
  pitch: number;
  heading: number;
  line: Position[];
};

const SATELLITE_STYLE = 'mapbox://styles/mapbox/satellite-streets-v12';
const DEM_SOURCE_ID = 'mapbox-dem';
const DEM_TILESET_URL = 'mapbox://mapbox.mapbox-terrain-dem-v1';

const REAL_MOUNTAIN_ROUTES: MountainRoute[] = [
  {
    id: 'matterhorn-hornli',
    name: 'Matterhorn',
    summit: 'Hornli ridge',
    center: [7.6642, 45.9763],
    overviewZoom: 13.2,
    focusZoom: 15.1,
    pitch: 67,
    heading: 28,
    line: [
      [7.7107, 46.0191],
      [7.7034, 46.0102],
      [7.6958, 46.0027],
      [7.6886, 45.9954],
      [7.6812, 45.9894],
      [7.6744, 45.9835],
      [7.6686, 45.9789],
      [7.6629, 45.9764],
      [7.6586, 45.9761],
    ],
  },
  {
    id: 'everest-south-col',
    name: 'Everest',
    summit: 'South Col route',
    center: [86.8870, 27.9881],
    overviewZoom: 12.1,
    focusZoom: 14.4,
    pitch: 68,
    heading: 18,
    line: [
      [86.8529, 27.9567],
      [86.8616, 27.9633],
      [86.8738, 27.9707],
      [86.8857, 27.9760],
      [86.8954, 27.9818],
      [86.9074, 27.9855],
      [86.9185, 27.9880],
      [86.9246, 27.9881],
    ],
  },
  {
    id: 'kilimanjaro-machame',
    name: 'Kilimanjaro',
    summit: 'Machame approach',
    center: [37.3556, -3.0674],
    overviewZoom: 11.3,
    focusZoom: 13.8,
    pitch: 62,
    heading: 320,
    line: [
      [37.2263, -3.1833],
      [37.2558, -3.1507],
      [37.2799, -3.1231],
      [37.3081, -3.0976],
      [37.3378, -3.0775],
      [37.3556, -3.0674],
      [37.3628, -3.0648],
    ],
  },
  {
    id: 'mont-blanc-gouter',
    name: 'Mont Blanc',
    summit: 'Gouter route',
    center: [6.8649, 45.8326],
    overviewZoom: 12.2,
    focusZoom: 14.7,
    pitch: 65,
    heading: 42,
    line: [
      [6.7595, 45.8906],
      [6.7818, 45.8768],
      [6.8018, 45.8620],
      [6.8222, 45.8481],
      [6.8468, 45.8381],
      [6.8649, 45.8326],
      [6.8734, 45.8322],
    ],
  },
  {
    id: 'fuji-yoshida',
    name: 'Mount Fuji',
    summit: 'Yoshida trail',
    center: [138.7274, 35.3606],
    overviewZoom: 12.4,
    focusZoom: 14.9,
    pitch: 63,
    heading: 204,
    line: [
      [138.7328, 35.3948],
      [138.7319, 35.3867],
      [138.7308, 35.3790],
      [138.7293, 35.3710],
      [138.7278, 35.3651],
      [138.7274, 35.3606],
      [138.7282, 35.3577],
    ],
  },
];

function getMapboxToken() {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const fromExtra = typeof extra?.mapboxAccessToken === 'string' ? extra.mapboxAccessToken : '';
  return process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || fromExtra;
}

function routeFor(seed: number | undefined, stepCount: number) {
  const safeSeed = Math.abs(seed ?? stepCount * 977) || stepCount || 1;
  return REAL_MOUNTAIN_ROUTES[safeSeed % REAL_MOUNTAIN_ROUTES.length];
}

function pointDistance(a: Position, b: Position) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return Math.sqrt(dx * dx + dy * dy);
}

function sampleLine(line: Position[], count: number): Position[] {
  if (count <= 0) return [];
  if (count === 1) return [line[line.length - 1]];

  const segmentLengths = line.slice(0, -1).map((point, index) => pointDistance(point, line[index + 1]));
  const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0);

  return Array.from({ length: count }, (_, index) => {
    const target = (index / (count - 1)) * totalLength;
    let walked = 0;

    for (let segmentIndex = 0; segmentIndex < segmentLengths.length; segmentIndex += 1) {
      const segmentLength = segmentLengths[segmentIndex];
      if (walked + segmentLength >= target) {
        const t = segmentLength === 0 ? 0 : (target - walked) / segmentLength;
        const a = line[segmentIndex];
        const b = line[segmentIndex + 1];
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] as Position;
      }
      walked += segmentLength;
    }

    return line[line.length - 1];
  });
}

function toLineFeature(id: string, coordinates: Position[], properties: Record<string, unknown> = {}): FeatureCollection<LineFeature> {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { id, ...properties },
        geometry: { type: 'LineString', coordinates },
      },
    ],
  };
}

function checkpointFeatures(
  steps: CheckpointDef[],
  coordinates: Position[],
  completedSteps: number,
  focusedStepIndex: number,
): FeatureCollection<PointFeature> {
  return {
    type: 'FeatureCollection',
    features: coordinates.map((coordinate, index) => {
      const step = steps[index];
      const done = index < completedSteps;
      const current = index === completedSteps;
      return {
        type: 'Feature',
        properties: {
          stepIndex: index,
          title: step?.title ?? `Step ${index + 1}`,
          status: step?.status ?? 'locked',
          done,
          current,
          selected: index === focusedStepIndex,
          color: done ? '#2ee66b' : current ? '#f8c84a' : '#dbe7f1',
        },
        geometry: { type: 'Point', coordinates: coordinate },
      };
    }),
  };
}

export function RealWorldMountain3D({
  steps,
  completedSteps,
  seed,
  viewMode = 'overview',
  focusedStepIndex = -1,
  onStepFocus,
}: Props) {
  const mapboxToken = getMapboxToken();
  const route = useMemo(() => routeFor(seed, steps.length), [seed, steps.length]);
  const checkpoints = useMemo(() => sampleLine(route.line, steps.length), [route, steps.length]);
  const activeIndex = Math.max(0, Math.min(focusedStepIndex >= 0 ? focusedStepIndex : completedSteps, checkpoints.length - 1));
  const activeCoordinate = checkpoints[activeIndex] ?? route.center;

  const fullRoute = useMemo(() => toLineFeature('full-route', route.line, { routeName: route.name }), [route]);
  const completedRoute = useMemo(
    () => toLineFeature('completed-route', checkpoints.slice(0, Math.min(completedSteps + 1, checkpoints.length)), { routeName: route.name }),
    [checkpoints, completedSteps, route.name],
  );
  const pointData = useMemo(
    () => checkpointFeatures(steps, checkpoints, completedSteps, activeIndex),
    [steps, checkpoints, completedSteps, activeIndex],
  );

  useEffect(() => {
    if (mapboxToken) Mapbox.setAccessToken(mapboxToken);
  }, [mapboxToken]);

  if (!mapboxToken) {
    return (
      <View style={styles.missingToken}>
        <View style={styles.missingTokenPanel}>
          <Text style={styles.missingTokenEyebrow}>MAPBOX REQUIRED</Text>
          <Text style={styles.missingTokenTitle}>Real terrain is ready.</Text>
          <Text style={styles.missingTokenText}>
            Add EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to stream DEM terrain and satellite imagery.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <Mapbox.MapView
        style={StyleSheet.absoluteFill}
        styleURL={SATELLITE_STYLE}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={false}
        scaleBarEnabled={false}
        rotateEnabled
        pitchEnabled
      >
        <Mapbox.Camera
          centerCoordinate={viewMode === 'focused' ? activeCoordinate : route.center}
          zoomLevel={viewMode === 'focused' ? route.focusZoom : route.overviewZoom}
          pitch={viewMode === 'focused' ? 72 : route.pitch}
          heading={route.heading}
          animationMode="flyTo"
          animationDuration={850}
        />

        <Mapbox.RasterDemSource id={DEM_SOURCE_ID} url={DEM_TILESET_URL} tileSize={514} />
        <Mapbox.Terrain sourceID={DEM_SOURCE_ID} style={{ exaggeration: 1.35 }} />
        <Mapbox.Atmosphere style={{ color: '#b8d8ff', highColor: '#0c1e36', spaceColor: '#06101d' }} />

        <Mapbox.ShapeSource id="skillbridge-route-full" shape={fullRoute as any}>
          <Mapbox.LineLayer
            id="skillbridge-route-full-casing"
            style={{
              lineColor: '#08111f',
              lineOpacity: 0.82,
              lineWidth: 9,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
          <Mapbox.LineLayer
            id="skillbridge-route-full-line"
            style={{
              lineColor: '#e8f4ff',
              lineOpacity: 0.76,
              lineWidth: 4,
              lineDasharray: [1.2, 1.1],
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </Mapbox.ShapeSource>

        {completedRoute.features[0]?.geometry.coordinates.length >= 2 ? (
          <Mapbox.ShapeSource id="skillbridge-route-completed" shape={completedRoute as any}>
            <Mapbox.LineLayer
              id="skillbridge-route-completed-glow"
              style={{
                lineColor: '#28e071',
                lineOpacity: 0.38,
                lineWidth: 13,
                lineBlur: 4,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            <Mapbox.LineLayer
              id="skillbridge-route-completed-line"
              style={{
                lineColor: '#2ee66b',
                lineOpacity: 0.98,
                lineWidth: 5,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        ) : null}

        <Mapbox.ShapeSource
          id="skillbridge-checkpoints"
          shape={pointData as any}
          hitbox={{ width: 48, height: 48 }}
          onPress={(event) => {
            const index = Number(event.features?.[0]?.properties?.stepIndex);
            if (Number.isFinite(index)) onStepFocus?.(index);
          }}
        >
          <Mapbox.CircleLayer
            id="skillbridge-checkpoint-halo"
            style={{
              circleColor: ['get', 'color'],
              circleOpacity: ['case', ['get', 'selected'], 0.34, ['get', 'current'], 0.28, 0.13],
              circleRadius: ['case', ['get', 'selected'], 18, ['get', 'current'], 15, 11],
              circleBlur: 0.25,
            } as any}
          />
          <Mapbox.CircleLayer
            id="skillbridge-checkpoint-dot"
            style={{
              circleColor: ['get', 'color'],
              circleStrokeColor: '#ffffff',
              circleStrokeWidth: ['case', ['get', 'selected'], 3.5, 2],
              circleRadius: ['case', ['get', 'selected'], 8, ['get', 'current'], 7, ['get', 'done'], 6, 5],
              circleOpacity: ['case', ['==', ['get', 'status'], 'locked'], 0.58, 1],
            } as any}
          />
        </Mapbox.ShapeSource>
      </Mapbox.MapView>

      <Pressable
        style={styles.routeBadge}
        onPress={() => onStepFocus?.(activeIndex)}
        accessibilityLabel={`Focus ${route.name} ${route.summit}`}
      >
        <Text style={styles.routeBadgeKicker}>{route.name.toUpperCase()}</Text>
        <Text style={styles.routeBadgeTitle}>{route.summit}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  routeBadge: {
    position: 'absolute',
    top: 118,
    right: 16,
    maxWidth: 156,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(5,12,22,0.48)',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  routeBadgeKicker: {
    color: 'rgba(255,255,255,0.56)',
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.2,
  },
  routeBadgeTitle: {
    marginTop: 2,
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Inter_700Bold',
  },
  missingToken: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#08111f',
    padding: 24,
  },
  missingTokenPanel: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 18,
  },
  missingTokenEyebrow: {
    color: '#f8c84a',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.4,
  },
  missingTokenTitle: {
    marginTop: 8,
    color: '#ffffff',
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
  missingTokenText: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Inter_500Medium',
  },
});
