# Fichier : `app/lots.tsx`

## 1. Objectif

Ce fichier définit l'écran **"Gestion des Lots"**, qui est l'un des tableaux de bord les plus importants de l'application Aviprod. Il sert de point central pour que l'utilisateur puisse visualiser, gérer et interagir avec tous ses lots de volailles.

Son objectif est de fournir à la fois une vue d'ensemble (analytique et via des recommandations IA) et un accès détaillé à chaque lot individuel. Il permet également la création et l'archivage des lots.

## 2. Structure

L'écran est un composant fonctionnel React `LotsScreen` qui utilise de nombreux hooks pour gérer son état et ses effets de bord.

### Composants Clés
- **`LotsScreen` (Composant principal)**
    - **Gestion d'état (`useState`)**:
        - `lots`: Stocke la liste des lots récupérée depuis la base de données.
        - `isLoading`, `isRefreshing`: Gèrent les états de chargement et de rafraîchissement.
        - `filter`: Mémorise le filtre actif ('tous', 'actifs', 'archivés').
        - `showAddLot`, `showIntelligence`: Contrôlent l'ouverture des panneaux modaux (bottom sheets) pour l'ajout de lot ou l'affichage du tableau de bord intelligent.
        - `selectedLotId`: Garde en mémoire l'ID du lot sélectionné pour l'analyse IA.
    - **Effets de bord (`useEffect`)**:
        - Un `useEffect` principal qui appelle `loadLots()` au premier chargement de l'écran pour récupérer les données.
    - **Fonctions de gestion de données**:
        - `loadLots()`: Fonction asynchrone qui interroge la table `lots` de Supabase, récupère les données, calcule l'âge dynamique des sujets et met à jour l'état.
        - `handleAddLot()`: Gère la soumission du formulaire d'ajout et insère un nouveau lot dans la base de données.
        - `handleArchiveLot()`: Met à jour le statut d'un lot à 'archived'.
    - **Fonctions de rendu et d'affichage**:
        - `renderAnalyticsCards()`: Affiche les 4 cartes d'analyse en haut de l'écran (Total Volailles, Lots Actifs, etc.).
        - `renderAIInsights()`: Affiche les recommandations générées par l'IA.
        - Le composant retourne une structure `ScrollView` qui contient tous les éléments de l'interface.

- **Sous-composants importés**:
    - `LotCard`: Affiche les informations d'un seul lot.
    - `AddLotForm`: Le formulaire pour créer un nouveau lot.
    - `SimpleBottomSheet`: Le composant de panneau modal utilisé pour afficher le formulaire et le tableau de bord IA.
    - `FloatingActionButton`: Le bouton flottant "+" pour ajouter un lot.
    - `LotIntelligenceDashboard`: Le tableau de bord détaillé pour un lot spécifique.
    - `SkeletonPlaceholder`: Un composant d'attente qui s'affiche pendant le chargement des données pour une meilleure expérience utilisateur.

## 3. Fonctionnement Détaillé

1.  **Chargement Initial**:
    - Au montage du composant, `useEffect` déclenche `loadLots`.
    - `loadLots` récupère l'utilisateur actuel, puis interroge la table `lots` sur Supabase pour tous les lots appartenant à cet utilisateur.
    - Pendant ce temps, des `SkeletonPlaceholder` (squelettes d'interface) sont affichés pour indiquer que le contenu charge.

2.  **Traitement des Données**:
    - Pour chaque lot récupéré, `loadLots` calcule un `dynamicAge` en comparant la date d'entrée (`entry_date`) à la date actuelle.
    - Il calcule également des informations de suivi (`trackingInfo`) si une date de vente cible est définie.
    - Les données enrichies sont stockées dans l'état `lots`, ce qui provoque un nouvel affichage.

3.  **Affichage et Interaction**:
    - L'écran affiche les cartes d'analyse, les recommandations de l'IA, les boutons de filtre et la liste des lots.
    - L'utilisateur peut appuyer sur les filtres (`Actifs`, `Archivés`) pour changer la liste des lots affichés.
    - L'utilisateur peut "tirer pour rafraîchir" (`pull-to-refresh`) pour déclencher `handleRefresh` et recharger les données.

4.  **Actions Utilisateur**:
    - **Ajouter un lot**: Un clic sur le `FloatingActionButton` met `showAddLot` à `true`, ce qui ouvre un `SimpleBottomSheet` contenant le `AddLotForm`. La soumission du formulaire appelle `handleAddLot`.
    - **Archiver un lot**: Un clic sur l'icône d'archive d'un `LotCard` appelle `handleArchiveLot`, qui demande confirmation puis met à jour le statut du lot dans la base de données.
    - **Analyser un lot**: Un clic sur un `LotCard` met `selectedLotId` à jour et `showIntelligence` à `true`, ouvrant un `SimpleBottomSheet` avec le `LotIntelligenceDashboard` pour ce lot.

## 4. Liaisons

### Dépendances (Fichiers importés)
- **`../config`**: Importe l'instance `supabase` pour communiquer avec la base de données.
- **`expo-router`**: Utilisé pour la navigation, notamment le bouton de retour vers le `/dashboard`.
- **`../components/*`**:
    - `Icon`: Pour afficher les icônes.
    - `LotCard`: Composant essentiel pour afficher chaque lot.
    - `BottomSheet`: Pour les modales d'ajout et d'analyse.
    - `AddLotForm`: Le formulaire de création de lot.
    - `FloatingActionButton`: Le bouton d'action principal.
    - `BottomNavigation`: La barre de navigation inférieure.
- **`../src/intelligence/ui/LotIntelligenceDashboard`**: Le tableau de bord d'analyse IA pour un lot.
- **`../src/intelligence/agents/LotIntelligenceAgent`**: Bien que le hook `useLotIntelligence` soit importé, il n'est pas directement utilisé dans ce fichier, mais probablement dans le `LotIntelligenceDashboard`.

### Utilisé par
- Ce fichier est un écran principal de l'application. Il est accessible via la navigation gérée par `expo-router`. Il est probablement une des cibles principales de la `BottomNavigation`.
- Il sert de conteneur et de gestionnaire de données pour les composants `LotCard` et `LotIntelligenceDashboard`.
