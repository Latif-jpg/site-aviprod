
# 🔐 Créer votre premier administrateur

## Méthode 1 : Via la console Supabase (Recommandé)

### Étape 1 : Accéder à la console SQL

1. Ouvrez votre projet Supabase : https://supabase.com/dashboard
2. Sélectionnez votre projet **AviprodApp**
3. Dans le menu de gauche, cliquez sur **SQL Editor**
4. Cliquez sur **New Query**

### Étape 2 : Créer l'administrateur

Copiez et collez ce code SQL (remplacez l'email par le vôtre) :

```sql
-- Remplacez 'votre-email@example.com' par votre email
UPDATE profiles 
SET role = 'admin' 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'votre-email@example.com'
);

-- Vérifier que ça a fonctionné
SELECT 
  p.user_id,
  p.full_name,
  u.email,
  p.role
FROM profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE p.role = 'admin';
```

### Étape 3 : Exécuter la requête

1. Cliquez sur **Run** (ou appuyez sur Ctrl+Enter)
2. Vous devriez voir votre compte dans les résultats avec `role = 'admin'`

### Étape 4 : Tester l'accès

1. Ouvrez l'application AviprodApp
2. Connectez-vous avec votre compte
3. Allez dans **Profil**
4. Vous devriez voir une section **"Administration"** avec un badge "ADMINISTRATEUR"
5. Cliquez sur **"Validation KYC"** pour accéder à l'interface d'administration

---

## Méthode 2 : Via l'API Supabase

Si vous préférez utiliser du code JavaScript :

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'VOTRE_SUPABASE_URL',
  'VOTRE_SUPABASE_SERVICE_ROLE_KEY' // ⚠️ Utilisez la clé SERVICE ROLE, pas la clé ANON
);

async function createAdmin(email) {
  // 1. Trouver l'utilisateur
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  const user = users?.users.find(u => u.email === email);
  
  if (!user) {
    console.error('Utilisateur non trouvé');
    return;
  }

  // 2. Mettre à jour le profil
  const { data, error } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('user_id', user.id);

  if (error) {
    console.error('Erreur:', error);
  } else {
    console.log('✅ Administrateur créé avec succès!');
  }
}

// Utilisation
createAdmin('votre-email@example.com');
```

---

## Méthode 3 : Créer plusieurs administrateurs

Si vous voulez créer plusieurs administrateurs d'un coup :

```sql
-- Liste des emails à promouvoir admin
WITH admin_emails AS (
  SELECT unnest(ARRAY[
    'admin1@example.com',
    'admin2@example.com',
    'admin3@example.com'
  ]) AS email
)
UPDATE profiles 
SET role = 'admin'
WHERE user_id IN (
  SELECT u.id 
  FROM auth.users u
  JOIN admin_emails ae ON u.email = ae.email
);

-- Vérifier les résultats
SELECT 
  p.full_name,
  u.email,
  p.role
FROM profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE p.role = 'admin';
```

---

## Vérification

### Vérifier dans la base de données

```sql
-- Lister tous les administrateurs
SELECT 
  p.user_id,
  p.full_name,
  u.email,
  p.role,
  p.created_at
FROM profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE p.role = 'admin'
ORDER BY p.created_at DESC;
```

### Vérifier dans l'application

1. **Ouvrez l'app** et connectez-vous
2. **Allez dans Profil**
3. **Cherchez le badge "ADMINISTRATEUR"** sous votre nom
4. **Cherchez la section "Administration"** dans le menu
5. **Cliquez sur "Validation KYC"** pour tester l'accès

---

## Révoquer les droits d'administrateur

Si vous devez retirer les droits d'admin à quelqu'un :

```sql
-- Révoquer les droits d'admin
UPDATE profiles 
SET role = 'user' 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'ancien-admin@example.com'
);

-- Vérifier
SELECT 
  p.full_name,
  u.email,
  p.role
FROM profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE u.email = 'ancien-admin@example.com';
```

---

## Sécurité

### ⚠️ Bonnes pratiques

1. **Ne créez pas trop d'administrateurs**
   - Limitez le nombre d'admins au strict nécessaire
   - Chaque admin a accès à toutes les données sensibles

2. **Utilisez des comptes dédiés**
   - Créez des comptes spécifiques pour l'administration
   - Ne mélangez pas comptes personnels et comptes admin

3. **Auditez régulièrement**
   ```sql
   -- Vérifier qui sont les admins
   SELECT * FROM profiles WHERE role = 'admin';
   
   -- Vérifier les actions des admins
   SELECT 
     p.full_name as admin,
     COUNT(*) as verifications_processed
   FROM seller_verifications sv
   JOIN profiles p ON sv.reviewed_by = p.user_id
   GROUP BY p.full_name;
   ```

4. **Documentez les changements**
   - Gardez une trace de qui a été promu admin et quand
   - Documentez les raisons de chaque promotion

---

## Dépannage

### Problème : "La requête ne retourne rien"

**Cause :** L'utilisateur n'existe pas encore dans la table `profiles`

**Solution :**
```sql
-- Vérifier si l'utilisateur existe
SELECT * FROM auth.users WHERE email = 'votre-email@example.com';

-- Si l'utilisateur existe mais pas dans profiles, créer le profil
INSERT INTO profiles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'votre-email@example.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

### Problème : "Accès refusé dans l'app"

**Solution :**
1. Déconnectez-vous de l'application
2. Reconnectez-vous
3. Le rôle devrait être mis à jour

### Problème : "La section Administration n'apparaît pas"

**Solution :**
```sql
-- Vérifier que le rôle est bien 'admin' (pas 'Admin' ou 'ADMIN')
SELECT role FROM profiles WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'votre-email@example.com'
);

-- Si le rôle est incorrect, le corriger
UPDATE profiles 
SET role = 'admin' 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'votre-email@example.com'
);
```

---

## Prochaines étapes

Une fois votre premier administrateur créé :

1. ✅ **Testez l'interface d'administration**
   - Allez dans Profil → Administration → Validation KYC
   - Vérifiez que vous pouvez voir les demandes

2. ✅ **Créez une demande de test**
   - Créez un compte utilisateur normal
   - Soumettez une demande KYC
   - Validez-la avec votre compte admin

3. ✅ **Lisez la documentation**
   - `ADMIN_KYC_GUIDE.md` : Guide d'utilisation
   - `ADMIN_MANAGEMENT.sql` : Scripts SQL utiles
   - `KYC_IMPLEMENTATION_COMPLETE.md` : Documentation complète

4. ✅ **Configurez les notifications** (optionnel)
   - Configurez les emails de notification
   - Configurez les alertes pour nouvelles demandes

---

## Support

Besoin d'aide ?

- **Documentation :** Voir les fichiers `.md` dans le projet
- **Scripts SQL :** Voir `ADMIN_MANAGEMENT.sql`
- **Email :** support@aviprod.com

---

**Bon courage avec votre système KYC ! 🚀**
