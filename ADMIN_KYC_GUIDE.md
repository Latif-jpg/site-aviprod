
# 📋 Guide d'Administration KYC - AviprodApp

## Vue d'ensemble

Ce guide explique comment utiliser l'interface d'administration pour valider les demandes de vérification KYC (Know Your Customer) des vendeurs sur le marketplace AviprodApp.

## 🔐 Accès à l'interface d'administration

### Prérequis
Pour accéder à l'interface d'administration KYC, vous devez :

1. **Être connecté** à l'application
2. **Avoir le rôle d'administrateur** dans votre profil

### Comment devenir administrateur

Pour définir un utilisateur comme administrateur, exécutez cette requête SQL dans votre console Supabase :

```sql
-- Remplacez 'email@example.com' par l'email de l'utilisateur
UPDATE profiles 
SET role = 'admin' 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'email@example.com'
);
```

### Accéder à l'interface

1. Ouvrez l'application
2. Allez dans **Profil** (icône en bas à droite)
3. Si vous êtes administrateur, vous verrez une section **"Administration"**
4. Cliquez sur **"Validation KYC"**

## 📊 Interface d'administration

### Tableau de bord

L'interface affiche :

- **Statistiques en temps réel** :
  - Nombre de demandes en attente
  - Nombre de vérifications approuvées
  - Nombre de vérifications rejetées

- **Filtres** :
  - Tous
  - En attente
  - Approuvés
  - Rejetés

### Cartes de vérification

Chaque carte affiche :
- **Photo de profil** (initiale du nom)
- **Nom complet** du vendeur
- **Email**
- **Téléphone**
- **Localisation**
- **Date de soumission**
- **Statut** (badge coloré)
- **Aperçu des photos** (photo réelle + CNI)

## ✅ Processus de validation

### 1. Consulter une demande

1. Cliquez sur une carte de vérification
2. Une feuille de détails s'ouvre avec :
   - Informations complètes du vendeur
   - Photos en haute résolution
   - Historique de la demande

### 2. Approuver une vérification

**Quand approuver :**
- Les photos sont claires et lisibles
- La photo réelle correspond à la photo sur la CNI
- Les informations sont cohérentes
- Le document d'identité est valide

**Comment approuver :**
1. Ouvrez les détails de la vérification
2. Cliquez sur le bouton **"✅ Approuver"**
3. Confirmez l'approbation

**Résultat :**
- Le statut passe à "Approuvé"
- Le champ `seller_verified` du profil est mis à `true`
- Le vendeur peut maintenant vendre sur le marketplace

### 3. Rejeter une vérification

**Quand rejeter :**
- Photos floues ou illisibles
- Incohérence entre la photo réelle et la CNI
- Document d'identité expiré ou invalide
- Suspicion de fraude
- Informations manquantes ou incorrectes

**Comment rejeter :**
1. Ouvrez les détails de la vérification
2. Cliquez sur le bouton **"❌ Rejeter"**
3. **Fournissez une raison claire** du rejet (obligatoire)
4. Confirmez le rejet

**Exemples de raisons de rejet :**
- "Photos trop floues, impossible de vérifier l'identité"
- "La photo réelle ne correspond pas à la photo sur la CNI"
- "Document d'identité expiré depuis 2020"
- "Informations incohérentes entre le profil et la CNI"
- "Suspicion de document falsifié"

**Résultat :**
- Le statut passe à "Rejeté"
- Le champ `seller_verified` du profil est mis à `false`
- L'utilisateur voit la raison du rejet
- L'utilisateur peut soumettre une nouvelle demande

## 🔄 Actualisation des données

- **Rafraîchissement automatique** : Les données se chargent automatiquement à l'ouverture
- **Rafraîchissement manuel** : 
  - Cliquez sur l'icône de rafraîchissement en haut à droite
  - Ou tirez vers le bas (pull-to-refresh)

## 📱 Fonctionnalités de l'interface

### Filtrage
- Utilisez les boutons de filtre pour afficher uniquement :
  - Toutes les demandes
  - Demandes en attente (par défaut)
  - Demandes approuvées
  - Demandes rejetées

### Recherche visuelle
- Les aperçus des photos permettent une évaluation rapide
- Cliquez sur une carte pour voir les photos en haute résolution

