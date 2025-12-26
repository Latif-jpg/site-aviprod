# Documentation du projet Aviprod

## Introduction

Aviprod est une application mobile et web de gestion avicole. Ce document a pour but d'expliquer la structure du projet, son fonctionnement, et les interactions entre les différents fichiers.

## Table des matières

- [Introduction](#introduction)
- [Structure du projet](#structure-du-projet)
- [Dépendances](#dépendances)
- [Scripts](#scripts)
- [Composants](#composants)
- [Écrans](#écrans)
- [Logique métier](#logique-métier)
- [Base de données](#base-de-données)

## Structure du projet

Le projet est structuré de la manière suivante :

- `/app`: Contient les écrans de l'application.
- `/components`: Contient les composants réutilisables.
- `/contexts`: Contient les contextes React.
- `/data`: Contient les données mockées.
- `/hooks`: Contient les hooks personnalisés.
- `/lib`: Contient les librairies et agents.
- `/src`: Contient la logique métier et les agents d'intelligence artificielle.
- `/supabase`: Contient les migrations et les fonctions de la base de données Supabase.
- `/types`: Contient les types TypeScript.
- `/utils`: Contient les fonctions utilitaires.

## Dépendances

Le projet utilise les dépendances suivantes :

### Dépendances principales

- `expo`: Framework pour le développement d'applications React Native.
- `react`: Librairie pour la création d'interfaces utilisateur.
- `react-native`: Framework pour le développement d'applications mobiles natives.
- `@react-navigation/native`: Librairie pour la navigation entre les écrans.
- `@supabase/supabase-js`: Librairie pour l'interaction avec la base de données Supabase.
- `expo-router`: Librairie pour la gestion des routes de l'application.

### Dépendances de développement

- `typescript`: Langage de programmation pour le typage statique.
- `eslint`: Outil pour l'analyse statique du code.
- `@babel/core`: Compilateur JavaScript.

## Scripts

Le projet dispose des scripts suivants :

- `npm run dev`: Lance l'application en mode développement avec Expo.
- `npm run dev:tunnel`: Lance l'application en mode développement avec un tunnel ngrok.
- `npm run dev:lan`: Lance l'application en mode développement sur le réseau local.
- `npm run dev:localhost`: Lance l'application en mode développement en local.
- `npm run android`: Lance l'application sur un appareil ou un émulateur Android.
- `npm run ios`: Lance l'application sur un appareil ou un simulateur iOS.
- `npm run web`: Lance l'application dans un navigateur web.
- `npm run build:web`: Compile l'application pour le web.
- `npm run build:android`: Pré-compile l'application pour Android.
- `npm run lint`: Lance l'analyse statique du code avec ESLint.

## Écrans

Cette section décrit les différents écrans de l'application, situés dans le dossier `/app`.

### `_layout.tsx`

Ce fichier est le layout principal de l'application. Il est responsable de :

- **La gestion de la navigation** : Il utilise `expo-router` pour définir les écrans de l'application et gérer la navigation entre eux.
- **La gestion de l'authentification** : Il utilise le hook `useAuth` pour vérifier si l'utilisateur est connecté et le rediriger vers l'écran approprié.
- **La gestion des erreurs** : Il utilise un `ErrorBoundary` pour capturer les erreurs et afficher un écran d'erreur.
- **La gestion du thème** : Il utilise un `ThemeProvider` pour fournir le thème à l'ensemble de l'application.
- **La gestion des abonnements** : Il utilise un `SubscriptionProvider` pour fournir les informations sur l'abonnement de l'utilisateur.
- **La gestion de l'intelligence universelle** : Il utilise un `UniversalIntelligenceProvider` pour fournir les fonctionnalités d'intelligence artificielle à l'ensemble de l'application.
- **L'affichage d'un écran de chargement** : Il affiche un écran de chargement pendant que l'application vérifie l'état de l'authentification.
- **La gestion de la connexion à Supabase** : Il vérifie la connexion à Supabase et affiche un écran d'erreur en cas de problème.
- **La gestion du bouton "retour" sur Android** : Il gère le comportement du bouton "retour" sur Android pour une meilleure expérience utilisateur.

### `AddProductScreen.tsx`

Cet écran permet à un utilisateur d'ajouter un produit à la place de marché. Il gère le flux de vérification du vendeur (KYC) avant de permettre l'ajout d'un produit.

- **Vérification du statut KYC** : Avant d'afficher le formulaire d'ajout de produit, l'écran vérifie si l'utilisateur a un statut de vendeur vérifié (`approved`).
- **Gestion des différents statuts KYC** :
    - Si le statut est `pending` (en attente), un message informe l'utilisateur que sa demande est en cours d'examen.
    - Si le statut est `rejected` (rejeté), un message informe l'utilisateur que sa demande a été refusée.
    - Si l'utilisateur n'est pas encore vérifié, un message lui propose de commencer le processus de vérification (KYC).
- **Affichage du formulaire KYC** : Si l'utilisateur choisit de commencer la vérification, le composant `SellerKYCVerification` est affiché.
- **Affichage du formulaire d'ajout de produit** : Si le statut de l'utilisateur est `approved`, le composant `AddProductForm` est affiché, permettant à l'utilisateur d'ajouter un nouveau produit.
- **Gestion de l'annulation** : L'utilisateur peut annuler le processus à tout moment.

### `admin-driver-validation.tsx`

Cet écran est destiné aux administrateurs pour valider les chauffeurs. Il affiche simplement le composant `AdminDriverValidation` qui contient toute la logique de validation.

### `admin-kyc.tsx`

Cet écran est une interface d'administration complète pour la gestion des vérifications d'identité des vendeurs (KYC) et des livreurs (KYD).

- **Contrôle d'accès administrateur** :
    - Vérifie si l'utilisateur connecté a le rôle `admin`.
    - Si l'utilisateur n'est pas un administrateur, un écran d'accès refusé est affiché avec des instructions sur la façon de devenir administrateur.
- **Chargement des vérifications** :
    - Récupère toutes les demandes de vérification depuis les tables `seller_verifications` et `livreur_verifications`.
    - Transforme les URLs des images pour les afficher correctement.
- **Filtrage et recherche** :
    - Permet de filtrer les demandes par statut (`tous`, `en attente`, `approuvé`, `rejeté`).
    - Permet de rechercher des utilisateurs par nom ou par email.
- **Affichage des demandes** :
    - Affiche les demandes sous forme de cartes avec les informations essentielles (nom, email, statut, etc.).
    - Affiche un aperçu des photos d'identité.
- **Détail de la demande** :
    - Affiche une vue détaillée de la demande avec toutes les informations et les documents.
    - Permet de visualiser les images en plein écran.
- **Actions de modération** :
    - Permet aux administrateurs d'approuver ou de rejeter une demande.
    - En cas de rejet, un motif doit être fourni.
- **Mise à jour du statut** :
    - Met à jour le statut de la vérification dans la base de données.
    - Met à jour le profil de l'utilisateur en conséquence (par exemple, `seller_verified` à `true`).
- **Interface utilisateur réactive** :
    - Utilise des indicateurs de chargement et de rafraîchissement pour une meilleure expérience utilisateur.
    - Utilise des "bottom sheets" pour afficher les détails et les formulaires de rejet sans changer d'écran.

### `ai-analysis.tsx`

Cet écran est dédié à l'analyse de la santé des lots par intelligence artificielle. Il affiche le composant `AIHealthAnalysis` qui contient toute la logique de l'analyse.

### `ai-history.tsx`

Cet écran affiche l'historique des analyses de santé par IA pour l'utilisateur connecté.

- **Chargement de l'historique** :
    - Récupère toutes les analyses de la table `ai_health_analyses` pour l'utilisateur actuel.
    - Affiche un indicateur de chargement pendant la récupération des données.
- **Affichage des analyses** :
    - Affiche les analyses sous forme de cartes avec les informations clés (diagnostic, date, confiance).
    - Si aucune analyse n'a été effectuée, un message l'indique.
- **Détail de l'analyse** :
    - Permet de voir les détails complets d'une analyse, y compris :
        - Le diagnostic et le niveau de confiance.
        - Les photos soumises.
        - La liste des symptômes.
        - Le plan de traitement.
        - Les produits recommandés.
- **Suppression d'une analyse** :
    - Permet à l'utilisateur de supprimer une analyse de son historique.
- **Interface utilisateur** :
    - L'interface est divisée en deux vues : la liste des analyses et le détail d'une analyse.
    - Utilise des couleurs pour indiquer le niveau de confiance du diagnostic.

### `AIHealthAnalysis.tsx`

Ce composant est le cœur de la fonctionnalité d'analyse de santé par IA. Il permet aux utilisateurs de soumettre des informations sur leurs volailles pour obtenir un diagnostic.

- **Collecte de données** :
    - Permet à l'utilisateur de sélectionner plusieurs images depuis sa galerie.
    - Fournit une zone de texte pour une description détaillée des symptômes.
    - Propose une liste de symptômes courants à sélectionner.
- **Gestion des abonnements et des limites** :
    - Vérifie le plan d'abonnement de l'utilisateur (`freemium`, `premium`, etc.).
    - Applique des limites sur le nombre d'analyses IA par mois pour les plans non illimités.
    - Permet d'utiliser des "Avicoins" pour effectuer des analyses supplémentaires si la limite est atteinte.
    - Redirige l'utilisateur vers la page des abonnements si la limite est atteinte et qu'il n'a pas assez d'Avicoins.
- **Appel à la fonction Supabase** :
    - Compresse les images et les convertit en base64.
    - Appelle la fonction Supabase `gemini-health-analysis` avec les images, la description et les symptômes.
- **Affichage des résultats** :
    - Affiche le diagnostic, le score de confiance et le plan de traitement suggéré.
    - Affiche un avertissement indiquant que le diagnostic de l'IA ne remplace pas un avis vétérinaire.
- **Suivi des analyses** :
    - Utilise le hook `useDataCollector` pour suivre les analyses réussies et échouées, collectant des métriques sur l'utilisation de la fonctionnalité.
- **Gestion des erreurs** :
    - Affiche des messages d'erreur clairs en cas de problème lors de l'analyse.

### `auth.tsx`

Cet écran gère l'ensemble du processus d'authentification des utilisateurs, y compris l'inscription, la connexion et la réinitialisation du mot de passe.

- **Modes d'authentification** :
    - Permet de basculer entre les modes `login` (connexion), `signup` (inscription) et `reset` (réinitialisation de mot de passe).
- **Formulaires et validation** :
    - Affiche des formulaires adaptés à chaque mode.
    - Valide les entrées de l'utilisateur (format de l'email, longueur du mot de passe, correspondance des mots de passe).
- **Communication avec Supabase** :
    - Utilise `supabase.auth.signInWithPassword` pour la connexion.
    - Utilise `supabase.auth.signUp` pour l'inscription.
    - Utilise `supabase.auth.resetPasswordForEmail` pour la réinitialisation du mot de passe.
- **Création de ferme à l'inscription** :
    - Lors de l'inscription, crée une nouvelle ferme dans la table `farms` et associe l'utilisateur à cette ferme.
- **Gestion des erreurs et des succès** :
    - Affiche des messages d'erreur spécifiques et conviviaux en cas de problème (par exemple, "Email ou mot de passe incorrect").
    - Affiche des messages de succès et des alertes pour informer l'utilisateur (par exemple, "Inscription réussie! Un email de confirmation a été envoyé").
- **Vérification de la connexion** :
    - Vérifie l'état de la connexion au serveur Supabase et informe l'utilisateur s'il est en mode hors ligne.
- **Interface utilisateur** :
    - Permet d'afficher ou de masquer le mot de passe.
    - Propose un lien pour la réinitialisation du mot de passe depuis l'écran de connexion.

### `connection-check.tsx`

Cet écran est un outil de diagnostic qui permet de vérifier l'état des connexions de l'application.

- **Vérification de la connectivité** :
    - **Internet** : Vérifie si l'appareil est connecté à Internet en envoyant une requête à Google.
    - **Base de données (Supabase)** : Tente de se connecter à la base de données Supabase et vérifie si le projet est en pause.
    - **État du projet** : Vérifie si un utilisateur est actuellement connecté.
- **Affichage de l'état** :
    - Affiche l'état de chaque vérification (`En cours`, `OK`, `Erreur`, `Attention`).
    - Fournit des détails pour chaque état, y compris des messages d'erreur spécifiques.
- **Résumé et recommandations** :
    - Affiche un résumé global de l'état de la connexion.
    - Propose des actions à l'utilisateur, comme "Revérifier", "Contacter le support" ou "Aide pour Erreur Ngrok".
- **Interface utilisateur** :
    - Utilise des icônes et des couleurs pour indiquer clairement l'état de chaque service.
- **Guide l'utilisateur** dans la résolution des problèmes de connexion.

### `dashboard.tsx`

Cet écran est le tableau de bord principal de l'application. Il offre une vue d'ensemble de l'état de la ferme et un accès rapide aux différents modules.

- **Affichage des données clés (KPIs)** :
    - **Santé globale** : Affiche un score de santé global calculé à partir de la mortalité, de la consommation, des symptômes et des vaccins.
    - **Lots actifs** : Affiche le nombre de lots actifs et le nombre total de volailles.
    - **Marge nette** : Affiche la marge bénéficiaire mensuelle et le profit.
    - **Alertes critiques** : Affiche le nombre d'alertes critiques (stock bas, santé faible, vaccins en retard).
- **Navigation** :
    - **Menu latéral (Drawer)** : Permet d'accéder au profil, aux abonnements, aux paramètres, à l'aide et aux sections d'administration.
    - **Barre de navigation inférieure** : Permet de naviguer entre les principaux modules (Lots, Marché, Finance, Stock, Santé).
    - **Grille de modules** : Offre un accès rapide à tous les modules de l'application.
- **Notifications et alertes** :
    - Affiche les notifications non lues.
    - Affiche une alerte clignotante pour les notifications critiques.
- **Publicités et recommandations** :
    - Affiche des bannières publicitaires.
    - Utilise un agent marketing IA (`marketingAgent`) pour générer des recommandations de produits sponsorisés en fonction du profil de l'utilisateur, de la santé de ses lots et de sa situation financière.
- **Gestion de l'utilisateur** :
    - Affiche le nom de l'utilisateur et de sa ferme.
    - Permet la déconnexion.
- **Chargement des données** :
    - Charge en parallèle de nombreuses informations depuis Supabase (profil, lots, stock, finances, etc.).
    - Affiche des "skeleton loaders" pour une meilleure expérience utilisateur pendant le chargement.
- **Interface utilisateur dynamique** :
    - Utilise des animations pour attirer l'attention sur les éléments importants (alertes, score de santé).
    - S'adapte au thème de l'application (clair/sombre).
- **Hooks personnalisés** :
    - Utilise de nombreux hooks personnalisés pour gérer les données, la finance, les publicités, les notifications et les abonnements (`useData`, `useFinance`, `useAds`, `useNotifications`, `useSubscription`).

### `delivery-dashboard.tsx`

Cet écran est le tableau de bord des livraisons. Il affiche simplement le composant `DeliveryDashboard` qui contient toute la logique d'affichage et de gestion des livraisons.

### `delivery-driver.tsx`

Cet écran est le portail pour les chauffeurs-livreurs.

- **Disponibilité multiplateforme** :
    - Le composant principal `DeliveryDriverApp` est chargé uniquement sur les plateformes mobiles (iOS et Android).
    - Sur le web, un message est affiché indiquant que la fonctionnalité n'est pas disponible.
- **Logique de l'application chauffeur** :
    - Toute la logique de l'application pour les chauffeurs (carte interactive, gestion des livraisons, etc.) est contenue dans le composant `DeliveryDriverApp`.

### `delivery.tsx`

Cet écran est un alias pour le tableau de bord des livraisons. Il affiche également le composant `DeliveryDashboard`. Il est probable qu'il s'agisse d'une route alternative pour le même écran.

### `driver-registration.tsx`

Cet écran permet aux utilisateurs de s'inscrire en tant que chauffeur-livreur. Il affiche le composant `DriverRegistrationForm` qui contient le formulaire d'inscription et la logique associée.

### `feeding.tsx`

Cet écran est dédié à la gestion de l'alimentation des lots. C'est une interface riche en fonctionnalités qui combine des données en temps réel, des analyses et des outils de configuration.

- **Tableau de bord analytique** :
    - Affiche des indicateurs de performance clés (KPIs) tels que la quantité totale d'aliments par jour, la consommation moyenne par oiseau, le nombre total d'oiseaux et le nombre de lots avec des rations configurées.
- **Recommandations IA** :
    - Fournit des informations et des alertes générées par l'IA, telles que la détection de surconsommation, l'optimisation des coûts et les rations manquantes.
- **Gestion des lots** :
    - Affiche une carte pour chaque lot actif avec ses statistiques (quantité, âge, poids moyen).
    - Affiche la ration actuellement assignée à chaque lot, avec des détails sur sa composition (protéines, énergie).
- **Configuration des rations** :
    - **Mode automatique (Premium)** : Permet de calculer automatiquement la ration optimale en utilisant l'IA. Cette fonctionnalité est réservée aux utilisateurs Premium.
    - **Mode manuel** : Permet de configurer manuellement une ration pour un lot.
- **Gestion des abonnements** :
    - Vérifie l'abonnement de l'utilisateur pour débloquer les fonctionnalités Premium.
    - Affiche une modale pour inciter les utilisateurs à passer à un plan Premium.
- **Conseiller en ration IA** :
    - Intègre un `RationAdvisorDashboard` pour une optimisation intelligente et approfondie des rations.
- **Chargement des données** :
    - Charge les informations sur les lots, les rations personnalisées et les assignations de stock depuis Supabase.
    - Calcule dynamiquement l'âge des lots en fonction de leur date d'entrée.
- **Interface utilisateur** :
    - Utilise des "bottom sheets" pour afficher les formulaires de configuration des rations et le conseiller IA.
    - Affiche des "skeleton loaders" pendant le chargement des données.
    - Utilise des couleurs et des icônes pour une visualisation claire des informations.

### `finance.tsx`

Cet écran offre une vue d'ensemble complète et intelligente des finances de l'exploitation.

- **Tableau de bord financier** :
    - Affiche les revenus, les dépenses et le profit pour des périodes sélectionnables (semaine, mois, trimestre).
    - Présente une carte de rentabilité qui indique si l'exploitation est rentable et affiche la marge bénéficiaire.
- **Répartition des dépenses** :
    - Visualise la répartition des dépenses par catégorie à l'aide de barres de progression.
- **Recommandations IA** :
    - Fournit des informations générées par l'IA pour aider à l'optimisation des coûts, identifier les opportunités de croissance et analyser les tendances des revenus.
- **Gestion des transactions** :
    - Affiche la liste des transactions récentes.
    - Permet d'ajouter de nouveaux revenus et de nouvelles dépenses via un formulaire dans une "bottom sheet".
- **Conseiller financier IA** :
    - Intègre un `FinancialAdvisorDashboard` pour une analyse prédictive, la détection d'anomalies et l'optimisation fiscale.
- **Hook `useFinance`** :
    - Utilise le hook `useFinance` pour charger les données financières et calculer les résumés.
- **Suivi des actions** :
    - Utilise le hook `useDataCollector` pour suivre les actions de l'utilisateur et la génération d'informations par l'IA.
- **Interface utilisateur** :
    - Utilise des dégradés de couleurs et des icônes pour une présentation visuellement attrayante des données financières.
    - Affiche un indicateur de chargement pendant la récupération des données.

### `health.tsx`

Cet écran est le centre de gestion de la santé de l'élevage. Il fournit une vue d'ensemble de l'état de santé des lots, des analyses basées sur l'IA et des outils pour la prévention et le traitement.

- **Indice de Santé Global** :
    - Affiche un score de santé global calculé à partir de divers facteurs (mortalité, symptômes, vaccination, etc.).
    - La couleur de l'indice change en fonction du score pour une visualisation rapide de l'état.
- **Indicateurs Clés de Performance (KPIs)** :
    - Affiche des cartes pour la mortalité (taux et couleur d'alerte), le nombre de symptômes et le nombre de jours depuis la dernière vaccination.
- **Analyse et Recommandations IA** :
    - Utilise un modèle heuristique (`heuristicsModel`) pour analyser un "snapshot" des données de l'élevage (mortalité, consommation, stock, finance, symptômes, vaccination).
    - Affiche des recommandations personnalisées basées sur cette analyse, y compris des causes potentielles et des actions suggérées.
    - Permet de commander des produits ou d'appliquer des recommandations.
- **Actions Sanitaires** :
    - Fournit des cartes d'action pour accéder à différentes fonctionnalités :
        - **Prophylaxie Médicale** : Gestion des vaccins et traitements.
        - **Mise à Jour Quotidienne** : Enregistrement des malades et de la mortalité.
        - **Prophylaxie Sanitaire** : Planification du nettoyage et de la biosécurité.
        - **Analyse par IA** : Accès à l'écran d'analyse de santé par photo.
- **Historique** :
    - Affiche un historique des analyses et vaccins récents.
- **Gestion des données** :
    - Utilise les hooks `useData` et `useFinance` pour récupérer les données des lots, du stock et les résumés financiers.
    - Charge les rations des lots pour l'analyse de la consommation.
- **Interface utilisateur** :
    - Utilise des "bottom sheets" pour les formulaires de prophylaxie et de mise à jour de la santé.
    - Gère le bouton "retour" sur Android pour naviguer vers le tableau de bord.
    - Affiche un indicateur de chargement pendant la récupération des données.
    - Utilise des dégradés de couleurs et des icônes pour une présentation moderne.

### `help-support.tsx`

Cet écran centralise les ressources d'aide et de support pour les utilisateurs de l'application.

- **Contact** :
    - Permet aux utilisateurs de contacter le support technique par email pour des questions générales ou pour signaler un problème.
- **Foire Aux Questions (FAQ)** :
    - Une section FAQ complète avec des questions-réponses sur les fonctionnalités clés de l'application (ajout de lots, gestion de stock, rations automatiques, marketplace, analyse IA, finances, etc.).
    - Les réponses sont détaillées et mettent en avant les avantages de chaque fonctionnalité.
    - Les questions/réponses sont interactives et s'ouvrent/se ferment pour une meilleure lisibilité.
- **Informations Légales** :
    - Des liens (actuellement des alertes de placeholder) vers les Conditions Générales d'Utilisation (CGU) et la Politique de Confidentialité.
- **Interface utilisateur** :
    - Utilise des icônes pour illustrer les différentes sections et actions.
    - Le design est clair et facile à naviguer.

### `lots.tsx`

Cet écran est le module central pour gérer les lots de volailles. Il offre une vue détaillée et interactive des lots, avec des outils d'analyse et d'intelligence artificielle.

- **Tableau de bord visuel** :
    - Affiche des cartes analytiques (KPIs) pour le nombre total de volailles, les lots actifs, l'âge moyen et un score de santé général.
    - Intègre des "skeleton loaders" pour améliorer l'expérience utilisateur pendant le chargement des données.
- **Recommandations IA** :
    - Fournit des "insights" générés par l'IA, tels que des alertes de mortalité élevée, des fenêtres de vente optimales et des analyses de croissance.
- **Gestion des lots** :
    - Affiche les lots dans la liste avec un aperçu de leurs caractéristiques (nom, race, quantité, âge, santé, etc.).
    - Permet de filtrer les lots par statut (`tous`, `actifs`, `archivés`).
    - Permet d'archiver un lot.
- **Ajout de lots** :
    - Un bouton flottant (`FloatingActionButton`) permet d'ouvrir un formulaire (`AddLotForm`) pour ajouter un nouveau lot.
- **Suivi intelligent IA par lot** :
    - Chaque carte de lot est cliquable et ouvre un tableau de bord d'intelligence spécifique au lot (`LotIntelligenceDashboard`), offrant une analyse plus approfondie.
- **Calcul dynamique** :
    - Calcule dynamiquement l'âge des volailles et le taux de mortalité.
    - Détermine le stade de développement des volailles (`starter`, `grower`, `finisher`, `layer`, `pre-layer`) en fonction de leur type d'oiseau et de leur âge.
- **Navigation** :
    - Intègre une barre de navigation inférieure (`BottomNavigation`).
- **Interaction utilisateur** :
    - Utilise des "bottom sheets" pour les formulaires et les tableaux de bord d'intelligence.
    - Propose des messages d'état clairs pour les listes vides.

### `marketplace.tsx`

Cet écran est le cœur de la place de marché de l'application, permettant aux utilisateurs de découvrir, acheter et vendre des produits avicoles.

- **Navigation et Recherche** :
    - Barre de recherche pour trouver des produits par nom ou description.
    - Filtres par catégorie (Alimentation, Médicaments, Équipement, Volailles, etc.).
    - Filtres par région pour affiner les résultats.
- **Affichage des produits** :
    - Affiche les produits sous forme de cartes (`ProductCard`) avec image, nom, prix, et informations sur le vendeur.
    - Gère les états de chargement et d'erreur avec des indicateurs visuels.
    - Affiche un message si aucun produit ne correspond aux filtres.
- **Recommandations IA** :
    - Utilise un `marketingAgent` pour générer des recommandations de produits personnalisées basées sur le profil de l'utilisateur.
    - Les produits recommandés sont mis en avant dans une section dédiée.
- **Détail du produit** :
    - Lorsqu'un produit est sélectionné, une "bottom sheet" affiche ses détails complets (description, localisation, informations sur le vendeur).
    - Permet de contacter le vendeur via un chat (`MarketplaceChat`).
    - Permet d'ajouter le produit au panier.
- **Gestion des produits pour les vendeurs** :
    - Si l'utilisateur est le vendeur du produit, des options pour mettre à jour (marquer comme vendu/en stock) ou supprimer le produit sont disponibles.
- **Panier d'achat** :
    - Un badge sur l'icône du panier indique le nombre d'articles.
    - Ouvre une "bottom sheet" pour afficher le contenu du panier (`ShoppingCart`).
- **Ajout de produits** :
    - Un bouton permet aux vendeurs d'ajouter de nouveaux produits via l'écran `AddProductScreen`.
- **Avis et évaluations des vendeurs** :
    - Affiche la note moyenne du vendeur et le nombre total d'avis.
    - Permet de consulter les avis détaillés des clients pour un vendeur spécifique.
    - Les vendeurs avec de bonnes notes reçoivent des badges (Vendeur d'Or, d'Argent, de Bronze).
- **Sécurité** :
    - Une note de sécurité informe l'utilisateur que la communication avec les vendeurs est anonyme et sécurisée.
- **Chargement des données** :
    - Charge les produits, le profil de l'utilisateur, le nombre d'articles dans le panier et les statistiques des vendeurs depuis Supabase.
    - Gère le rafraîchissement des données.
- **Interface utilisateur** :
    - Utilise des "bottom sheets" pour les détails des produits, le chat, le panier et l'ajout de produits.
    - Design réactif avec des filtres et des sections bien organisées.


### `marketplace-messages.tsx`

Cet écran gère la messagerie interne de la place de marché, permettant aux utilisateurs de communiquer avec les vendeurs ou acheteurs concernant les produits.

- **Chargement des conversations** :
    - Récupère tous les messages de la table `marketplace_messages` pour l'utilisateur connecté.
    - Agrège les messages par produit et par interlocuteur pour former des conversations.
    - Récupère les informations des produits (`marketplace_products`) et des utilisateurs (`profiles`) associés aux messages.
- **Affichage des conversations** :
    - Affiche une liste de cartes de conversation, chacune représentant un échange avec un autre utilisateur sur un produit spécifique.
    - Chaque carte affiche le nom de l'interlocuteur, le nom du produit, le dernier message, l'heure du dernier message et un indicateur de messages non lus.
- **Messages non lus** :
    - Compte les messages non lus pour chaque conversation et les affiche via un badge.
    - Marque les messages comme lus lorsque l'utilisateur ouvre une conversation.
- **Chat en temps réel** :
    - Utilise les abonnements en temps réel de Supabase (`supabase.channel('marketplace_messages_changes')`) pour mettre à jour la liste des conversations dès qu'un nouveau message est envoyé ou reçu.
- **Vue détaillée du chat** :
    - Lorsqu'une conversation est sélectionnée, une "bottom sheet" s'ouvre pour afficher le composant `MarketplaceChat`, permettant une interaction complète (envoi/réception de messages).
- **Formatage de l'heure** :
    - Formate l'heure du dernier message de manière conviviale (par exemple, "Il y a 5min", "Il y a 2j").
- **Interface utilisateur** :
    - Affiche un indicateur de chargement pendant la récupération des conversations.
    - Gère les états vides (aucun message) avec un message clair.



### `index.tsx`

Ce fichier est le point d'entrée initial de l'application. Son rôle principal est de déterminer si l'utilisateur a déjà complété le processus d'intégration (onboarding).

- **Vérification de l'onboarding** :
    - Au démarrage, il vérifie la valeur stockée dans `AsyncStorage` sous la clé `@onboarding_completed`.
    - Si l'onboarding a déjà été complété, l'application redirige vers l'écran d'authentification (`/auth`). Le `_layout.tsx` prendra ensuite le relais pour rediriger vers le tableau de bord si l'utilisateur est déjà connecté.
    - Si l'onboarding n'a pas été complété, l'application redirige vers l'écran de bienvenue (`/welcome`) pour démarrer le processus d'intégration.
- **Indicateur de chargement** :
    - Pendant la vérification du statut de l'onboarding, un simple indicateur de chargement est affiché.




### `financial-dashboard.tsx`

Cet écran est un conteneur pour le tableau de bord financier. Il affiche le composant `FinancialDashboard` situé dans `src/components/finance/FinancialDashboard.tsx`, qui contient toute la logique et la présentation du tableau de bord financier.















