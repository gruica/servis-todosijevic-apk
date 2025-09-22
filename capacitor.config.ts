import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.servistodosijevic.app',
  appName: 'Servis Todosijević',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    // APK koristi Replit server za sve API pozive
    url: 'https://workspace.gruica.repl.co',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#1E293B",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      backgroundColor: "#1E293B",
      style: "DARK",
      overlaysWebView: false,
    },
  },
};

export default config;