# Fichier : `app.json`

## 1. Objectif et Création

Ce fichier est le cœur de la configuration de votre application **Expo**. Tandis que `package.json` gère les dépendances JavaScript, `app.json` configure tout ce qui concerne le "runtime" de l'application native elle-même, avant même que votre code JavaScript ne s'exécute.

Il permet de définir des métadonnées et des comportements pour les plateformes iOS, Android et Web à partir d'un seul endroit. C'est ici que l'on configure le nom de l'application, son icône, l'écran de démarrage (splash screen), les permissions natives, et bien plus encore.

## 2. Structure et Composants Clés

Le fichier est un objet JSON unique contenu dans une clé `expo`.

### Propriétés Générales
- `name`, `slug`, `version`: Identifiants de base de l'application. `slug` est utilisé dans les URLs de l'application Expo Go.
- `orientation`: Définit l'orientation par défaut de l'application (`portrait`).
- `icon`: Chemin vers l'icône de l'application.
- `scheme`: Le schéma d'URL utilisé pour les "deep links" (liens profonds).
- `userInterfaceStyle`: Gère le thème (clair/sombre), ici réglé sur `automatic` pour s'adapter au système.
- `splash`: Configure l'écran de démarrage qui s'affiche pendant que l'application se charge.
- `assetBundlePatterns`: Un glob pattern qui indique à Expo quels fichiers inclure dans le "bundle" de l'application. `**/*` inclut tous les fichiers.

### `ios` et `android`
Ces sections contiennent des configurations spécifiques à chaque plateforme.
- `supportsTablet` (iOS) : Autorise l'application à tourner sur iPad.
- `bundleIdentifier` (iOS) et `package` (Android) : L'identifiant unique de votre application sur les stores d'Apple et de Google.
- `infoPlist` (iOS) et `permissions` (Android) : **Très important**. C'est ici que l'on déclare les permissions natives que l'application va demander à l'utilisateur (accès à la caméra, à la galerie photo, etc.) et les messages qui seront affichés pour justifier cette demande.

### `web`
Configure le comportement de l'application lorsqu'elle est déployée en tant que site web (Progressive Web App).
- `bundler`: Utilise `metro`, le bundler de React Native.
- `output`: `static` indique de générer un site statique.
- `favicon`, `name`, `description`, etc. : Métadonnées pour le site web.

### `plugins`
C'est ici que l'on configure les bibliothèques natives qui nécessitent une modification de la configuration native sous-jacente.
- `expo-router`: Active le plugin pour la navigation basée sur les fichiers.
- `expo-image-picker`: Configure les messages de permission pour l'accès à la caméra et à la galerie, en lien avec les sections `ios` et `android`.

### `extra`
Une section pour stocker des constantes et des configurations personnalisées, comme l'ID de projet `eas` (Expo Application Services) pour les builds dans le cloud.

## 3. Fonctionnement Détaillé

Lorsque vous lancez une commande de build (ex: `expo prebuild` ou `eas build`), Expo lit ce fichier `app.json`. Il l'utilise comme un "modèle" pour générer dynamiquement les fichiers de configuration natifs pour chaque plateforme (`Info.plist` pour iOS, `AndroidManifest.xml` pour Android, etc.).

Par exemple, la configuration dans la section `plugins` pour `expo-image-picker` va automatiquement ajouter le code nécessaire dans les fichiers natifs pour gérer les permissions, vous évitant d'avoir à les modifier manuellement.

De même, les informations comme l'icône ou le splash screen sont utilisées pour placer les images aux bons endroits dans les projets natifs générés.

## 4. Liaisons et Dépendances

- **Fichiers importés** : Ce fichier n'importe rien, mais il référence des fichiers statiques, notamment les images pour l'icône et le splash screen (ex: `./assets/images/icon-prod.png`).
- **Fichiers où ce fichier est utilisé** :
    - Il est utilisé par toutes les commandes de l'interface en ligne de commande (CLI) d'Expo et d'EAS.
    - Il est la source de vérité pour la configuration de l'application à travers tout l'écosystème Expo.
    - Les plugins listés, comme `expo-router`, lisent également ce fichier pour leur propre configuration.
