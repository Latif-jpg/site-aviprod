// Minimal Service Worker for PWA
// Ce fichier permet à l'application d'être installable sur Android/iOS

self.addEventListener('install', (event) => {
    // Force l'activation immédiate
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Prend le contrôle des clients immédiatement
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Pour l'instant, on laisse passer toutes les requêtes (Network First)
    // On pourra ajouter du cache plus tard pour le mode hors-ligne
    // event.respondWith(fetch(event.request));
});