export default ({ config }) => ({
  ...config,
  expo: {
    ...config?.expo,
    name: 'NexaPath',
    slug: 'skillpulse',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/images/logo-Photoroom.png',
      resizeMode: 'contain',
      backgroundColor: '#03071A',
    },
    ios: { supportsTablet: false },
    android: { usesCleartextTraffic: true },
    web: { favicon: './assets/images/logo-Photoroom.png' },
    plugins: [
      ['expo-router', { origin: 'https://replit.com/' }],
      'expo-font',
      'expo-web-browser',
      [
        '@rnmapbox/maps',
        {
          RNMapboxMapsDownloadToken: process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN,
        },
      ],
    ],
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      apiBaseUrl: process.env.EXPO_PUBLIC_API_URL,
      mapboxAccessToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN,
    },
    experiments: {
      typedRoutes: true,
    },
  },
});
