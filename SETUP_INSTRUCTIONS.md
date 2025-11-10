
# AviprodApp - Instructions de Configuration

## 🚨 Résolution de l'Erreur Ngrok (err_ngrok)

Si vous rencontrez l'erreur `err_ngrok`, cela signifie que le tunnel ngrok n'a pas pu être établi. Voici comment résoudre ce problème:

### Solutions Recommandées

#### Solution 1: Utiliser le Mode LAN (Recommandé)
Le mode LAN est plus stable et ne nécessite pas de tunnel internet.

```bash
npm run dev:lan
```

**Prérequis:**
- Votre ordinateur et votre téléphone doivent être sur le même réseau Wi-Fi
- Aucun pare-feu ne doit bloquer la connexion

#### Solution 2: Utiliser le Mode Par Défaut
Le mode par défaut détecte automatiquement la meilleure méthode de connexion.

```bash
npm run dev
```

#### Solution 3: Réessayer le Tunnel
Si vous avez absolument besoin du tunnel (par exemple, pour tester sur un réseau différent):

```bash
npm run dev:tunnel
```

**Note:** Le tunnel peut échouer pour plusieurs raisons:
- Connexion Internet instable
- Pare-feu bloquant ngrok
- VPN actif
- Limite de taux ngrok atteinte

#### Solution 4: Mode Localhost
Pour le développement web uniquement:

```bash
npm run dev:localhost
```

### Vérification de la Connexion

L'application inclut maintenant plusieurs outils de diagnostic:

1. **Écran de Vérification de Connexion** (`/connection-check`)
   - Vérifie la connexion Internet
   - Vérifie la connexion Supabase
   - Vérifie l'état du projet

2. **Écran de Diagnostics** (`/diagnostics`)
   - Affiche les informations détaillées du système
   - Montre les informations réseau
   - Fournit les commandes utiles

3. **Écran d'Aide Ngrok** (`/ngrok-help`)
   - Guide étape par étape pour résoudre les problèmes ngrok
   - Explications détaillées de chaque solution

### Accès aux Outils de Diagnostic

Depuis l'application, vous pouvez accéder aux outils de diagnostic via:
- Le menu de profil
- Les paramètres
- Directement via les routes: `/connection-check`, `/diagnostics`, `/ngrok-help`

## 📱 Configuration de l'Application

### Prérequis

1. **Node.js** (version 18 ou supérieure)
2. **Expo CLI** installé globalement
3. **Application Expo Go** sur votre téléphone (iOS ou Android)
4. **Compte Supabase** avec un projet actif

### Installation

```bash
# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev
```

### Configuration Supabase

1. Créez un projet sur [supabase.com](https://supabase.com)
2. Copiez l'URL du projet et la clé API anonyme
3. Configurez-les dans `app/integrations/supabase/client.ts`

**Important:** Assurez-vous que votre projet Supabase n'est pas en pause. Si c'est le cas:
1. Allez sur supabase.com
2. Sélectionnez votre projet
3. Cliquez sur "Restore project"

### Configuration de l'API Gemini (pour l'analyse IA)

1. Obtenez une clé API Gemini depuis [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Configurez-la dans l'application via Paramètres > Configuration IA

## 🔧 Commandes Disponibles

```bash
# Développement
npm run dev              # Mode par défaut (détection automatique)
npm run dev:lan          # Mode LAN (recommandé)
npm run dev:tunnel       # Mode tunnel (ngrok)
npm run dev:localhost    # Mode localhost

# Plateformes spécifiques
npm run android          # Ouvrir sur Android
npm run ios              # Ouvrir sur iOS
npm run web              # Ouvrir dans le navigateur

# Build
npm run build:web        # Build pour le web
npm run build:android    # Préparer pour Android

# Qualité du code
npm run lint             # Vérifier le code
```

## 🐛 Dépannage

### Écran Blanc

Si vous voyez un écran blanc:
1. Vérifiez la console pour les erreurs
2. Utilisez l'écran de vérification de connexion
3. Assurez-vous que Supabase est configuré correctement
4. Vérifiez que votre projet Supabase n'est pas en pause

### Erreurs de Connexion

1. Vérifiez votre connexion Internet
2. Essayez un mode de connexion différent (LAN au lieu de tunnel)
3. Désactivez temporairement votre VPN
4. Vérifiez les paramètres de votre pare-feu

### Erreurs Supabase

1. Vérifiez que votre projet n'est pas en pause
2. Vérifiez que les tables nécessaires existent
3. Vérifiez les politiques RLS (Row Level Security)
4. Consultez les logs Supabase pour plus de détails

## 📚 Ressources

- [Documentation Expo](https://docs.expo.dev/)
- [Documentation Supabase](https://supabase.com/docs)
- [Documentation React Native](https://reactnative.dev/)
- [Expo Go App](https://expo.dev/client)

## 🆘 Support

Si vous continuez à rencontrer des problèmes:
1. Consultez l'écran de diagnostics dans l'application
2. Vérifiez les logs de la console
3. Assurez-vous que toutes les dépendances sont installées
4. Essayez de supprimer `node_modules` et de réinstaller: `rm -rf node_modules && npm install`

## 🔐 Sécurité

- Ne commitez jamais vos clés API dans le code
- Utilisez des variables d'environnement pour les secrets
- Activez RLS sur toutes les tables Supabase
- Utilisez HTTPS en production

## 📝 Notes Importantes

1. **Mode Tunnel vs LAN**: Le mode LAN est généralement plus stable et rapide pour le développement local
2. **Projet Supabase en Pause**: Les projets gratuits Supabase se mettent en pause après une période d'inactivité
3. **Permissions**: Assurez-vous d'accorder les permissions caméra/galerie sur votre appareil
4. **Réseau**: Pour le mode LAN, votre ordinateur et téléphone doivent être sur le même réseau Wi-Fi
