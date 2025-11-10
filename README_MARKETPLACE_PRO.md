# 🚀 Guide d'Implémentation Marketplace Pro avec IA Marketing

## 📋 Table des Matières
1. [Prérequis](#prérequis)
2. [Installation](#installation)
3. [Migration Base de Données](#migration-base-de-données)
4. [Configuration](#configuration)
5. [Utilisation](#utilisation)
6. [Tests](#tests)
7. [Déploiement](#déploiement)

---

## 🔧 Prérequis

### Dépendances NPM
```bash
# Installer les dépendances nécessaires
npx expo install expo-linear-gradient
npm install @supabase/supabase-js
```

### Extensions VS Code Recommandées
- ESLint
- Prettier
- React Native Tools

---

## 📦 Installation

### 1. Copier les fichiers

Créez la structure suivante dans votre projet :

```
project/
├── app/
│   └── marketplace.tsx                 # Écran principal (déjà fourni)
├── components/
│   └── SponsoredSuggestions.tsx       # Composant suggestions (déjà fourni)
├── lib/
│   └── marketingAgent.ts              # Agent IA (déjà fourni)
└── migrations/
    └── add_sponsored_products.sql     # Migration SQL (déjà fournie)
```

### 2. Vérifier les imports

Assurez-vous que ces fichiers existent dans votre projet :
- ✅ `styles/commonStyles.ts` (avec export `colors`)
- ✅ `components/Icon.tsx`
- ✅ `components/BottomSheet.tsx` (SimpleBottomSheet)
- ✅ `components/MarketplaceChat.tsx`
- ✅ `components/AddProductForm.tsx`
- ✅ `components/ShoppingCart.tsx`
- ✅ `components/SellerKYCVerification.tsx`
- ✅ `components/BottomNavigation.tsx`
- ✅ `integrations/supabase/client.ts` (ensureSupabaseInitialized)

---

## 🗄️ Migration Base de Données

### Étape 1: Exécuter la migration

Dans votre dashboard Supabase :

1. Allez dans **SQL Editor**
2. Créez une nouvelle requête
3. Copiez le contenu de `migrations/add_sponsored_products.sql`
4. Exécutez la requête

### Étape 2: Vérifier les tables créées

```sql
-- Vérifier que tout est OK
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('sponsorship_stats', 'sponsorship_payments');

-- Vérifier les colonnes ajoutées
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'marketplace_products'
AND column_name IN ('is_sponsored', 'boost_level', 'sponsor_end_date');
```

### Étape 3: Configuration des permissions RLS

Les politiques RLS sont automatiquement créées par le script de migration.

---

## ⚙️ Configuration

### 1. Variables d'environnement

Créez/mettez à jour `.env` :

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Marketing IA (optionnel)
MARKETING_AGENT_MAX_RESULTS=4
SPONSORSHIP_BASE_PRICE=500
```

### 2. Configuration du Marketing Agent

Dans `lib/marketingAgent.ts`, vous pouvez ajuster :

```typescript
// Poids des scores
const BOOST_WEIGHT = 10;      // Score de base par niveau de boost
const ZONE_BONUS = 20;        // Bonus correspondance zone
const REGION_BONUS = 15;      // Bonus correspondance région
const HISTORY_BONUS = 12;     // Bonus historique achat
const FARM_TYPE_BONUS = 8;    // Bonus compatibilité ferme
const CATEGORY_BONUS = 5;     // Bonus catégorie pertinente
```

---

## 🎯 Utilisation

### Pour les Vendeurs: Activer le Sponsoring

#### Option 1: Via Interface Admin (à créer)

```tsx
// Exemple de composant ActivateSponsorship.tsx
import { activateSponsorship, calculateSponsorshipCost } from '../lib/marketingAgent';

function ActivateSponsorship({ productId }) {
  const [boostLevel, setBoostLevel] = useState(1);
  const [duration, setDuration] = useState(7);

  const cost = calculateSponsorshipCost(boostLevel, duration);

  const handleActivate = async () => {
    // 1. Traiter le paiement (Mobile Money, Carte, etc.)
    const paymentResult = await processPayment(cost);

    if (paymentResult.success) {
      // 2. Activer le sponsoring
      const supabase = await ensureSupabaseInitialized();
      const sponsorData = activateSponsorship(productId, boostLevel, duration);

      await supabase
        .from('marketplace_products')
        .update(sponsorData)
        .eq('id', productId);

      Alert.alert('✅ Succès', 'Votre produit est maintenant sponsorisé!');
    }
  };

  return (
    <View>
      <Text>Niveau de boost: {boostLevel}</Text>
      <Text>Durée: {duration} jours</Text>
      <Text>Coût: {cost} FCFA</Text>
      <Button onPress={handleActivate} title="Activer" />
    </View>
  );
}
```

#### Option 2: Via API Backend

```typescript
// Backend Node.js/Express
app.post('/api/activate-sponsor', async (req, res) => {
  const { productId, boostLevel, durationDays, paymentToken } = req.body;

  try {
    // 1. Vérifier le paiement
    const payment = await verifyPayment(paymentToken);
    if (!payment.success) {
      return res.status(400).json({ error: 'Paiement invalide' });
    }

    // 2. Créer l'enregistrement de paiement
    const { data: paymentRecord } = await supabase
      .from('sponsorship_payments')
      .insert({
        product_id: productId,
        user_id: req.user.id,
        amount: payment.amount,
        boost_level: boostLevel,
        duration_days: durationDays,
        payment_method: payment.method,
        payment_status: 'completed',
        transaction_id: payment.transactionId,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + durationDays * 24 * 3600 * 1000).toISOString()
      })
      .select()
      .single();

    // 3. Le trigger SQL activera automatiquement le sponsoring

    res.json({ success: true, payment: paymentRecord });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Pour les Utilisateurs: Voir les Suggestions

Les suggestions sponsorisées s'affichent automatiquement dans le Marketplace si :
- ✅ L'utilisateur a un profil configuré
- ✅ Il existe des produits sponsorisés actifs
- ✅ Le marketing agent trouve des correspondances

---

## 🧪 Tests

### Test 1: Marketing Agent

```typescript
// __tests__/marketingAgent.test.ts
import { marketingAgent } from '../lib/marketingAgent';

describe('Marketing Agent', () => {
  it('should return sponsored products', () => {
    const user = {
      id: '123',
      zone: 'Ouagadougou',
      region: 'Centre',
      farmType: 'poulets'
    };

    const products = [
      {
        id: '1',
        name: 'Aliment Poulets',
        zone: 'Ouagadougou',
        is_sponsored: true,
        boost_level: 2,
        sponsor_end_date: null
      },
      {
        id: '2',
        name: 'Vaccin',
        zone: 'Bobo',
        is_sponsored: true,
        boost_level: 1,
        sponsor_end_date: new Date(Date.now() + 86400000).toISOString()
      }
    ];

    const results = marketingAgent(user, products, 2);

    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('1'); // Higher score due to zone match + boost level
  });
});
```

### Test 2: Composant Sponsored Suggestions

```typescript
// __tests__/SponsoredSuggestions.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import SponsoredSuggestions from '../components/SponsoredSuggestions';

describe('SponsoredSuggestions', () => {
  it('should render products', () => {
    const products = [
      { id: '1', name: 'Test Product', price: 1000, image_url: 'https://...' }
    ];

    const onOpenProduct = jest.fn();

    const { getByText } = render(
      <SponsoredSuggestions items={products} onOpenProduct={onOpenProduct} />
    );

    expect(getByText('Test Product')).toBeTruthy();

    fireEvent.press(getByText('Test Product'));
    expect(onOpenProduct).toHaveBeenCalledWith(products[0]);
  });
});
```

---

## 🚀 Déploiement

### Checklist Pré-Déploiement

- [ ] Migration SQL exécutée sur la base de production
- [ ] Variables d'environnement configurées
- [ ] Tests passent avec succès
- [ ] RLS policies activées
- [ ] Indexes créés pour performance
- [ ] Documentation mise à jour

### Déploiement Mobile

```bash
# Build Android
eas build --platform android --profile production

# Build iOS
eas build --platform ios --profile production

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

### Monitoring

Créez un dashboard pour suivre :
- 📊 Nombre de produits sponsorisés actifs
- 💰 Revenus de sponsoring
- 👁️ Impressions et clics
- 📈 Taux de conversion
- 💳 Paiements réussis/échoués

```sql
-- Requête pour le dashboard
SELECT
  COUNT(*) FILTER (WHERE is_sponsored = true) as active_sponsored,
  SUM(views) as total_views,
  SUM(clicks) as total_clicks,
  SUM(conversions) as total_conversions,
  ROUND(AVG(CASE WHEN views > 0 THEN (clicks::numeric / views::numeric) * 100 ELSE 0 END), 2) as avg_ctr
FROM active_sponsored_products;
```

---

## 🔄 Maintenance

### Tâche Cron: Désactiver les sponsorings expirés

```sql
-- À exécuter quotidiennement (via pg_cron ou script externe)
SELECT deactivate_expired_sponsorships();
```

### Nettoyage des anciennes statistiques

```sql
-- Garder seulement 90 jours de stats
DELETE FROM sponsorship_stats
WHERE date < CURRENT_DATE - INTERVAL '90 days';
```

---

## 📞 Support

Pour toute question ou problème :
- 📧 Email: support@aviprod.app
- 💬 Discord: [Lien vers serveur]
- 📚 Documentation: https://docs.aviprod.app

---

## 🎉 Prochaines Étapes

### Améliorations Futures

1. **Machine Learning**
   - Remplacer le scoring heuristique par un modèle ML
   - Prédire les conversions avec plus de précision

2. **A/B Testing**
   - Tester différentes stratégies de ranking
   - Optimiser les prix de sponsoring

3. **Analytics Avancés**
   - Dashboard vendeur avec métriques détaillées
   - Recommandations personnalisées d'optimisation

4. **Paiements**
   - Intégration Orange Money / Moov Money
   - Paiements récurrents (abonnements)

5. **Gamification**
   - Badges pour vendeurs performants
   - Programme de fidélité

---

**Version:** 1.0.0
**Dernière mise à jour:** 2024
**Auteurs:** GreenEcoTech & AVIPROD Team