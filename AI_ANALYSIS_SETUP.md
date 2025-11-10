
# Configuration de l'Analyse IA - Guide Administrateur

## Vue d'ensemble

L'analyse IA de santé des volailles utilise Google Gemini pour fournir des diagnostics intelligents aux utilisateurs. En tant qu'administrateur, vous avez configuré une clé API globale qui est utilisée pour tous les utilisateurs de l'application.

## Architecture

### 1. Edge Function (Supabase)
- **Nom**: `gemini-health-analysis`
- **Emplacement**: Déployée sur Supabase
- **Fonction**: Gère les appels à l'API Gemini de manière sécurisée

### 2. Configuration Globale
La clé API Gemini est stockée dans les variables d'environnement Supabase:
- **Variable**: `GEMINI_API_KEY`
- **Accès**: Uniquement côté serveur (Edge Function)
- **Sécurité**: Les utilisateurs n'ont jamais accès à la clé API

### 3. Fonctionnalités pour les Utilisateurs

#### Entrées Flexibles
Les utilisateurs peuvent fournir:
- **Photos** (optionnel): Images des volailles malades
- **Description** (optionnel): Description textuelle des symptômes
- **Symptômes** (optionnel): Sélection de symptômes prédéfinis ou personnalisés

Au moins une de ces entrées est requise pour effectuer une analyse.

#### Processus d'Analyse
1. L'utilisateur saisit les données (photos/description/symptômes)
2. L'application envoie les données à l'Edge Function
3. L'Edge Function vérifie le cache pour éviter les appels API redondants
4. Si nécessaire, l'Edge Function appelle l'API Gemini avec la clé admin
5. Les résultats sont sauvegardés dans la base de données et retournés à l'utilisateur

#### Résultats Fournis
- **Diagnostic**: Identification de la maladie probable
- **Score de Confiance**: Niveau de certitude (0-100%)
- **Plan de Traitement**: Recommandations détaillées
- **Produits Recommandés**: Liste de produits du marketplace
- **Avertissement**: Rappel de consulter un vétérinaire

### 4. Optimisations

#### Cache Intelligent
- Les analyses identiques sont mises en cache
- Réduit les coûts d'API
- Améliore les temps de réponse

#### Sécurité
- Authentification requise (JWT)
- RLS (Row Level Security) sur toutes les tables
- Clé API jamais exposée au client

## Tables de Base de Données

### `ai_health_analyses`
Stocke l'historique des analyses:
```sql
- id: uuid (PK)
- user_id: uuid (FK -> auth.users)
- lot_id: text
- images: text[]
- symptoms: text[]
- diagnosis: text
- confidence: integer
- treatment_plan: text
- recommended_products: jsonb
- cache_key: text (unique)
- created_at: timestamptz
- updated_at: timestamptz
```

### Politiques RLS
```sql
-- Les utilisateurs peuvent voir leurs propres analyses
CREATE POLICY "Users can view own analyses" 
ON ai_health_analyses FOR SELECT 
USING (user_id = auth.uid());

-- Les utilisateurs peuvent créer leurs propres analyses
CREATE POLICY "Users can create own analyses" 
ON ai_health_analyses FOR INSERT 
WITH CHECK (user_id = auth.uid());
```

## Interface Utilisateur

### Composant Principal
**Fichier**: `components/AIHealthAnalysis.tsx`

#### Étapes du Workflow
1. **Saisie des Données** (Step 1/3)
   - Upload de photos
   - Saisie de description
   - Sélection de symptômes

2. **Analyse en Cours** (Step 2/3)
   - Indicateur de progression
   - Messages informatifs

3. **Résultats** (Step 3/3)
   - Affichage du diagnostic
   - Score de confiance visuel
   - Plan de traitement
   - Produits recommandés
   - Avertissement médical

### Fonctionnalités UX
- ✅ Interface intuitive et guidée
- ✅ Pas de configuration requise pour l'utilisateur
- ✅ Support multimodal (images + texte)
- ✅ Feedback visuel à chaque étape
- ✅ Gestion d'erreurs robuste
- ✅ Messages en français

## Maintenance

### Vérifier le Statut de l'Edge Function
```bash
# Via Supabase Dashboard
# Functions > gemini-health-analysis > Logs
```

### Mettre à Jour la Clé API
1. Aller dans Supabase Dashboard
2. Settings > Edge Functions > Secrets
3. Modifier `GEMINI_API_KEY`
4. Redéployer l'Edge Function si nécessaire

### Surveiller l'Usage
- Consulter les logs de l'Edge Function
- Vérifier la table `ai_health_analyses` pour l'historique
- Monitorer les coûts API Gemini sur Google Cloud Console

## Coûts

### API Gemini
- **Modèle**: gemini-1.5-flash
- **Coût**: Très faible (quota gratuit généreux)
- **Optimisation**: Cache pour réduire les appels

### Supabase
- **Edge Functions**: Inclus dans le plan
- **Base de données**: Stockage minimal pour les analyses

## Support Utilisateur

### Messages d'Erreur Courants

1. **"Données Insuffisantes"**
   - Solution: Ajouter au moins une photo, description ou symptôme

2. **"Impossible de contacter le serveur"**
   - Solution: Vérifier la connexion internet

3. **"Configuration IA non disponible"**
   - Solution: Vérifier que `GEMINI_API_KEY` est configurée

### FAQ

**Q: Les utilisateurs doivent-ils configurer quelque chose?**
R: Non, tout est géré automatiquement par l'administrateur.

**Q: Les données sont-elles sécurisées?**
R: Oui, toutes les données sont protégées par RLS et l'authentification.

**Q: Combien coûte une analyse?**
R: Très peu, grâce au cache et au quota gratuit de Gemini.

**Q: L'IA peut-elle se tromper?**
R: Oui, c'est pourquoi un avertissement est toujours affiché recommandant de consulter un vétérinaire.

## Améliorations Futures

- [ ] Support de l'analyse vidéo
- [ ] Intégration avec le marketplace pour acheter directement
- [ ] Historique détaillé avec graphiques
- [ ] Notifications pour les traitements
- [ ] Export PDF des rapports
- [ ] Analyse comparative entre lots

## Contact

Pour toute question technique, consulter:
- Documentation Supabase: https://supabase.com/docs
- Documentation Gemini: https://ai.google.dev/docs
