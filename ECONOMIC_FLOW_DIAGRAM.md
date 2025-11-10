flowchart TD
    %% Client Flow
    Client[👤 Client<br/>Éleveur] -->|Sélection produit| Products[📦 Produits Aviprod<br/>Profil Vendeur Certified]

    %% Marketplace Flow
    Products -->|Ajout au panier| Payment[💳 Paiement Total<br/>MM, Carte]
    Payment -->|Création commande| Orders[(📋 Orders<br/>Table backend)]

    %% Delivery Flow
    Orders -->|Livraison demandée| Deliveries[(🚚 Deliveries<br/>Status = pending<br/>Création automatique)]

    Deliveries -->|Matching livreur| Drivers[🚴 Livreurs disponibles<br/>Status = online]
    Drivers -->|Acceptation livraison| InTransit[🚚 Livraison en cours<br/>Status = in_transit]

    InTransit -->|Livraison terminée| Delivered[✅ Client confirme<br/>Status = delivered]

    %% Payment Distribution
    Delivered -->|Répartition paiement| Split{Paiement Split}
    Split -->|85%| DriverPay[💰 Driver<br/>85%]
    Split -->|15%| AviprodPay[💰 Aviprod<br/>15%]

    %% Feedback Loop
    Delivered --> History[📊 Historique & Feedback<br/>Évaluation livreur<br/>Évaluation produit<br/>Historique commandes]

    %% Subscription Tiers
    subgraph "💎 Abonnements – Gestion IA et Lots"
        Freemium[🆓 Freemium<br/>Gratuit<br/>• 2 analyses IA/mois<br/>• Ration auto 1 lot<br/>• Historique limité]

        Premium[⭐ Premium<br/>Payant<br/>• Analyses IA illimitées<br/>• Jusqu'à 3 lots<br/>• Rations auto + ajustable<br/>• Recommandations produits<br/>• Historique complet]

        Pro[💎 Pro<br/>Payant<br/>• IA illimité tous lots<br/>• Rations complètes + optimisées<br/>• Historique + rapports exportables<br/>• Alertes avancées + notifications<br/>• Réductions produits et livraison<br/>• Support prioritaire]
    end

    Freemium --> Premium --> Pro

    %% Styling
    classDef clientClass fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef productClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef paymentClass fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef deliveryClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef driverClass fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef feedbackClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef subscriptionClass fill:#fff8e1,stroke:#f57f17,stroke-width:2px

    class Client clientClass
    class Products,History productClass
    class Payment paymentClass
    class Deliveries,InTransit,Delivered deliveryClass
    class Drivers,DriverPay driverClass
    class Freemium,Premium,Pro subscriptionClass
```

---

## 📊 **Légende du Diagramme Flux Économique Aviprod**

### 🎯 **Flux Principal**
- **Client → Produits**: Sélection et achat sur marketplace
- **Paiement → Commande**: Création automatique en base
- **Livraison**: Système type Uber avec matching livreur
- **Répartition**: 85% livreur / 15% Aviprod

### 💎 **Modèle d'Abonnement Freemium**
- **Freemium**: Accès limité pour découvrir le service
- **Premium**: Fonctionnalités complètes pour petits élevages
- **Pro**: Solution entreprise avec tous les avantages

### 🔄 **Optimisations Incluses**
- **Cache IA**: Réduction coûts API Gemini
- **Feedback Loop**: Amélioration continue qualité
- **Matching Intelligent**: Optimisation livraison
- **Paiement Automatisé**: Réduction friction utilisateur

### 💰 **Sources de Revenus**
1. **Commission Livraison**: 15% sur chaque livraison
2. **Abonnements**: Freemium → Premium → Pro
3. **Vente Produits**: Marge sur produits Aviprod
4. **Premium Features**: Accès IA et fonctionnalités avancées

### 📈 **Métriques Clés**
- **Taux Conversion**: Freemium → Premium
- **Volume Livraisons**: Nombre commandes/jour
- **Satisfaction**: Notes clients/livreurs
- **CA Moyen**: Par commande et abonnement

---

## 🛠️ **Comment Utiliser ce Diagramme**

### **Pour les Développeurs**
```typescript
// Intégrer dans la documentation
import EconomicFlowDiagram from './EconomicFlowDiagram';

// Ou utiliser directement le code Mermaid
const diagramCode = `flowchart TD...`;
```

### **Pour les Pitch Deck**
- Exporter en PNG/SVG depuis Mermaid Live Editor
- Intégrer dans présentations investisseurs
- Utiliser pour expliquer le modèle économique

### **Points d'Extension**
- [ ] Ajouter métriques temps réel
- [ ] Intégrer calculs de commission dynamiques
- [ ] Ajouter flux de remboursement
- [ ] Inclure système de parrainage

---

*Ce diagramme représente l'architecture économique complète d'Aviprod, combinant marketplace B2B, livraison à la demande et monétisation par abonnement.*