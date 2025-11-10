
# Amélioration de l'Alimentation - Documentation

## Vue d'ensemble

Cette mise à jour implémente un système de fonctionnalités premium pour le calcul automatique des rations alimentaires, tout en maintenant la saisie manuelle gratuite.

## Fonctionnalités Implémentées

### 1. Système d'Abonnement Premium

#### Base de données
- **Table `user_subscriptions`**: Gère les abonnements utilisateurs
  - `subscription_type`: 'free' ou 'premium'
  - `features`: JSON avec les fonctionnalités activées
  - `expires_at`: Date d'expiration de l'abonnement
  - RLS activé pour la sécurité

- **Table `custom_feed_rations`**: Stocke les rations personnalisées
  - Liée aux utilisateurs et aux lots
  - Permet de sauvegarder les rations manuelles
  - RLS activé pour la sécurité

### 2. Calcul Automatique de Ration (Premium) 💎

**Fonctionnalité payante** - Nécessite un abonnement premium

- Calcul intelligent basé sur:
  - Race de volaille (Broiler, Layer, Poulet Local)
  - Stade de croissance (starter, grower, finisher, layer)
  - Âge des volailles
  - Nombre de sujets

- Fournit:
  - Valeurs nutritionnelles précises (protéines, énergie, fibres, calcium)
  - Consommation journalière par volaille
  - Consommation totale du lot
  - Prédictions de croissance

### 3. Saisie Manuelle de Ration (Gratuit) ✏️

**Fonctionnalité gratuite** - Accessible à tous les utilisateurs

- Permet d'entrer:
  - Nom de la ration
  - Consommation journalière par volaille (obligatoire)
  - Protéines (%) - optionnel
  - Énergie (kcal/kg) - optionnel
  - Fibres (%) - optionnel
  - Calcium (%) - optionnel
  - Notes personnelles - optionnel

- Les rations sont sauvegardées dans la base de données
- Associées au lot spécifique
- Réutilisables

### 4. Interface Utilisateur

#### Écran Principal
- Badge indiquant le statut (Premium ou Gratuit)
- Liste des lots actifs avec informations de base
- Sélection du lot pour calculer la ration

#### Choix de Méthode
Lors de la sélection d'un lot, l'utilisateur choisit:
1. **Calcul Automatique (Premium)** 💎
   - Affiche le modal premium si non abonné
   - Calcule automatiquement si abonné
2. **Ration Manuelle (Gratuit)** ✏️
   - Toujours accessible
   - Formulaire de saisie simple

#### Modal Premium
- Présentation des avantages premium
- Liste des fonctionnalités incluses
- Tarification claire (5,000 CFA/mois)
- Bouton de mise à niveau
- Option de continuer avec la saisie manuelle

### 5. Marketplace - Corrections

#### Problèmes Résolus
- Affichage correct du nombre de produits
- Meilleure gestion des erreurs de chargement
- Logs détaillés pour le débogage
- Affichage du compteur de produits dans le titre

#### Améliorations
- Message d'état vide plus informatif
- Indication claire quand aucun produit n'existe
- Suggestion d'ajouter le premier produit

## Utilisation

### Pour les Utilisateurs Gratuits

1. Accéder à "Alimentation Intelligente"
2. Sélectionner un lot
3. Choisir "Ration Manuelle (Gratuit)"
4. Remplir le formulaire:
   - Nom de la ration
   - Consommation journalière (obligatoire)
   - Autres valeurs nutritionnelles (optionnel)
5. Enregistrer

### Pour les Utilisateurs Premium

1. Accéder à "Alimentation Intelligente"
2. Sélectionner un lot
3. Choisir "Calcul Automatique (Premium)"
4. Voir les résultats calculés automatiquement
5. Consulter les détails nutritionnels

### Mise à Niveau vers Premium

1. Tenter d'utiliser le calcul automatique
2. Voir le modal premium
3. Cliquer sur "Passer à Premium"
4. Confirmation de l'activation (démo: 1 mois gratuit)

## Tarification

- **Gratuit**: Saisie manuelle illimitée
- **Premium**: 5,000 CFA/mois ou 50,000 CFA/an (économie de 17%)

### Fonctionnalités Premium
- ✅ Calcul automatique des rations
- ✅ Valeurs nutritionnelles précises
- ✅ Prédictions de croissance
- ✅ Analyse de santé par IA
- ✅ Support prioritaire

## Sécurité

- Row Level Security (RLS) activé sur toutes les tables
- Les utilisateurs ne peuvent voir que leurs propres données
- Validation des données côté serveur
- Gestion sécurisée des abonnements

## Base de Données

### Tables Créées

```sql
-- Abonnements utilisateurs
user_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  subscription_type TEXT,
  features JSONB,
  expires_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Rations personnalisées
custom_feed_rations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  lot_id UUID REFERENCES lots,
  name TEXT,
  daily_consumption_per_bird_grams INTEGER,
  protein_percentage NUMERIC,
  energy_kcal INTEGER,
  fiber_percentage NUMERIC,
  calcium_percentage NUMERIC,
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## Notes Techniques

### Gestion des Erreurs
- Tous les appels API sont wrappés dans try-catch
- Logs détaillés pour le débogage
- Messages d'erreur conviviaux pour l'utilisateur

### Performance
- Chargement asynchrone des données
- Mise en cache des abonnements
- Requêtes optimisées avec index

### Évolutivité
- Architecture modulaire
- Facile d'ajouter de nouvelles fonctionnalités premium
- Système d'abonnement extensible

## Prochaines Étapes Possibles

1. **Intégration de Paiement**
   - Stripe, PayPal, ou Mobile Money
   - Gestion automatique des renouvellements
   - Factures et reçus

2. **Fonctionnalités Premium Additionnelles**
   - Rapports avancés
   - Analyses prédictives
   - Recommandations personnalisées

3. **Notifications**
   - Rappels de renouvellement
   - Alertes de ration
   - Conseils personnalisés

4. **Historique**
   - Suivi des rations utilisées
   - Comparaison des performances
   - Optimisation continue

## Support

Pour toute question ou problème:
- Vérifier les logs de la console
- Consulter la documentation Supabase
- Contacter le support technique
