import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fortunego.app',
  appName: 'FortuneGo',
  webDir: 'dist',
  backgroundColor: '#164633',
  android: {
    backgroundColor: '#0a1f15',
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#164633',
      showSpinner: false,
    }
  }
};

export default config;
