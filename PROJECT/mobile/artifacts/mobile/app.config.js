export default ({ config }) => ({
  ...config,
  expo: {
    ...config?.expo,
    name: 'NexaPath',
    slug: 'skillpulse',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'mobile',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    icon: './assets/images/nexapathicon.png',
    splash: {
      image: './assets/images/nexapathicon.png',
      resizeMode: 'contain',
      backgroundColor: '#03071A',
    },
    ios: { supportsTablet: false },
    android: { usesCleartextTraffic: true },
    web: { favicon: './assets/images/nexapathicon.png' },
    plugins: [
      ['expo-router', { origin: 'https://replit.com/' }],
      'expo-font',
      'expo-web-browser',
    ],
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      apiBaseUrl: process.env.EXPO_PUBLIC_API_URL,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
    experiments: {
      typedRoutes: true,
    },
  },
});
