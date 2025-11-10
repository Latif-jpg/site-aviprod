
# Configuration de la Clé API Gemini

Ce guide vous explique comment configurer votre clé API Gemini pour utiliser l'analyse de santé IA dans AviprodApp.

## Étape 1: Obtenir une Clé API Gemini

1. Visitez [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Connectez-vous avec votre compte Google
3. Cliquez sur **"Create API Key"** (Créer une clé API)
4. Sélectionnez un projet Google Cloud ou créez-en un nouveau
5. Copiez la clé API générée (elle commence par `AIza...`)

## Étape 2: Configurer la Clé dans Supabase

### Option A: Via le Dashboard Supabase (Recommandé)

1. Allez sur votre [Dashboard Supabase](https://supabase.com/dashboard/project/hchzfybgcgzjmtlusywf/settings/functions)
2. Naviguez vers **Edge Functions** → **Secrets Management**
3. Ajoutez un nouveau secret:
   - **Clé**: `GEMINI_API_KEY`
   - **Valeur**: Votre clé API Gemini
4. Cliquez sur **Save** (Enregistrer)

### Option B: Via la CLI Supabase

1. Créez un fichier `supabase/functions/.env`:
   ```bash
   GEMINI_API_KEY=votre_cle_api_gemini_ici
   ```

2. Exécutez la commande:
   ```bash
   supabase secrets set --env-file supabase/functions/.env
   ```

## Étape 3: Vérifier la Configuration

Exécutez cette commande pour vérifier que le secret est bien configuré:

```bash
supabase secrets list --project-ref hchzfybgcgzjmtlusywf
```

Vous devriez voir `GEMINI_API_KEY` dans la liste.

## Étape 4: Tester l'Analyse IA

1. Ouvrez l'application AviprodApp
2. Allez dans la section **Santé**
3. Cliquez sur **"Nouvelle Analyse IA"**
4. Ajoutez une photo et des symptômes
5. Lancez l'analyse

Si tout est configuré correctement, vous devriez recevoir un diagnostic en quelques secondes.

## Dépannage

### Erreur "Invalid API Key"

- Vérifiez que la clé API est correctement copiée (sans espaces)
- Assurez-vous que la clé API est active dans Google AI Studio
- Vérifiez que le secret est bien nommé `GEMINI_API_KEY` (sensible à la casse)

### Erreur "Configuration IA non disponible"

- Vérifiez que le secret est bien configuré dans Supabase
- Attendez quelques minutes après avoir configuré le secret
- Redéployez la fonction Edge si nécessaire:
  ```bash
  supabase functions deploy gemini-health-analysis
  ```

### Erreur de Quota

Si vous voyez une erreur de quota, cela signifie que vous avez atteint la limite gratuite de l'API Gemini. Vous pouvez:
- Attendre que le quota se réinitialise (généralement quotidien)
- Passer à un plan payant sur Google AI Studio

## Coûts

L'API Gemini offre un quota gratuit généreux:
- **Gemini 2.0 Flash**: 15 requêtes par minute, 1500 requêtes par jour (gratuit)
- **Gemini 1.5 Pro**: 2 requêtes par minute, 50 requêtes par jour (gratuit)

Pour plus d'informations sur les tarifs, consultez la [page de tarification de Google AI](https://ai.google.dev/pricing).

## Sécurité

⚠️ **Important**: Ne partagez jamais votre clé API publiquement!

- Ne commitez jamais le fichier `.env` dans Git
- Ajoutez `supabase/functions/.env` à votre `.gitignore`
- Utilisez toujours les secrets Supabase pour stocker les clés API
- Régénérez votre clé API si elle a été exposée

## Support

Si vous rencontrez des problèmes:
1. Vérifiez les logs de la fonction Edge dans le Dashboard Supabase
2. Consultez la documentation [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
3. Consultez la documentation [Google AI Studio](https://ai.google.dev/docs)
