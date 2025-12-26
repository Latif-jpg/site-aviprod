# Fichier : `package.json`

## 1. Objectif et Création

Ce fichier est le manifeste du projet Aviprod. Il est au cœur de tout projet Node.js et remplit plusieurs rôles critiques :
- **Identification** : Il définit le nom (`natively`), la version (`1.0.1`) et le caractère privé du projet.
- **Dépendances** : Il liste toutes les bibliothèques externes nécessaires au bon fonctionnement de l'application (`dependencies`) et celles requises uniquement pour le développement (`devDependencies`).
- **Scripts** : Il contient des commandes prédéfinies pour automatiser des tâches courantes comme le lancement de l'application, le build, ou le linting.
- **Point d'Entrée** : Il spécifie le fichier principal de l'application (`"main": "index.ts"`).

En résumé, `package.json` est la carte d'identité technique du projet, indispensable pour sa gestion, son installation et son exécution.

## 2. Structure et Composants Clés

Le fichier est structuré en plusieurs sections JSON :

### `scripts`
Cette section contient des alias pour des commandes CLI.
- `dev` et ses variantes (`:tunnel`, `:lan`, `:localhost`) : Lancent le serveur de développement Expo dans différents modes réseau.
- `android`, `ios`, `web` : Lancent l'application sur les plateformes respectives.
- `build:web`, `build:android` : Commandes pour pré-compiler ou exporter l'application pour le web et Android.
- `lint` : Exécute l'outil ESLint pour analyser le code et trouver des erreurs de style ou de syntaxe.

### `dependencies`
C'est la liste des bibliothèques qui sont incluses dans l'application finale. On y trouve des dépendances majeures comme :
- `expo` : Le framework principal pour le développement de l'application.
- `react`, `react-native` : Les bibliothèques fondamentales pour la construction d'interfaces utilisateur.
- `@react-navigation/*` : La suite d'outils pour gérer la navigation entre les écrans.
- `@supabase/supabase-js` : Le client JavaScript pour interagir avec la base de données et les services Supabase.
- `expo-router` : Pour la gestion des routes de l'application.
- De nombreux modules `expo-*` pour accéder aux fonctionnalités natives (système de fichiers, capteurs, etc.).

### `devDependencies`
Ces dépendances ne sont utilisées que pendant la phase de développement et ne sont pas incluses dans le build final.
- `typescript` : Pour l'utilisation du langage TypeScript.
- `eslint` et ses plugins : Pour le "linting", c'est-à-dire l'analyse statique du code pour garantir sa qualité et sa cohérence.
- `@types/react` : Contient les définitions de types TypeScript pour React.

### `resolutions`
Cette section est utilisée pour forcer une version spécifique d'une sous-dépendance, ici `@expo/prebuild-config`, afin d'éviter des conflits ou des bugs.

## 3. Fonctionnement Détaillé

Lorsqu'un développeur rejoint le projet, il exécute la commande `npm install` (ou `yarn install`). `npm` lit ce fichier `package.json` et télécharge toutes les bibliothèques listées dans `dependencies` et `devDependencies` dans le dossier `node_modules`.

Quand une commande comme `npm run dev` est lancée, le gestionnaire de paquets cherche le script `dev` dans la section `scripts` et exécute la commande associée (`expo start --port 8082 --clear`).

Ce fichier est donc le point de départ de toute interaction de développement avec le projet.

## 4. Liaisons et Dépendances

- **Fichiers importés** : Ce fichier n'importe aucun autre fichier. C'est lui qui est lu par les outils de l'écosystème Node.js (npm, yarn, npx).
- **Fichiers où ce fichier est utilisé** :
    - Il est implicitement utilisé par tout l'environnement de développement Node.js.
    - Le fichier `workbox-config.js` est mentionné dans le script `build:web`, indiquant une liaison pour la configuration du Service Worker pour la version web.
    - Le fichier `index.ts` est déclaré comme point d'entrée principal de l'application.
