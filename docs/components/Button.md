# Fichier : `components/Button.tsx`

## 1. Objectif

L'objectif de ce composant est de fournir un **bouton standardisé et réutilisable** pour toute l'application Aviprod.

Il a été créé pour centraliser le style et le comportement des boutons, évitant ainsi la répétition de code et garantissant une expérience utilisateur cohérente. En utilisant ce composant, on s'assure que tous les boutons de l'application partagent la même apparence, les mêmes animations et les mêmes états (normal, désactivé, chargement).

## 2. Structure

Le fichier exporte un unique composant fonctionnel React, `Button`.

### Composants Clés
- **`Button(props)` (Composant principal)**
    - **Props**: Le composant est hautement configurable via ses props :
        - `title` / `text`: Le texte à afficher sur le bouton.
        - `onPress: () => void`: La fonction à exécuter lors de l'appui sur le bouton.
        - `style`: Permet de surcharger le style du conteneur du bouton depuis un composant parent.
        - `textStyle`: Permet de surcharger le style du texte du bouton.
        - `variant`: Une prop clé qui définit le style visuel du bouton. Les options sont `'primary'` (par défaut), `'secondary'`, ou `'danger'`.
        - `disabled`: Un booléen qui, si `true`, désactive le bouton et lui donne une apparence grisée.
        - `loading`: Un booléen qui, si `true`, désactive le bouton et affiche un indicateur de chargement (`ActivityIndicator`) à la place du texte.
    - **Logique interne**:
        - `getBackgroundColor()`: Une fonction qui retourne la couleur de fond appropriée en fonction des props `variant` et `disabled`.
        - `getTextColor()`: Retourne la couleur du texte, qui est différente pour la variante `secondary`.
    - **Affichage conditionnel**:
        - Le composant rend soit un `ActivityIndicator` (si `loading` est `true`), soit un composant `Text` avec le titre du bouton.

- **Composants d'Interface**:
    - Le composant est basé sur une `TouchableOpacity` de React Native, ce qui lui confère un effet d'opacité lors de l'appui.
    - Les styles sont définis via un `StyleSheet` local et sont combinés dynamiquement en fonction des props.

## 3. Fonctionnement Détaillé

1.  **Rendu**: Le composant est appelé par un parent, qui lui fournit au minimum un `title` (ou `text`) et une fonction `onPress`.
    ```jsx
    <Button title="Enregistrer" onPress={handleSubmit} />
    ```

2.  **Détermination du Style**:
    - À chaque rendu, les fonctions `getBackgroundColor` et `getTextColor` sont appelées.
    - Elles inspectent les props `variant` et `disabled` pour déterminer les bonnes couleurs à appliquer.
    - Les styles sont appliqués sous forme de tableau, permettant de combiner le style de base, le style de la variante, le style de l'état désactivé et les styles personnalisés passés en prop.
    - `[styles.button, { backgroundColor: getBackgroundColor() }, style]`

3.  **Gestion des États**:
    - **Normal**: Le bouton est interactif et affiche son texte.
    - **Désactivé (`disabled={true}`)**: La `TouchableOpacity` est désactivée, et le style `disabledButton` (opacité réduite) est appliqué. L'utilisateur ne peut pas interagir avec.
    - **Chargement (`loading={true}`)**: Le bouton est également désactivé. Le texte est remplacé par un `ActivityIndicator` pour fournir un retour visuel à l'utilisateur pendant une opération asynchrone.

4.  **Interaction**:
    - Si le bouton n'est ni désactivé ni en chargement, un appui de l'utilisateur déclenche la fonction `onPress` fournie en prop.

## 4. Liaisons

### Dépendances (Fichiers importés)
- **`react`**: Bibliothèque de base.
- **`react-native`**: Fournit `TouchableOpacity`, `Text`, `StyleSheet`, `ActivityIndicator`, etc.
- **`../styles/commonStyles`**: Importe le nuancier de couleurs (`colors`) pour une apparence cohérente.

### Utilisé par
Ce composant est fondamental et a vocation à être utilisé dans **presque tous les fichiers** où une action utilisateur est requise. Par exemple :
- **`components/AddLotForm.tsx`**: Pour les boutons "Annuler" et "Ajouter le Lot".
- **Écrans d'authentification**: Pour les boutons "Connexion" ou "Inscription".
- **Modales de confirmation**: Pour les boutons "OK" ou "Annuler".
- ...et bien d'autres.
