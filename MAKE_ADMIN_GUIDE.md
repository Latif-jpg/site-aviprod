
# Guide : Devenir Administrateur

## Problème
Vous êtes connecté mais vous ne voyez pas l'interface de validation KYC car votre compte n'a pas le rôle `admin`.

## Solution Rapide

### Étape 1 : Ouvrir le SQL Editor dans Supabase
1. Allez sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet **hchzfybgcgzjmtlusywf**
3. Cliquez sur **SQL Editor** dans le menu de gauche

### Étape 2 : Exécuter la requête SQL

Copiez et collez cette requête dans l'éditeur SQL :

```sql
-- Remplacez 'votre-email@example.com' par votre véritable email
UPDATE profiles 
SET role = 'admin' 
WHERE user_id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'votre-email@example.com'
);
```

**IMPORTANT** : Remplacez `'votre-email@example.com'` par l'email que vous utilisez pour vous connecter à l'application.

### Étape 3 : Vérifier que ça a fonctionné

Exécutez cette requête pour vérifier :

```sql
SELECT 
  p.full_name,
  p.role,
  au.email
FROM profiles p
LEFT JOIN auth.users au ON p.user_id = au.id
WHERE p.role = 'admin';
```

Vous devriez voir votre compte avec le rôle `admin`.

### Étape 4 : Redémarrer l'application

1. Déconnectez-vous de l'application
2. Reconnectez-vous avec votre compte
3. Allez dans **Profil** → vous devriez voir le badge "ADMINISTRATEUR"
4. Cliquez sur **Validation KYC** pour accéder à l'interface

## Alternative : Créer un nouveau compte admin

Si vous préférez créer un nouveau compte admin dédié :

```sql
-- 1. Créez d'abord le compte dans l'application (inscription normale)
-- 2. Puis exécutez cette requête en remplaçant l'email

UPDATE profiles 
SET role = 'admin' 
WHERE user_id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'admin@votredomaine.com'
);
```

## Vérification des permissions

L'interface KYC vérifie automatiquement :
- ✅ Que vous êtes connecté
- ✅ Que votre profil a le rôle `'admin'`
- ✅ Que les politiques RLS autorisent l'accès

Si vous voyez toujours "Accès refusé", vérifiez que :
1. Vous êtes bien connecté
2. Votre email correspond exactement à celui dans la base de données
3. Le rôle est bien `'admin'` (en minuscules)

## Besoin d'aide ?

Si le problème persiste, vérifiez les logs dans la console de l'application pour voir les messages d'erreur détaillés.
