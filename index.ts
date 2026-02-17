// --- DIAGNOSTIC DU DÉMARRAGE ---
if (typeof window !== 'undefined') {
    /* 
    window.onerror = function (message, source, lineno, colno, error) {
        alert('CRITICAL ERROR: ' + message + '\nAt: ' + source + ':' + lineno);
        console.error('CRITICAL ERROR:', error);
    };
    window.onunhandledrejection = function (event) {
        alert('UNHANDLED PROMISE: ' + event.reason);
        console.error('UNHANDLED PROMISE:', event.reason);
    };
    */
    console.log('✅ Diagnostic handlers initialisés (console uniquement)');
}

import 'react-native-gesture-handler'; // INDISPENSABLE pour éviter les crashs de navigation/Drawer sur APK
import './polyfills'; // Import polyfills first
import 'expo-router/entry';

// --- ENREGISTREMENT PWA (Service Worker) ---
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('✅ Service Worker enregistré avec succès:', registration.scope);
            })
            .catch((error) => {
                console.log('❌ Échec enregistrement Service Worker:', error);
            });
    });
}
