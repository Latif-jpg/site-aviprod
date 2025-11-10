# 🛠️ Guide de Maintenance - AviprodApp

## Vue d'ensemble

AviprodApp est une application React Native développée avec Expo pour la gestion d'élevages avicoles. Cette application utilise Supabase comme backend, intègre des fonctionnalités d'IA avec Gemini, et comprend un marketplace intégré.

**Version actuelle:** 1.0.1
**Technologies principales:** React Native, Expo, Supabase, TypeScript, IA Gemini

---

## 📋 Table des Matières

1. [Maintenance Quotidienne](#maintenance-quotidienne)
2. [Mises à Jour et Mises à Niveau](#mises-à-jour-et-mises-à-niveau)
3. [Monitoring et Surveillance](#monitoring-et-surveillance)
4. [Sécurité](#sécurité)
5. [Performance](#performance)
6. [Base de Données](#base-de-données)
7. [Dépendances](#dépendances)
8. [Déploiement](#déploiement)
9. [Sauvegarde et Récupération](#sauvegarde-et-récupération)
10. [Dépannage](#dépannage)
11. [Procédures d'Urgence](#procédures-durgence)

---

## 🔄 Maintenance Quotidienne

### Vérifications Matinales

#### 1. État des Services
```bash
# Vérifier l'état du projet Supabase
# Aller sur https://supabase.com/dashboard/project/[PROJECT_ID]/settings/general
# Vérifier que le projet n'est pas en pause

# Tester la connexion à Supabase
npm run dev:lan
# Ouvrir l'app et vérifier l'écran de connexion
```

#### 2. Logs et Erreurs
```bash
# Vérifier les logs Supabase
# Dashboard > Logs > API, Database, Auth

# Vérifier les erreurs dans l'app
# Ouvrir la console Expo pour les erreurs runtime
```

#### 3. Métriques Utilisateur
- Nombre d'utilisateurs actifs
- Taux d'erreur de connexion
- Performances des requêtes IA
- État du marketplace (produits, commandes)

### Tâches Automatisées

#### Désactivation des Sponsorings Expirés
```sql
-- À exécuter quotidiennement via pg_cron ou script externe
SELECT deactivate_expired_sponsorships();
```

#### Nettoyage des Anciennes Données
```sql
-- Supprimer les logs vieux de plus de 90 jours
DELETE FROM activity_logs WHERE created_at < CURRENT_DATE - INTERVAL '90 days';

-- Supprimer les sessions expirées
DELETE FROM user_sessions WHERE expires_at < NOW();
```

---

## 📦 Mises à Jour et Mises à Niveau

### Mise à Jour des Dépendances

#### Vérification des Mises à Jour
```bash
# Vérifier les dépendances obsolètes
npm outdated

# Mettre à jour les dépendances non-breaking
npm update

# Pour les mises à jour majeures, tester soigneusement
npm install package@latest --save
```

#### Dépendances Critiques à Surveiller
- `@supabase/supabase-js`: Mises à jour de sécurité fréquentes
- `expo`: Nouvelles versions avec corrections de bugs
- `react-native`: Mises à jour majeures nécessitent des tests approfondis
- `@expo/ngrok`: Problèmes de connexion tunnel

### Mise à Jour de l'Application

#### Processus de Mise à Jour
1. **Créer une branche de mise à jour**
```bash
git checkout -b update/v1.0.2
```

2. **Mettre à jour le numéro de version**
```json
// package.json
{
  "version": "1.0.2"
}

// app.json
{
  "expo": {
    "version": "1.0.2"
  }
}
```

3. **Tester la mise à jour**
```bash
# Tests unitaires
npm run test

# Tests d'intégration
# Tester toutes les fonctionnalités principales

# Tests de régression
# Vérifier les parcours utilisateur critiques
```

4. **Mettre à jour le changelog**
```markdown
# CHANGELOG.md
## [1.0.2] - 2024-XX-XX
- Correction de bug dans la gestion du stock
- Amélioration des performances IA
- Mise à jour des dépendances de sécurité
```

### Mise à Jour de Supabase

#### Migrations de Base de Données
```bash
# Créer une nouvelle migration
supabase migration new update_table_name

# Appliquer les migrations
supabase db push

# Vérifier l'état des migrations
supabase db diff
```

#### Mise à Jour des Politiques RLS
```sql
-- Vérifier les politiques existantes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';

-- Tester les politiques
-- Utiliser l'app avec différents rôles utilisateur
```

---

## 📊 Monitoring et Surveillance

### Métriques à Surveiller

#### Performance Applicative
- Temps de chargement des écrans
- Taux d'erreur des requêtes API
- Utilisation mémoire
- Performances des requêtes IA

#### Métriques Métier
```sql
-- Utilisateurs actifs
SELECT COUNT(*) as active_users
FROM profiles
WHERE last_sign_in_at > CURRENT_DATE - INTERVAL '30 days';

-- État du marketplace
SELECT
  COUNT(*) as total_products,
  COUNT(*) FILTER (WHERE status = 'available') as available_products,
  COUNT(*) FILTER (WHERE is_sponsored = true) as sponsored_products
FROM marketplace_products;

-- Performances IA
SELECT
  AVG(response_time) as avg_ai_response_time,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE success = false) as failed_requests
FROM ai_feedbacks
WHERE created_at > CURRENT_DATE - INTERVAL '7 days';
```

#### Alertes à Configurer
- Plus de 5% d'erreurs de connexion
- Temps de réponse IA > 10 secondes
- Projet Supabase en pause
- Stock critique pour plus de 10% des utilisateurs

### Outils de Monitoring

#### Supabase Dashboard
- Logs API et base de données
- Métriques de performance
- Utilisation des ressources

#### Expo Application Services (EAS)
- Builds et déploiements
- Analytics d'utilisation
- Crash reports

#### Logging Applicatif
```typescript
// Utiliser la journalisation structurée
import { supabase } from '../config';

const logEvent = async (event: string, data: any) => {
  await supabase.from('activity_logs').insert({
    event_type: event,
    event_data: data,
    user_id: currentUser?.id,
    timestamp: new Date().toISOString()
  });
};
```

---

## 🔒 Sécurité

### Gestion des Clés API

#### Stockage Sécurisé
```typescript
// Variables d'environnement (jamais commitées)
EXPO_PUBLIC_SUPABASE_URL=your_secure_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_secure_key
GEMINI_API_KEY=your_secure_gemini_key
```

#### Rotation des Clés
1. Générer de nouvelles clés dans Supabase
2. Mettre à jour les variables d'environnement
3. Tester l'application
4. Désactiver les anciennes clés

### Politiques de Sécurité

#### Row Level Security (RLS)
```sql
-- Vérifier que RLS est activé sur toutes les tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Tester les politiques
-- S'assurer qu'un utilisateur ne peut voir que ses propres données
```

#### Validation des Entrées
```typescript
// Toujours valider les entrées utilisateur
const validateProductData = (data: any) => {
  if (!data.name || data.name.length < 3) {
    throw new Error('Nom de produit invalide');
  }
  if (data.price < 0) {
    throw new Error('Prix invalide');
  }
  // ... autres validations
};
```

### Audits de Sécurité

#### Audit Trimestriel
- Révision des permissions utilisateur
- Vérification des dépendances vulnérables
- Test de pénétration basique
- Révision des politiques RLS

#### Mises à Jour de Sécurité
```bash
# Scanner les vulnérabilités
npm audit

# Corriger automatiquement les vulnérabilités
npm audit fix

# Pour les vulnérabilités critiques
npm audit fix --force
```

---

## ⚡ Performance

### Optimisations Applicatives

#### Lazy Loading
```typescript
// Charger les composants lourds à la demande
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// Utiliser React.memo pour éviter les re-renders inutiles
const ProductCard = memo(({ product }) => {
  // ... composant
});
```

#### Optimisation des Images
```typescript
// Utiliser des images optimisées
import { getMarketplaceImageUrl } from '../config';

// Compresser les images avant upload
const compressImage = async (uri: string) => {
  const compressed = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 800 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );
  return compressed.uri;
};
```

### Optimisations Base de Données

#### Indexes
```sql
-- Créer des indexes pour les requêtes fréquentes
CREATE INDEX idx_marketplace_products_category ON marketplace_products(category);
CREATE INDEX idx_marketplace_products_location ON marketplace_products(location);
CREATE INDEX idx_stock_items_user_id ON stock_items(user_id);

-- Analyser les performances des requêtes
EXPLAIN ANALYZE SELECT * FROM marketplace_products WHERE category = 'feed';
```

#### Cache
```typescript
// Implémenter un cache local pour les données fréquemment utilisées
import AsyncStorage from '@react-native-async-storage/async-storage';

const cache = {
  async get(key: string) {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  },

  async set(key: string, data: any, ttl = 3600000) { // 1 heure par défaut
    const item = {
      data,
      timestamp: Date.now(),
      ttl
    };
    await AsyncStorage.setItem(key, JSON.stringify(item));
  }
};
```

### Optimisations IA

#### Cache des Réponses
```typescript
// Cacher les réponses IA similaires
const aiCache = new Map();

const getCachedAIResponse = async (query: string) => {
  const cacheKey = hash(query); // Fonction de hash simple

  if (aiCache.has(cacheKey)) {
    const cached = aiCache.get(cacheKey);
    if (Date.now() - cached.timestamp < 3600000) { // 1 heure
      return cached.response;
    }
  }

  const response = await callGeminiAPI(query);
  aiCache.set(cacheKey, {
    response,
    timestamp: Date.now()
  });

  return response;
};
```

---

## 🗄️ Base de Données

### Maintenance Régulière

#### Vacuum et Analyze
```sql
-- Maintenance automatique (configurée dans Supabase)
VACUUM ANALYZE;

-- Vérifier la fragmentation
SELECT schemaname, tablename, n_dead_tup, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;
```

#### Nettoyage des Données
```sql
-- Supprimer les produits inactifs depuis plus de 6 mois
DELETE FROM marketplace_products
WHERE status = 'inactive'
AND updated_at < CURRENT_DATE - INTERVAL '6 months';

-- Archiver les anciennes commandes
INSERT INTO orders_archive
SELECT * FROM orders
WHERE created_at < CURRENT_DATE - INTERVAL '1 year';

DELETE FROM orders
WHERE created_at < CURRENT_DATE - INTERVAL '1 year';
```

### Sauvegarde

#### Sauvegarde Automatique Supabase
- Supabase fournit des sauvegardes automatiques
- Configurer des sauvegardes supplémentaires si nécessaire

#### Export Manuel
```bash
# Exporter la structure
pg_dump --schema-only --no-owner --no-privileges > schema.sql

# Exporter les données (attention à la taille)
pg_dump --data-only --no-owner --no-privileges > data.sql
```

### Récupération

#### Procédure de Récupération
1. **Identifier le problème**
   - Quel type de données perdues ?
   - Quelle est l'étendue du problème ?

2. **Restaurer depuis la sauvegarde**
   ```sql
   -- Restaurer une table spécifique
   TRUNCATE TABLE affected_table;
   INSERT INTO affected_table SELECT * FROM backup_table;
   ```

3. **Vérifier l'intégrité**
   ```sql
   -- Vérifier les contraintes de clés étrangères
   SELECT conname, conrelid::regclass, confrelid::regclass
   FROM pg_constraint
   WHERE contype = 'f';
   ```

---

## 📦 Dépendances

### Gestion des Dépendances

#### Audit Régulier
```bash
# Vérifier les vulnérabilités
npm audit

# Mettre à jour les dépendances
npm update

# Nettoyer les dépendances inutilisées
npm prune
```

#### Dépendances Critiques
- **@supabase/supabase-js**: Mises à jour de sécurité
- **expo**: Corrections de bugs et nouvelles fonctionnalités
- **react-native**: Mises à jour majeures nécessitent des tests
- **@expo/vector-icons**: Mises à jour occasionnelles

### Gestion des Versions

#### Versionnage Sémantique
```
MAJOR.MINOR.PATCH
├── 1.0.0 : Version initiale
├── 1.0.1 : Correction de bug mineur
├── 1.1.0 : Nouvelle fonctionnalité
└── 2.0.0 : Changement majeur
```

#### Branches de Développement
```bash
# Branche principale
git branch main

# Branches de fonctionnalités
git branch feature/new-ai-feature

# Branches de correction
git branch hotfix/critical-bug-fix

# Branches de release
git branch release/v1.0.2
```

---

## 🚀 Déploiement

### Pré-Déploiement

#### Checklist
- [ ] Tests passent
- [ ] Lint passe
- [ ] Build réussi
- [ ] Variables d'environnement configurées
- [ ] Base de données migrée
- [ ] Documentation mise à jour

#### Tests de Pré-Production
```bash
# Build de test
eas build --platform android --profile preview
eas build --platform ios --profile preview

# Tests sur appareils
# Tester toutes les fonctionnalités critiques
```

### Déploiement Production

#### Via EAS
```bash
# Build production
eas build --platform android --profile production
eas build --platform ios --profile production

# Soumission aux stores
eas submit --platform android --profile production
eas submit --platform ios --profile production
```

#### Déploiement Web
```bash
# Build web
npm run build:web

# Déployer sur hosting (Vercel, Netlify, etc.)
```

### Rollback

#### Procédure de Rollback
1. **Identifier la version précédente stable**
2. **Restaurer le code**
   ```bash
   git checkout v1.0.0
   ```
3. **Restaurer la base de données si nécessaire**
4. **Redéployer**
   ```bash
   eas build --platform all --profile production
   ```

---

## 💾 Sauvegarde et Récupération

### Stratégie de Sauvegarde

#### Données Utilisateur
- Sauvegarde automatique Supabase (quotidienne)
- Export manuel mensuel des données critiques

#### Code Source
```bash
# Sauvegarde du code
git tag v1.0.1
git push origin --tags

# Backup des configurations
cp .env .env.backup
```

#### Configuration
- Variables d'environnement
- Clés API (chiffrées)
- Configuration Supabase

### Plan de Récupération

#### Scénarios de Récupération
1. **Perte de données utilisateur**
   - Restaurer depuis la sauvegarde Supabase
   - Temps d'arrêt: 1-4 heures

2. **Panne applicative**
   - Rollback vers version précédente
   - Temps d'arrêt: 30 minutes - 2 heures

3. **Incident de sécurité**
   - Changer toutes les clés API
   - Auditer les accès
   - Temps d'arrêt: 2-6 heures

---

## 🔧 Dépannage

### Problèmes Courants

#### Connexion Supabase
```bash
# Vérifier la configuration
cat .env

# Tester la connexion
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
client.from('profiles').select('count').then(console.log);
"
```

#### Erreurs IA
```typescript
// Vérifier la clé API Gemini
const testGeminiConnection = async () => {
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + GEMINI_API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Test connection' }] }]
      })
    });
    return response.ok;
  } catch (error) {
    console.error('Gemini connection failed:', error);
    return false;
  }
};
```

#### Problèmes de Performance
```bash
# Vérifier l'utilisation mémoire
# Dans Expo Dev Tools > Performance

# Analyser les requêtes lentes
EXPLAIN ANALYZE SELECT * FROM marketplace_products WHERE category = 'feed';
```

### Logs et Debugging

#### Niveaux de Log
```typescript
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

const logger = {
  debug: (message: string, data?: any) => logEvent('DEBUG', message, data),
  info: (message: string, data?: any) => logEvent('INFO', message, data),
  warn: (message: string, data?: any) => logEvent('WARN', message, data),
  error: (message: string, data?: any) => logEvent('ERROR', message, data)
};
```

---

## 🚨 Procédures d'Urgence

### Incident Critique

#### Escalade
1. **Niveau 1**: Développeur principal
2. **Niveau 2**: Équipe complète (si indisponible)
3. **Niveau 3**: Support Supabase/Google (si infrastructure)

#### Communication
- Informer les utilisateurs via notification in-app
- Mettre à jour le status page
- Documenter l'incident pour post-mortem

### Récupération d'Urgence

#### Commandes d'Urgence
```bash
# Arrêter tous les déploiements
eas build:cancel

# Restaurer la dernière version stable
git checkout main
git reset --hard origin/main

# Redémarrer Supabase (si possible)
# Dashboard > Settings > Restart project
```

#### Contacts d'Urgence
- **Supabase Support**: support@supabase.com
- **Expo Support**: support@expo.dev
- **Google AI**: ai.google.dev/support
- **Équipe Dev**: [liste des contacts]

---

## 📈 Métriques et KPIs

### Métriques Techniques
- **Uptime**: > 99.5%
- **Temps de réponse API**: < 500ms
- **Taux d'erreur**: < 1%
- **Temps de build**: < 10 minutes

### Métriques Métier
- **Utilisateurs actifs**: Croissance mensuelle
- **Taux de conversion marketplace**: > 5%
- **Satisfaction utilisateur**: > 4.5/5
- **Temps de réponse IA**: < 3 secondes

### Rapports
- **Quotidien**: Métriques de santé
- **Hebdomadaire**: Performance et utilisation
- **Mensuel**: Tendances et planification

---

## 📚 Ressources

### Documentation
- [Guide Utilisateur IA](GUIDE_UTILISATEUR_IA.md)
- [Instructions de Configuration](SETUP_INSTRUCTIONS.md)
- [Guide Marketplace Pro](README_MARKETPLACE_PRO.md)

### Outils
- **Supabase Dashboard**: Monitoring et logs
- **Expo Application Services**: Builds et déploiements
- **GitHub**: Gestion du code source
- **Linear/Jira**: Gestion des tâches

### Formation
- **Documentation React Native**: reactnative.dev
- **Documentation Supabase**: supabase.com/docs
- **Documentation Expo**: docs.expo.dev

---

**Dernière mise à jour:** Décembre 2024
**Version:** 1.0.1
**Responsable:** Équipe GreenEcoTech
