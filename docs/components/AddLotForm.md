# Fichier : `components/AddLotForm.tsx`

## 1. Objectif

Ce composant est un formulaire dédié à la création d'un nouveau lot de volailles. Son objectif est de fournir une interface claire et structurée pour que l'utilisateur puisse saisir toutes les informations initiales requises pour un nouveau lot.

Il a été créé pour encapsuler la logique de saisie, de validation des données et de soumission, tout en restant un composant "contrôlé", c'est-à-dire qu'il ne gère pas lui-même l'enregistrement en base de données mais délègue cette tâche à son composant parent.

## 2. Structure

Le fichier exporte un unique composant fonctionnel React, `AddLotForm`.

### Composants Clés
- **`AddLotForm(props)` (Composant principal)**
    - **Props**:
        - `onSubmit: (lot) => void`: Une fonction de rappel (callback) qui est appelée lorsque le formulaire est soumis avec succès. Elle transmet un objet contenant les données du nouveau lot au composant parent.
        - `onCancel: () => void`: Une fonction de rappel appelée lorsque l'utilisateur décide d'annuler l'opération.
    - **Gestion d'état (`useState`)**:
        - Un état est créé pour chaque champ du formulaire (`name`, `birdType`, `breed`, `quantity`, etc.) afin de contrôler la valeur de chaque `TextInput`.
        - `isSubmitting`: Un booléen pour suivre l'état de soumission et désactiver le bouton d'envoi pour éviter les doubles clics.
        - `showBirdTypePicker`: Un booléen pour afficher ou masquer le sélecteur de type de volaille.
    - **Logique interne**:
        - `validateForm()`: Une fonction qui vérifie que les champs obligatoires sont remplis et que les données sont dans un format correct (ex: nombres pour la quantité, format de date). Elle utilise des `Alert.alert` pour notifier l'utilisateur des erreurs.
        - `handleSubmit()`: La fonction principale appelée lors de l'appui sur le bouton "Ajouter". Elle exécute `validateForm()`, et si la validation réussit, elle construit l'objet `lotData` et appelle la prop `onSubmit` avec cet objet.

- **Composants d'Interface**:
    - Le formulaire est construit avec des composants de base de React Native (`View`, `Text`, `TextInput`, `ScrollView`, `TouchableOpacity`).
    - Il utilise un composant personnalisé `Icon` pour les icônes.
    - La soumission et l'annulation sont gérées par des `TouchableOpacity` stylisés comme des boutons.

## 3. Fonctionnement Détaillé

1.  **Affichage**: Le composant est généralement affiché à l'intérieur d'une modale ou d'un "bottom sheet" (comme c'est le cas dans `app/lots.tsx`). Il présente une série de champs de texte et un sélecteur pour le type de volaille.

2.  **Saisie Utilisateur**: L'utilisateur remplit les champs. Chaque modification d'un `TextInput` met à jour l'état correspondant grâce à la fonction `onChangeText`. Par exemple, `onChangeText={setName}` met à jour l'état `name`.

3.  **Validation et Soumission**:
    - L'utilisateur appuie sur "Ajouter le Lot".
    - La fonction `handleSubmit` est déclenchée.
    - `validateForm()` est appelée. Si une erreur est trouvée (ex: champ "nom" vide), une alerte s'affiche et la soumission est interrompue.
    - Si la validation passe, `isSubmitting` est mis à `true`.
    - Un objet `lotData` est créé avec les valeurs des états.
    - La fonction `onSubmit(lotData)` (passée en prop par `app/lots.tsx`) est appelée.

4.  **Délégation de l'Enregistrement**:
    - Le composant `AddLotForm` **ne sauvegarde pas** directement les données. Il se contente de les passer à son parent.
    - C'est le composant parent (`app/lots.tsx`), dans sa fonction `handleAddLot`, qui est responsable de communiquer avec Supabase pour insérer le nouveau lot dans la base de données. Cette séparation des responsabilités est une bonne pratique.

5.  **Annulation**: Si l'utilisateur appuie sur "Annuler", la fonction `onCancel` (passée en prop) est simplement appelée, ce qui permet au parent de fermer la modale.

## 4. Liaisons

### Dépendances (Fichiers importés)
- **`react`**: Bibliothèque de base.
- **`react-native`**: Pour les composants d'interface.
- **`../styles/commonStyles`**: Pour les couleurs et styles partagés.
- **`../types`**: Importe le type `Lot` pour la structure de l'objet de données.
- **`./Icon`**: Pour les icônes.
- **`./Button`**: Bien que le composant `Button` soit importé, le code utilise des `TouchableOpacity` stylisés manuellement pour les actions.
- **`../src/hooks/useDataCollector`**: Pour le suivi d'événements (`trackLotEvent`).

### Utilisé par
- **`app/lots.tsx`**: C'est le principal consommateur. Il importe `AddLotForm` et le place à l'intérieur d'un `SimpleBottomSheet` pour l'afficher lorsque l'utilisateur veut ajouter un nouveau lot. Il lui fournit les fonctions `onSubmit` (qui est `handleAddLot`) et `onCancel`.
