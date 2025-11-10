
# Guide de Dépannage - API Gemini

## Problème: "Tous les modèles Gemini ont échoué"

Si vous voyez cette erreur dans la console, cela signifie que l'API Gemini ne peut pas être contactée. Voici comment résoudre ce problème étape par étape.

---

## ✅ Solution Rapide

### Étape 1: Vérifier que vous avez une clé API valide

1. Allez sur **[Google AI Studio](https://aistudio.google.com/app/apikey)**
2. Connectez-vous avec votre compte Google
3. Cliquez sur **"Get API Key"** ou **"Create API Key"**
4. **Copiez la clé** (elle commence par `AIza...`)

⚠️ **Important**: La clé doit commencer par `AIza` pour être valide!

### Étape 2: Configurer la clé dans Supabase

#### Option A: Via le Dashboard Supabase (Recommandé)

1. Allez sur **[Supabase Dashboard](https://supabase.com/dashboard/project/hchzfybgcgzjmtlusywf)**
2. Dans le menu de gauche, cliquez sur **"Edge Functions"**
3. Cliquez sur l'onglet **"Secrets"** ou **"Environment Variables"**
4. Cliquez sur **"Add new secret"**
5. Remplissez:
   - **Name**: `GEMINI_API_KEY` (exactement comme ça, sensible à la casse)
   - **Value**: Collez votre clé API (celle qui commence par AIza...)
6. Cliquez sur **"Save"** ou **"Add secret"**

#### Option B: Via la CLI Supabase

```bash
# Définir le secret
supabase secrets set GEMINI_API_KEY=votre_cle_api_ici --project-ref hchzfybgcgzjmtlusywf

# Vérifier que le secret est bien configuré
supabase secrets list --project-ref hchzfybgcgzjmtlusywf
```

### Étape 3: Attendre et Tester

1. **Attendez 1-2 minutes** après avoir configuré le secret
2. Ouvrez l'application
3. Allez dans **Menu → Diagnostic Gemini** (nouveau)
4. Cliquez sur **"Lancer le Diagnostic"**
5. Vérifiez que tous les tests passent ✅

---

## 🔍 Diagnostic Détaillé

### Test 1: Vérifier que le secret existe

```bash
supabase secrets list --project-ref hchzfybgcgzjmtlusywf
```

Vous devriez voir `GEMINI_API_KEY` dans la liste.

### Test 2: Vérifier les logs de l'Edge Function

1. Allez sur **[Supabase Dashboard](https://supabase.com/dashboard/project/hchzfybgcgzjmtlusywf)**
2. Cliquez sur **"Edge Functions"** dans le menu
3. Cliquez sur **"gemini-health-analysis"**
4. Cliquez sur l'onglet **"Logs"**
5. Cherchez les messages d'erreur

**Messages d'erreur courants:**

- `GEMINI_API_KEY est vide ou non définie` → Le secret n'est pas configuré
- `API key not valid` → La clé API est invalide ou expirée
- `Quota dépassé` → Vous avez atteint la limite gratuite
- `403 Forbidden` → La clé n'a pas les bonnes permissions

### Test 3: Tester manuellement l'API Gemini

Vous pouvez tester votre clé API directement avec curl:

```bash
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=VOTRE_CLE_API" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{
        "text": "Bonjour, es-tu fonctionnel?"
      }]
    }]
  }'
```

Si vous obtenez une réponse JSON avec du texte, votre clé fonctionne!

---

## ❌ Erreurs Courantes et Solutions

### Erreur: "API key not valid"

**Cause**: La clé API est invalide, expirée ou mal copiée

**Solutions**:
1. Vérifiez que la clé commence bien par `AIza`
2. Vérifiez qu'il n'y a pas d'espaces avant/après la clé
3. Générez une nouvelle clé sur Google AI Studio
4. Reconfigurez le secret dans Supabase

### Erreur: "Configuration IA non disponible"

**Cause**: Le secret `GEMINI_API_KEY` n'est pas configuré dans Supabase

**Solutions**:
1. Suivez l'Étape 2 ci-dessus pour configurer le secret
2. Attendez 1-2 minutes
3. Réessayez

### Erreur: "Quota dépassé" ou "429 Too Many Requests"

**Cause**: Vous avez atteint la limite gratuite de l'API Gemini

**Solutions**:
1. Attendez que le quota se réinitialise (généralement quotidien)
2. Vérifiez votre quota sur [Google AI Studio](https://aistudio.google.com/)
3. Passez à un plan payant si nécessaire

### Erreur: "403 Forbidden"

**Cause**: La clé API n'a pas les permissions nécessaires

**Solutions**:
1. Vérifiez que l'API "Generative Language API" est activée dans Google Cloud Console
2. Créez une nouvelle clé API avec les bonnes permissions
3. Assurez-vous que votre projet Google Cloud est actif

### Erreur: "Tous les modèles ont échoué"

**Cause**: Aucun des modèles Gemini n'a pu répondre

**Solutions**:
1. Vérifiez votre connexion internet
2. Vérifiez les logs de l'Edge Function pour plus de détails
3. Testez votre clé API manuellement (voir Test 3)
4. Contactez le support Google AI si le problème persiste

---

## 🔧 Redéployer l'Edge Function

Si vous avez modifié le code de l'Edge Function, vous devez la redéployer:

```bash
# Depuis la racine du projet
supabase functions deploy gemini-health-analysis --project-ref hchzfybgcgzjmtlusywf
```

---

## 📊 Vérifier les Quotas

### Quotas Gratuits Gemini

- **Gemini 2.0 Flash**: 15 requêtes/minute, 1500 requêtes/jour
- **Gemini 1.5 Flash**: 15 requêtes/minute, 1500 requêtes/jour
- **Gemini 1.5 Pro**: 2 requêtes/minute, 50 requêtes/jour

Pour vérifier votre utilisation:
1. Allez sur [Google AI Studio](https://aistudio.google.com/)
2. Cliquez sur votre projet
3. Consultez l'onglet "Usage"

---

## 🆘 Besoin d'Aide?

### Utiliser l'Outil de Diagnostic

L'application inclut maintenant un outil de diagnostic intégré:

1. Ouvrez l'application
2. Allez dans **Menu → Diagnostic Gemini**
3. Cliquez sur **"Lancer le Diagnostic"**
4. Suivez les instructions à l'écran

### Consulter les Logs

Les logs détaillés sont disponibles dans:
- **Supabase Dashboard** → Edge Functions → gemini-health-analysis → Logs
- **Console de l'application** (pour les développeurs)

### Informations à Fournir

Si vous contactez le support, fournissez:
1. Le message d'erreur exact
2. Les logs de l'Edge Function
3. Le résultat du diagnostic intégré
4. La date et l'heure de l'erreur

---

## ✅ Checklist de Vérification

Avant de demander de l'aide, vérifiez:

- [ ] J'ai une clé API Gemini valide (commence par AIza)
- [ ] Le secret `GEMINI_API_KEY` est configuré dans Supabase
- [ ] J'ai attendu 1-2 minutes après la configuration
- [ ] J'ai testé avec l'outil de diagnostic intégré
- [ ] J'ai consulté les logs de l'Edge Function
- [ ] Ma connexion internet fonctionne
- [ ] Je n'ai pas dépassé le quota gratuit

---

## 📚 Ressources

- [Documentation Google AI Studio](https://ai.google.dev/docs)
- [Documentation Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Tarification Google AI](https://ai.google.dev/pricing)
- [Guide de Configuration](./GEMINI_API_SETUP.md)
