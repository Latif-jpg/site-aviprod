# Fichier : `app/_layout.tsx`

## 1. Objectif

Ce fichier est le **Layout Racine** de l'application, une convention d'**Expo Router**. Il agit comme le composant parent de tous les autres écrans et layouts. Son rôle est fondamental pour plusieurs raisons :

- **Fournir des Contextes Globaux** : Il enveloppe toute l'application dans des "Providers" de contexte (Thème, Abonnements, Intelligence Artificielle), rendant ces états et fonctions accessibles partout.
- **Gérer l'Authentification et la Redirection** : Il contient la logique qui protège les routes et redirige les utilisateurs en fonction de leur statut de connexion.
- **Définir la Navigation Principale** : Il configure le navigateur principal (ici, un `Stack` de `expo-router`) et déclare tous les écrans de l'application.
- **Gérer les Erreurs Globales** : Il implémente un `ErrorBoundary` pour capturer les erreurs de rendu et un écran d'erreur pour les problèmes de connexion à la base de données.

En bref, c'est le véritable chef d'orchestre de l'interface et de la logique de session de l'application.

## 2. Structure

Le fichier est intelligemment divisé en deux composants principaux pour séparer les préoccupations :

- **`RootLayout` (Composant exporté par défaut)**
    - Son unique rôle est d'envelopper l'application dans tous les **Providers de contexte** et les composants de haut niveau.
    - **`ErrorBoundary`**: Capture les erreurs JavaScript dans l'arbre de composants en dessous de lui et affiche une interface de secours.
    - **`ThemeProvider`**: Fournit le contexte du thème (clair/sombre) à toute l'application.
    - **`SubscriptionProvider`**: Gère l'état de l'abonnement de l'utilisateur.
    - **`UniversalIntelligenceProvider`**: Fournit un contexte pour les agents d'IA.
    - **`GestureHandlerRootView`**: Composant racine requis pour que la bibliothèque `react-native-gesture-handler` fonctionne correctement.
    - **`Toast`**: Affiche des notifications "toast" globales.

- **`RootLayoutContent` (Composant interne)**
    - C'est ici que se trouve toute la logique de l'application.
    - **Hooks**: Utilise des hooks essentiels :
        - `useAuth()`: Pour obtenir l'état de l'utilisateur (`user`) et l'état de chargement de l'authentification.
        - `useSegments()`, `usePathname()`, `useRouter()`: Hooks d'Expo Router pour connaître la route actuelle et naviguer.
    - **Gestion d'état (`useState`)**:
        - `connectionError`: Pour stocker les messages d'erreur de connexion à Supabase.
        - `isProjectPaused`: Pour gérer le cas spécifique où le projet Supabase est en pause.
    - **Logique d'affichage conditionnel**:
        - Affiche un écran de chargement (`ActivityIndicator`) si l'authentification est en cours.
        - Affiche un écran d'erreur détaillé si `connectionError` est défini.
        - Affiche le navigateur `Stack` si tout va bien.
    - **Navigateur `Stack`**:
        - C'est le conteneur principal des écrans. `headerShown: false` est défini par défaut, ce qui signifie que chaque écran est responsable de son propre en-tête.
        - Chaque `<Stack.Screen name="..." />` déclare une route de l'application, la rendant accessible à la navigation.

## 3. Fonctionnement Détaillé

1.  **Initialisation**: Au démarrage, `RootLayout` est rendu. Il met en place tous les contextes.

2.  **Contenu et Authentification**: `RootLayoutContent` est ensuite rendu.
    - Le hook `useAuth` est appelé. Il tente de récupérer la session utilisateur depuis Supabase.
    - Pendant ce temps, `authLoading` est `true`, et un écran de chargement est affiché.

3.  **Logique de Redirection**:
    - Une fois `authLoading` passé à `false`, un `useEffect` s'exécute.
    - **Cas 1 (Utilisateur connecté)**: Si `user` existe et que l'utilisateur se trouve sur un écran d'authentification (`/auth` ou `/welcome`), il est automatiquement redirigé vers le tableau de bord (`/dashboard`).
    - **Cas 2 (Utilisateur non connecté)**: Si `user` n'existe pas et que l'utilisateur tente d'accéder à une page protégée, il est redirigé vers l'écran d'authentification (`/auth`).

4.  **Gestion du bouton "Retour" (Android)**: Un `useEffect` spécifique à Android intercepte le bouton "Retour" physique. S'il est sur le tableau de bord, l'application se ferme. Sinon, il est redirigé vers le tableau de bord, empêchant des retours inattendus.

5.  **Affichage Final**: Si aucune erreur n'est détectée et que l'authentification est terminée, le navigateur `Stack` est rendu, affichant l'écran approprié en fonction de l'URL et du statut de l'utilisateur.

## 4. Liaisons

### Dépendances (Fichiers importés)
- **`expo-router`**: Fournit les composants de navigation (`Stack`, `router`) et les hooks (`useSegments`, etc.).
- **`../config`**: Pour l'instance `supabase` et les fonctions de gestion d'erreurs.
- **`../hooks/useAuth`**: Le hook personnalisé qui gère toute la logique d'authentification.
- **`../components/ErrorBoundary`**: Le composant qui empêche l'application de planter en cas d'erreur de rendu.
- **`../contexts/*`**: Tous les fournisseurs de contexte globaux (`ThemeProvider`, `SubscriptionProvider`, etc.).
- **`react-native-gesture-handler`**: Pour le `GestureHandlerRootView`.
- **`react-native-toast-message`**: Pour afficher les notifications.

### Utilisé par
- En tant que layout racine (`_layout.tsx`), ce fichier n'est pas "utilisé par" un autre composant. C'est **Expo Router** qui l'utilise comme point de départ pour construire l'arbre de l'interface utilisateur de toute l'application. Il enveloppe tous les autres écrans et layouts.
