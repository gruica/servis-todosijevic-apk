import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.servistodosijevic.app',
  appName: 'Servis Todosijević',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    // Samo za razvoj - u produkciji ukloniti ovu opciju
    // url: 'http://192.168.1.100:5000', // Zameniti sa vašom lokalnom IP adresom
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