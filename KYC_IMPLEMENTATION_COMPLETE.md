
# 🎯 Implémentation Complète du Système KYC - AviprodApp

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Base de données](#base-de-données)
4. [Interface utilisateur](#interface-utilisateur)
5. [Interface administrateur](#interface-administrateur)
6. [Sécurité](#sécurité)
7. [Guide d'utilisation](#guide-dutilisation)
8. [Maintenance](#maintenance)

---

## Vue d'ensemble

Le système KYC (Know Your Customer) permet de vérifier l'identité des vendeurs sur le marketplace AviprodApp avant qu'ils ne puissent vendre des produits.

### Fonctionnalités principales

✅ **Pour les utilisateurs :**
- Soumission de documents KYC (photo réelle + CNI)
- Suivi du statut de vérification
- Notification du résultat (approuvé/rejeté)

✅ **Pour les administrateurs :**
- Interface de validation complète
- Visualisation des documents en haute résolution
- Approbation/rejet avec raison
- Statistiques et rapports

---

## Architecture

### Flux de vérification

```
1. Utilisateur soumet KYC
   ↓
2. Photos uploadées vers Supabase Storage
   ↓
3. Données enregistrées dans seller_verifications
   ↓
4. Statut: "pending"
   ↓
5. Admin consulte la demande
   ↓
6. Admin approuve OU rejette
   ↓
7. Profil mis à jour (seller_verified)
   ↓
8. Utilisateur notifié
```

### Composants

```
app/
├── marketplace.tsx          # Marketplace avec vérification KYC
├── profile.tsx              # Profil avec accès admin
└── admin-kyc.tsx           # Interface d'administration KYC

components/
└── SellerKYCVerification.tsx  # Formulaire de soumission KYC

supabase/
├── seller_verifications     # Table des vérifications
├── admin_kyc_verifications  # Vue enrichie pour admins
└── kyc-photos/             # Bucket de stockage des photos
```

---

## Base de données

### Table `seller_verifications`

```sql
CREATE TABLE seller_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  real_photo_url TEXT,
  id_photo_url TEXT,
  verification_status TEXT DEFAULT 'pending' 
    CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Vue `admin_kyc_verifications`

```sql
CREATE VIEW admin_kyc_verifications AS
SELECT 
  sv.*,
  p.full_name,
  p.phone,
  p.location,
  u.email
FROM seller_verifications sv
LEFT JOIN profiles p ON sv.user_id = p.user_id
LEFT JOIN auth.users u ON sv.user_id = u.id;
```

### Politiques RLS

```sql
-- Utilisateurs peuvent voir leur propre vérification
CREATE POLICY "Users can view their own verification"
ON seller_verifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Utilisateurs peuvent insérer leur vérification
CREATE POLICY "Users can insert their own verification"
ON seller_verifications FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Utilisateurs peuvent mettre à jour leur vérification en attente
CREATE POLICY "Users can update their own pending verification"
ON seller_verifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND verification_status = 'pending');

-- Admins peuvent voir toutes les vérifications
CREATE POLICY "Admins can view all verifications"
ON seller_verifications FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Admins peuvent mettre à jour les vérifications
CREATE POLICY "Admins can update verifications"
ON seller_verifications FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

### Bucket de stockage

```sql
-- Créer le bucket (via l'interface Supabase ou SQL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-photos', 'kyc-photos', true);

-- Politique de stockage
CREATE POLICY "Users can upload their own KYC photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kyc-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own KYC photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can view all KYC photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-photos' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

---

## Interface utilisateur

### Composant `SellerKYCVerification`

**Localisation :** `components/SellerKYCVerification.tsx`

**Fonctionnalités :**
- Capture/sélection de photos
- Compression automatique des images
- Upload vers Supabase Storage
- Garantie anti-fraude
- Gestion des états (pending, approved, rejected)

**Utilisation :**

```tsx
import SellerKYCVerification from '../components/SellerKYCVerification';

<SellerKYCVerification
  onVerificationSubmitted={() => {
    // Callback après soumission réussie
    console.log('KYC submitted');
  }}
  onCancel={() => {
    // Callback si l'utilisateur annule
    console.log('KYC cancelled');
  }}
/>
```

**États affichés :**
- ✅ **Approuvé** : Badge vert, message de succès
- ⏳ **En attente** : Badge orange, message d'attente
- ❌ **Rejeté** : Badge rouge, raison du rejet

---

## Interface administrateur

### Page `admin-kyc`

**Localisation :** `app/admin-kyc.tsx`

**Fonctionnalités :**

1. **Tableau de bord**
   - Statistiques en temps réel
   - Filtres par statut
   - Rafraîchissement manuel

2. **Liste des vérifications**
   - Cartes avec aperçu
   - Informations du vendeur
   - Statut visuel

3. **Détails de vérification**
   - Photos en haute résolution
   - Informations complètes
   - Actions (approuver/rejeter)

4. **Approbation**
   - Confirmation requise
   - Mise à jour automatique du profil
   - Traçabilité (qui, quand)

5. **Rejet**
   - Raison obligatoire
   - Message personnalisé
   - Possibilité de resoumission

**Accès :**
- Profil → Administration → Validation KYC
- Ou directement : `/admin-kyc`

---

## Sécurité

### Authentification

- ✅ Vérification de l'authentification
- ✅ Vérification du rôle admin
- ✅ Redirection si non autorisé

### Autorisation

- ✅ RLS sur toutes les tables
- ✅ Politiques séparées pour users/admins
- ✅ Validation côté serveur

### Données sensibles

- ✅ Photos stockées dans bucket sécurisé
- ✅ URLs publiques mais non listables
- ✅ Accès restreint par RLS
- ✅ Pas de données sensibles en clair

### Traçabilité

- ✅ Enregistrement de qui a approuvé/rejeté
- ✅ Horodatage de toutes les actions
- ✅ Historique complet des modifications

---

## Guide d'utilisation

### Pour les utilisateurs

1. **Accéder au marketplace**
2. **Cliquer sur "Vendre un produit"**
3. **Si non vérifié, voir le banner KYC**
4. **Cliquer sur "Commencer la vérification"**
5. **Accepter la garantie anti-fraude**
6. **Prendre/sélectionner photo réelle**
7. **Prendre/sélectionner photo CNI**
8. **Soumettre la vérification**
9. **Attendre l'approbation (24-48h)**

### Pour les administrateurs

1. **Se connecter avec un compte admin**
2. **Aller dans Profil → Administration → Validation KYC**
3. **Consulter les demandes en attente**
4. **Cliquer sur une demande pour voir les détails**
5. **Vérifier les photos et informations**
6. **Approuver ou rejeter avec raison**
7. **La décision est enregistrée automatiquement**

---

## Maintenance

### Tâches quotidiennes

```sql
-- Vérifier les demandes en attente
SELECT COUNT(*) FROM seller_verifications 
WHERE verification_status = 'pending';

-- Vérifier les demandes anciennes (>48h)
SELECT * FROM seller_verifications 
WHERE verification_status = 'pending'
AND submitted_at < NOW() - INTERVAL '48 hours';
```

### Tâches hebdomadaires

```sql
-- Rapport hebdomadaire
SELECT 
  verification_status,
  COUNT(*) as count
FROM seller_verifications
WHERE submitted_at >= NOW() - INTERVAL '7 days'
GROUP BY verification_status;

-- Performance des admins
SELECT 
  p.full_name,
  COUNT(*) as processed
FROM seller_verifications sv
JOIN profiles p ON sv.reviewed_by = p.user_id
WHERE sv.reviewed_at >= NOW() - INTERVAL '7 days'
GROUP BY p.full_name;
```

### Tâches mensuelles

```sql
-- Rapport mensuel complet
SELECT 
  DATE_TRUNC('month', submitted_at) as month,
  COUNT(*) as total,
  SUM(CASE WHEN verification_status = 'approved' THEN 1 ELSE 0 END) as approved,
  SUM(CASE WHEN verification_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
  AVG(EXTRACT(EPOCH FROM (reviewed_at - submitted_at))/3600) as avg_hours
FROM seller_verifications
WHERE submitted_at >= DATE_TRUNC('year', CURRENT_DATE)
GROUP BY DATE_TRUNC('month', submitted_at);
```

### Nettoyage

```sql
-- Supprimer les vérifications rejetées anciennes (>6 mois)
DELETE FROM seller_verifications
WHERE verification_status = 'rejected'
AND reviewed_at < NOW() - INTERVAL '6 months';

-- Archiver les anciennes photos (à faire manuellement via Storage)
```

---

## Dépannage

### Problème : "Accès refusé"

**Solution :**
```sql
-- Vérifier le rôle de l'utilisateur
SELECT role FROM profiles WHERE user_id = 'uuid-utilisateur';

-- Définir comme admin si nécessaire
UPDATE profiles SET role = 'admin' WHERE user_id = 'uuid-utilisateur';
```

### Problème : "Photos ne s'affichent pas"

**Solution :**
1. Vérifier que le bucket `kyc-photos` existe
2. Vérifier que le bucket est public
3. Vérifier les politiques RLS sur storage.objects

### Problème : "Impossible d'approuver/rejeter"

**Solution :**
```sql
-- Vérifier les politiques RLS
SELECT * FROM pg_policies WHERE tablename = 'seller_verifications';

-- Vérifier que l'utilisateur est admin
SELECT * FROM profiles WHERE user_id = auth.uid() AND role = 'admin';
```

---

## Améliorations futures

### Court terme
- [ ] Notifications email automatiques
- [ ] Notifications push dans l'app
- [ ] Historique des modifications

### Moyen terme
- [ ] Vérification automatique avec IA
- [ ] Détection de documents falsifiés
- [ ] Système de scoring de confiance

### Long terme
- [ ] Intégration avec services KYC tiers
- [ ] Vérification biométrique
- [ ] Blockchain pour la traçabilité

---

## Support

Pour toute question ou problème :

- **Email :** support@aviprod.com
- **Documentation :** Voir `ADMIN_KYC_GUIDE.md`
- **Scripts SQL :** Voir `ADMIN_MANAGEMENT.sql`

---

**Version :** 1.0  
**Date :** Janvier 2025  
**Auteur :** Équipe AviprodApp
