export default ({ config }) => ({
  ...config,
  expo: {
    ...config?.expo,
    name: 'SkillPulse',
    slug: 'skillpulse',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/images/logo-Photoroom.png',
      resizeMode: 'contain',
      backgroundColor: '#F7F8FA',
    },
    ios: { supportsTablet: false },
    android: { usesCleartextTraffic: true },
    web: { favicon: './assets/images/logo-Photoroom.png' },
    plugins: [
      ['expo-router', { origin: 'https://replit.com/' }],
      'expo-font',
      'expo-web-browser',
    ],
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
    },
    experiments: {
      typedRoutes: true,
    },
  },
});
