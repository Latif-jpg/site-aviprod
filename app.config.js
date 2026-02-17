import 'dotenv/config';

export default {
  expo: {
    name: "AviprodApp",
    slug: "aviprod",
    version: "1.2.3",
    orientation: "portrait",
    icon: "./assets/images/icon-prod.png",
    scheme: "aviprodapp",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/images/icon-prod.png",
      resizeMode: "cover",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.aviprodapp.app",
      infoPlist: {
        NSCameraUsageDescription: "Cette application a besoin d'accéder à votre caméra pour prendre des photos des volailles lors de l'analyse de santé IA.",
        NSPhotoLibraryUsageDescription: "Cette application a besoin d'accéder à votre galerie pour sélectionner des photos des volailles lors de l'analyse de santé IA.",
        NSPhotoLibraryAddUsageDescription: "Cette application a besoin d'accéder à votre galerie pour sauvegarder des photos.",
        "ITSAppUsesNonExemptEncryption": false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon-prod.png",
        backgroundColor: "#FFFFFF"
      },
      package: process.env.APP_ID || "com.aviprodapp.app",
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || "./google-services.json", // INDISPENSABLE pour Firebase/Notifications
      permissions: [
        "android.permission.CAMERA",
        "android.permission.POST_NOTIFICATIONS",
        "com.google.android.gms.permission.AD_ID"
      ],
      versionCode: 28
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/icon-prod.png",
      build: {
        babel: {
          include: [
            "@expo/vector-icons",
            "expo-font"
          ]
        }
      },
      name: "AviprodWeb",
      shortName: "Aviprod",
      lang: "fr",
      startUrl: "/",
      display: "standalone",
      backgroundColor: "#ffffff",
      themeColor: "#FF8C00",
      description: "Application de gestion d'élevage avicole"
    },
    plugins: [
      [
        "expo-build-properties",
        {
          "android": {
            "compileSdkVersion": 35,
            "targetSdkVersion": 35
          }
        }
      ],
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#ffffff",
          "image": "./assets/images/icon-prod.png",
          "dark": {
            "image": "./assets/images/icon-prod.png",
            "backgroundColor": "#ffffff"
          },
          "imageWidth": 200,
          "imageResizeMode": "cover"
        }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/images/icone_notif.png",
          "color": "#ffffff",
          "defaultChannel": {
            "name": "general",
            "importance": "max",
            "vibrationPattern": [0, 250, 250, 250],
            "lightColor": "#FF231F7C"
          }
        }
      ],
      "expo-router",
      [
        "expo-image-picker",
        {
          "photosPermission": "Cette application a besoin d'accéder à votre galerie pour sélectionner des photos des volailles lors de l'analyse de santé IA.",
          "cameraPermission": "Cette application a besoin d'accéder à votre caméra pour prendre des photos des volailles lors de l'analyse de santé IA."
        }
      ],
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-5111525667900751~1325867913",
          "iosAppId": "ca-app-pub-5111525667900751~1325867913"
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      eas: {
        "projectId": "3a17df33-3671-47b0-a0cd-55c16420e23a"
      }
    },
    updates: {
      url: "https://u.expo.dev/3a17df33-3671-47b0-a0cd-55c16420e23a",
      enabled: true,
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 0
    },
    runtimeVersion: "1.2.3"
  },
};
