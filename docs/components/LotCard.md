# Fichier : `components/LotCard.tsx`

## 1. Objectif

`LotCard` est un composant d'interface utilisateur fondamental dont l'objectif est d'afficher un résumé concis et visuellement riche des informations d'un lot de volailles.

Il a été créé pour servir de "carte d'identité" à chaque lot sur l'écran principal de gestion des lots (`app/lots.tsx`). Il agit à la fois comme un aperçu informatif et comme un point d'entrée cliquable pour accéder à des analyses plus détaillées sur un lot spécifique.

## 2. Structure

Le fichier exporte un unique composant fonctionnel React, `LotCard`, qui est optimisé avec `React.memo` pour éviter les rendus inutiles si les propriétés (props) ne changent pas.

### Composants Clés
- **`LotCard(props)` (Composant principal)**
    - **Props**:
        - `lot: Lot`: Un objet contenant toutes les données d'un lot spécifique. Le type `Lot` provient de `types/index.ts`.
        - `onPress: () => void`: Une fonction de rappel (callback) qui est exécutée lorsque l'utilisateur appuie sur la carte.
    - **Logique interne**:
        - Le composant est encapsulé dans une `TouchableOpacity` pour le rendre cliquable.
        - Il contient plusieurs fonctions d'assistance (helpers) pour calculer ou formater des données à afficher :
            - `getHealthStatusColor()` / `getHealthStatusIcon()`: Retournent une couleur et une icône basées sur le statut de santé du lot.
            - `calculateDaysUntilExit()`: Calcule le nombre de jours restants avant la date de vente cible.
            - `formatDate()`: Met en forme les chaînes de caractères de date dans un format lisible (ex: "11 nov. 2025").
            - `calculateExitDate()`: Estime la date de sortie en fonction de la date d'entrée et du type de volaille.
    - **Affichage conditionnel**:
        - Affiche une image (`lot.breedImage`) si elle est disponible, sinon un placeholder.
        - Affiche une alerte si le taux de mortalité est élevé (`isMortalityHigh`).
        - Affiche une alerte si des traitements sont en attente.

- **`styles` (StyleSheet)**
    - Un objet `StyleSheet` de React Native qui définit l'apparence de la carte, en utilisant des couleurs et des styles prédéfinis depuis `styles/commonStyles.ts`.

## 3. Fonctionnement Détaillé

1.  **Réception des Props**: Le composant reçoit un objet `lot` complet de son parent (`app/lots.tsx`).

2.  **Calculs et Formatage**: Avant de rendre l'interface, le composant exécute sa logique interne :
    - Il calcule le taux de mortalité, le nombre de jours restants, la date de sortie prévue, etc.
    - Il détermine la couleur et l'icône du badge de statut de santé.

3.  **Rendu de l'Interface**:
    - Le composant affiche les informations de manière structurée :
        - Une image en en-tête.
        - Le nom et la race du lot.
        - Un badge de statut de santé.
        - Une grille d'informations clés (date d'entrée, âge, sortie prévue, jours restants).
        - Une section de statistiques (nombre de volailles, poids moyen, prix de vente).
        - Une section sur l'état de santé (malades, morts, en quarantaine, sains).
        - Des alertes contextuelles pour la mortalité ou les traitements en attente.

4.  **Interaction**:
    - Lorsque l'utilisateur appuie n'importe où sur la carte, la `TouchableOpacity` déclenche la fonction `onPress` fournie en prop. Dans le contexte de `app/lots.tsx`, cela a pour effet d'ouvrir le tableau de bord d'intelligence pour le lot concerné.

## 4. Liaisons

### Dépendances (Fichiers importés)
- **`react`**: Bibliothèque de base pour la création de composants.
- **`react-native`**: Fournit les composants d'interface de base (`View`, `Text`, `TouchableOpacity`, `Image`).
- **`../styles/commonStyles`**: Importe le nuancier de couleurs (`colors`) pour garantir une cohérence visuelle.
- **`./Icon`**: Importe le composant `Icon` personnalisé pour afficher les icônes vectorielles.
- **`../types`**: Importe la définition de type `Lot` pour garantir que l'objet `lot` reçu en prop a la bonne structure.

### Utilisé par
- **`app/lots.tsx`**: C'est le principal et unique consommateur de ce composant. L'écran `LotsScreen` crée une instance de `LotCard` pour chaque lot dans la liste de données, en lui passant les informations du lot et une fonction `onPress`.
