# Fichier : `src/intelligence/agents/FinancialAdvisor.ts`

## 1. Objectif

Ce fichier est le cerveau de l'assistant financier intelligent d'Aviprod. Son rôle est de fournir à l'utilisateur une analyse financière approfondie, automatisée et personnalisée de son exploitation avicole.

Il a été créé pour transformer les données brutes (transactions financières, données des lots) en informations exploitables, telles que :
- L'analyse de la rentabilité.
- La détection d'anomalies (pics de dépenses, etc.).
- La prévision de trésorerie.
- Des recommandations d'investissement et d'optimisation.

Ce fichier encapsule une logique métier complexe pour la rendre facilement consommable par l'interface utilisateur.

## 2. Structure

Le fichier est principalement structuré autour de la classe `FinancialAdvisor`, implémentée en utilisant le design pattern **Singleton** (il ne peut y avoir qu'une seule instance de l'agent).

### Composants Clés
- **`FinancialAdvisor` (Classe)**
    - **`getInstance()`**: Méthode statique pour obtenir l'unique instance de l'agent.
    - **`analyzeFinances(userId, period)`**: La méthode publique principale qui orchestre l'ensemble de l'analyse.
    - **Méthodes d'analyse privées**: Une série de méthodes `private` qui décomposent l'analyse en étapes logiques :
        - `analyzeProfitability()`: Calcule les revenus, dépenses, profits, etc.
        - `detectAnomalies()`: Détecte les pics de dépenses et les fréquences de transactions inhabituelles.
        - `forecastCashFlow()`: Prévoit la trésorerie future.
        - `recommendInvestments()`: Suggère des investissements pertinents.
    - **Méthodes de récupération de données privées**: Fonctions `private` qui interagissent avec la base de données pour obtenir les données nécessaires.
        - `getTransactions()`: Récupère les enregistrements financiers.
        - `getExpectedAmount()`: Calcule le montant de dépense attendu pour une catégorie (logique améliorée).
        - `getFlockSizeAtDate()`: (Nouvelle) Trouve la taille du cheptel à une date donnée.
        - `getCurrentActiveFlockSize()`: (Nouvelle) Calcule la taille totale actuelle du cheptel.

- **`useFinancialAdvisor` (Hook React)**
    - Un "wrapper" qui expose les fonctionnalités de l'agent (`analyzeFinances`) de manière simple et sécurisée pour être utilisé dans les composants React de l'interface utilisateur.

- **Interfaces TypeScript**
    - `Transaction`, `ProfitabilityAnalysis`, `AnomalyDetection`, etc. : Définissent la structure des objets de données utilisés dans tout le fichier, garantissant la cohérence et la sécurité des types.

## 3. Fonctionnement Détaillé

Le flux de travail de l'agent est le suivant :

1.  **Initiation** : Un composant React (comme `FinancialDashboard`) appelle la fonction `analyzeFinances` du hook `useFinancialAdvisor`.

2.  **Orchestration** : La méthode `analyzeFinances` exécute plusieurs analyses en parallèle (`Promise.all`) pour plus d'efficacité.

3.  **Détection d'Anomalies (Logique Améliorée)** :
    a.  La méthode `detectAnomalies` récupère les dépenses de la période pour une catégorie donnée.
    b.  Elle appelle `getExpectedAmount` pour déterminer le standard de dépense.
    c.  **Calcul du Standard par Sujet** : `getExpectedAmount` ne retourne plus une valeur fixe. Il :
        i.  Analyse les dépenses de la dernière année.
        ii. Pour chaque dépense, il utilise `getFlockSizeAtDate` pour trouver la taille du lot à ce moment-là et calcule un **coût par sujet**.
        iii. Il fait la moyenne de ces coûts pour établir un **standard de coût par sujet**.
        iv. Il multiplie ce standard par la taille actuelle du cheptel (obtenue via `getCurrentActiveFlockSize`) pour définir un **montant attendu dynamique**.
    d.  **Détection du Pic** : L'agent compare la dépense réelle au montant attendu. Une alerte `expense_spike` est créée **uniquement si** la dépense est supérieure de plus de 30% (le seuil `ANOMALY_THRESHOLD`). La logique `Math.abs` a été retirée pour ne plus signaler les baisses comme des pics.

4.  **Génération de Recommandations** : D'autres méthodes analysent la rentabilité et les opportunités pour générer des alertes (via `SmartAlertSystem`) et des recommandations qui sont stockées en base de données.

5.  **Retour des Données** : L'objet d'analyse complet est retourné au composant React, qui n'a plus qu'à afficher les résultats.

## 4. Liaisons

### Dépendances (Fichiers importés)
- **`../../../app/integrations/supabase/client`**: Importation cruciale pour obtenir le client Supabase initialisé, permettant toute interaction avec la base de données (lecture des lots, des transactions, etc.).
- **`../core/SmartAlertSystem`**: Se connecte au système d'alertes pour envoyer des notifications intelligentes à l'utilisateur (ex: marge négative, pic de dépense élevé).
- **`../core/DataCollector`**: Utilisé pour le suivi des erreurs et des actions, probablement pour l'analyse de performance ou le débogage.

### Utilisé par
- Ce fichier est principalement utilisé par le hook `useFinancialAdvisor`, qui est lui-même consommé par les composants de l'interface utilisateur qui ont besoin d'afficher des analyses financières.
- **`src/components/finance/FinancialDashboard.tsx`**: C'est le consommateur principal de cet agent. Il utilise le hook `useFinancialAdvisor` pour lancer l'analyse et afficher les résultats.
