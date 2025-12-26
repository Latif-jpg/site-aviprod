# Fichier : `index.ts`

## 1. Objectif

Ce fichier est le **point d'entrée principal** de l'application Aviprod. Son unique rôle est d'importer et d'exécuter la logique de démarrage du framework de navigation `expo-router`.

Dans un projet Expo avec `expo-router`, ce fichier est conventionnellement le premier code de l'application à être exécuté. Il initialise le système de routage basé sur les fichiers avant même que le premier écran ne soit affiché.

## 2. Structure

Le fichier est extrêmement simple et ne contient qu'une seule ligne de code :

```typescript
import 'expo-router/entry';
```

Il s'agit d'un "import d'effet de bord" (`side-effect import`). Cela signifie qu'on n'importe aucune valeur ou fonction spécifique de ce fichier, mais que le simple fait de l'importer exécute du code d'initialisation contenu dans le module `expo-router/entry`.

## 3. Fonctionnement

1.  Au démarrage de l'application (sur mobile ou web), le bundler (Metro) charge ce fichier `index.ts` car il est défini comme le point d'entrée (`main`) dans `package.json`.
2.  L'instruction `import 'expo-router/entry'` est exécutée.
3.  Le code d'initialisation d'Expo Router prend le contrôle. Il analyse l'arborescence de votre dossier `app/`, identifie les écrans, les layouts et les routes, et prépare le contexte de navigation pour toute l'application.
4.  Une fois le routeur initialisé, il affiche le premier écran pertinent, généralement `app/index.tsx` ou `app/_layout.tsx`.

## 4. Liaisons

### Dépendances (Fichiers importés)
- **`expo-router/entry`**: C'est sa seule et unique dépendance. Il importe le point d'entrée du routeur pour démarrer la navigation.

### Utilisé par
- **`package.json`**: Ce fichier est désigné comme le point d'entrée principal de toute l'application via la directive `"main": "index.ts"`.
