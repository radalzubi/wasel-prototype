import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wasel.driver',
  appName: 'Wasel Driver',
  webDir: 'dist',
  server: {
    // In development only — remove this block for TestFlight builds
    // androidScheme: 'https',
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#000000',
    allowsInlineMediaPlayback: true,
  },
};

export default config;
