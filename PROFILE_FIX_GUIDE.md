
# Guide de Correction du Profil Utilisateur

## Problème Identifié

Les utilisateurs ne pouvaient pas enregistrer les modifications de leur profil et recevaient un message d'échec. Le problème était causé par:

1. **Profils manquants**: Aucun enregistrement de profil n'était créé automatiquement lors de l'inscription d'un utilisateur
2. **Gestion d'erreur insuffisante**: Le code ne gérait pas le cas où un profil n'existait pas
3. **Nom de colonne incorrect**: Le code utilisait `name` au lieu de `full_name` (nom réel de la colonne dans la base de données)

## Solutions Implémentées

### 1. Trigger de Base de Données (Migration)

Un trigger a été créé pour créer automatiquement un profil lorsqu'un nouvel utilisateur s'inscrit:

```sql
-- Fonction pour gérer les nouveaux utilisateurs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur la table auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Ce que fait ce trigger:**
- Se déclenche automatiquement après chaque inscription
- Crée un enregistrement dans la table `profiles`
- Utilise le nom fourni lors de l'inscription ou l'email comme nom par défaut
- Définit les timestamps de création et mise à jour

### 2. Amélioration du Code Profile.tsx

Le fichier `app/profile.tsx` a été amélioré avec:

#### a) Création automatique de profil si manquant

```typescript
// Si le profil n'existe pas (erreur PGRST116), le créer
if (profileError.code === 'PGRST116') {
  console.log('📝 Creating new profile for user...');
  const { data: newProfile, error: createError } = await supabase
    .from('profiles')
    .insert({
      user_id: user.id,
      full_name: user.user_metadata?.name || user.email?.split('@')[0] || 'Utilisateur',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
}
```

#### b) Utilisation du bon nom de colonne

```typescript
// Avant (incorrect)
name: editForm.name

// Après (correct)
full_name: editForm.name
```

#### c) Meilleure gestion des erreurs

```typescript
const { data, error } = await supabase
  .from('profiles')
  .update({
    full_name: editForm.name,
    phone: editForm.phone,
    farm_name: editForm.farmName,
    location: editForm.location,
    updated_at: new Date().toISOString(),
  })
  .eq('user_id', user.id)
  .select();

if (error) {
  console.log('❌ Error saving profile:', error);
  Alert.alert('Échec', `Impossible de mettre à jour le profil: ${error.message}`);
  return;
}
```

#### d) État de chargement pendant la sauvegarde

```typescript
const [isSaving, setIsSaving] = useState(false);

// Dans handleSaveProfile
setIsSaving(true);
// ... opérations de sauvegarde ...
setIsSaving(false);

// Dans le bouton
<Button 
  text={isSaving ? "💾 Enregistrement..." : "💾 Enregistrer"} 
  onPress={handleSaveProfile}
  disabled={isSaving}
/>
```

#### e) Logs détaillés pour le débogage

```typescript
console.log('💾 Saving profile...');
console.log('📝 Updating profile for user:', user.id);
console.log('📝 Update data:', { full_name, phone, farm_name, location });
console.log('✅ Profile updated successfully:', data);
```

## Structure de la Table Profiles

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id),
  full_name TEXT,
  farm_name TEXT,
  phone TEXT,
  location TEXT,
  avatar_url TEXT,
  seller_verified BOOLEAN DEFAULT false,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Politiques RLS (Row Level Security)

Les politiques suivantes sont en place pour sécuriser les données:

```sql
-- Les utilisateurs peuvent voir leur propre profil
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
USING (user_id = auth.uid());

-- Les utilisateurs peuvent insérer leur propre profil
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Les utilisateurs peuvent mettre à jour leur propre profil
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (user_id = auth.uid());
```

## Test de la Solution

Pour tester que tout fonctionne:

1. **Nouveaux utilisateurs:**
   - Inscrivez-vous avec un nouveau compte
   - Vérifiez que le profil est créé automatiquement
   - Essayez de modifier les informations du profil

2. **Utilisateurs existants:**
   - Connectez-vous avec un compte existant
   - Si le profil n'existe pas, il sera créé automatiquement au chargement
   - Modifiez les informations et vérifiez qu'elles sont sauvegardées

3. **Vérification en base de données:**
   ```sql
   -- Voir tous les profils
   SELECT id, user_id, full_name, phone, farm_name, location, role 
   FROM profiles;
   
   -- Vérifier un profil spécifique
   SELECT * FROM profiles WHERE user_id = 'votre-user-id';
   ```

## Messages d'Erreur Améliorés

L'application affiche maintenant des messages clairs:

- ✅ **Succès**: "Profil mis à jour avec succès"
- ❌ **Échec**: "Impossible de mettre à jour le profil: [détails de l'erreur]"
- 🔄 **En cours**: "💾 Enregistrement..."

## Prochaines Étapes Recommandées

1. **Ajouter une photo de profil**: Permettre aux utilisateurs de télécharger une photo
2. **Validation des données**: Ajouter une validation pour le numéro de téléphone
3. **Historique des modifications**: Garder une trace des changements de profil
4. **Notifications**: Informer l'utilisateur par email lors de modifications importantes

## Dépannage

Si le problème persiste:

1. Vérifiez les logs dans la console avec les emojis:
   - 👤 Chargement du profil
   - 📝 Création/mise à jour
   - ✅ Succès
   - ❌ Erreur

2. Vérifiez que le trigger est bien créé:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

3. Vérifiez les politiques RLS:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   ```

4. Testez manuellement la mise à jour:
   ```sql
   UPDATE profiles 
   SET full_name = 'Test Name' 
   WHERE user_id = auth.uid();
   ```