### Historique
- Date de soumission
- Date de révision (si déjà traitée)
- Administrateur qui a traité la demande

## 🔒 Sécurité et permissions

### Politiques RLS (Row Level Security)

Les politiques suivantes sont en place :

1. **Lecture** : Seuls les administrateurs peuvent voir toutes les vérifications
2. **Mise à jour** : Seuls les administrateurs peuvent approuver/rejeter
3. **Utilisateurs normaux** : Ne peuvent voir que leur propre vérification

### Traçabilité

Chaque action est enregistrée avec :
- L'ID de l'administrateur qui a effectué l'action
- La date et l'heure de l'action
- La raison (en cas de rejet)

## 📊 Base de données

### Table `seller_verifications`

```sql
- id: UUID (clé primaire)
- user_id: UUID (référence auth.users)
- real_photo_url: TEXT (URL de la photo réelle)
- id_photo_url: TEXT (URL de la CNI)
- verification_status: TEXT ('pending', 'approved', 'rejected')
- rejection_reason: TEXT (raison du rejet)
- submitted_at: TIMESTAMP (date de soumission)
- reviewed_at: TIMESTAMP (date de révision)
- reviewed_by: UUID (ID de l'admin qui a traité)
```

### Vue `admin_kyc_verifications`

Vue enrichie qui joint les données de :
- `seller_verifications`
- `profiles` (nom, téléphone, localisation)
- `auth.users` (email)

## 🎯 Bonnes pratiques

### Pour les administrateurs

1. **Vérifiez attentivement** chaque document avant d'approuver
2. **Soyez précis** dans les raisons de rejet
3. **Traitez les demandes rapidement** pour améliorer l'expérience utilisateur
4. **Documentez** les cas suspects ou inhabituels
5. **Respectez la confidentialité** des données personnelles

### Critères de validation

✅ **À vérifier :**
- Clarté des photos
- Correspondance visage réel / CNI
- Validité du document
- Cohérence des informations
- Absence de signes de falsification

❌ **Signes d'alerte :**
- Photos de mauvaise qualité
- Documents flous ou partiellement visibles
- Incohérences dans les informations
- Documents expirés
- Signes de manipulation numérique

## 🆘 Support et dépannage

### Problèmes courants

**"Accès refusé"**
- Vérifiez que votre compte a le rôle 'admin'
- Reconnectez-vous à l'application

**"Impossible de charger les vérifications"**
- Vérifiez votre connexion internet
- Actualisez la page
- Vérifiez les logs Supabase

**"Erreur lors de l'approbation/rejet"**
- Vérifiez que la demande n'a pas déjà été traitée
- Vérifiez les permissions RLS dans Supabase

### Logs et débogage

Les logs sont disponibles dans :
- Console de l'application (pour le développement)
- Logs Supabase (pour la production)

## 📈 Statistiques et rapports

Pour obtenir des statistiques sur les vérifications :

```sql
-- Nombre de vérifications par statut
SELECT 
  verification_status, 
  COUNT(*) as count 
FROM seller_verifications 
GROUP BY verification_status;

-- Vérifications traitées par administrateur
SELECT 
  p.full_name as admin_name,
  COUNT(*) as verifications_processed
FROM seller_verifications sv
JOIN profiles p ON sv.reviewed_by = p.user_id
WHERE sv.reviewed_at IS NOT NULL
GROUP BY p.full_name;

-- Temps moyen de traitement
SELECT 
  AVG(EXTRACT(EPOCH FROM (reviewed_at - submitted_at))/3600) as avg_hours
FROM seller_verifications
WHERE reviewed_at IS NOT NULL;
```

## 🔄 Notifications (À venir)

Dans une future version, vous pourrez :
- Envoyer des notifications email aux utilisateurs
- Configurer des alertes pour les nouvelles demandes
- Recevoir des rapports quotidiens/hebdomadaires

## 📞 Contact

Pour toute question ou problème :
- Email : support@aviprod.com
- Documentation : [Lien vers la documentation complète]

---

**Version :** 1.0  
**Dernière mise à jour :** Janvier 2025  
**Auteur :** Équipe AviprodApp
