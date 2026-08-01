import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.brownglobal.studio",
  appName: "Studio",
  webDir: "dist",
  ios: { contentInset: "automatic" },
  android: { allowMixedContent: false },
  plugins: {
    SplashScreen: { launchShowDuration: 800, launchAutoHide: false, backgroundColor: "#2563eb", showSpinner: false },
    StatusBar: { style: "LIGHT", backgroundColor: "#2563eb" },
    Keyboard: { resize: "body", resizeOnFullScreen: true },
  },
};

export default config;
