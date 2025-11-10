
# Guide de Résolution des Problèmes de Connexion Ngrok

## 🔍 Qu'est-ce que Ngrok?

Ngrok est un service de tunneling qui permet à votre téléphone de se connecter à votre serveur de développement Expo même s'ils ne sont pas sur le même réseau. Expo l'utilise automatiquement en mode tunnel.

## ❌ Erreur Commune: err_ngrok

Cette erreur se produit lorsque le tunnel ngrok ne peut pas être établi, empêchant votre appareil de se connecter au serveur de développement.

## 🔧 Solutions (Par Ordre de Préférence)

### ✅ Solution 1: Mode LAN (RECOMMANDÉ)

Le mode LAN est la méthode la plus stable et ne nécessite pas de tunnel ngrok.

**Prérequis:**
- Votre ordinateur et votre téléphone doivent être sur le même réseau Wi-Fi

**Étapes:**
1. Arrêtez le serveur Expo actuel (Ctrl+C dans le terminal)
2. Redémarrez avec: `npm run dev:lan`
3. Scannez le nouveau QR code avec Expo Go

**Avantages:**
- Plus rapide
- Plus stable
- Pas de dépendance externe
- Fonctionne sans connexion Internet

### Solution 2: Mode Par Défaut

Le mode par défaut détecte automatiquement la meilleure méthode.

```bash
npm run dev
```

Expo essaiera d'utiliser LAN en premier, puis tunnel si nécessaire.

### Solution 3: Vérifier la Connexion Internet

Si vous devez absolument utiliser le tunnel:

**Vérifications:**
- ✓ Connexion Internet stable
- ✓ Désactiver le VPN temporairement
- ✓ Vérifier le pare-feu (autoriser ngrok)
- ✓ Redémarrer le routeur si nécessaire

Puis réessayez:
```bash
npm run dev:tunnel
```

### Solution 4: Réinstaller les Dépendances

Parfois, le package @expo/ngrok peut avoir besoin d'être réinstallé:

```bash
# 1. Arrêter le serveur Expo
# 2. Supprimer node_modules et package-lock.json
rm -rf node_modules package-lock.json

# 3. Réinstaller
npm install

# 4. Redémarrer
npm run dev:lan
```

### Solution 5: Mode Localhost (Émulateurs Uniquement)

Pour les émulateurs Android/iOS sur le même ordinateur:

```bash
npm run dev:localhost
```

⚠️ **Note:** Ne fonctionne qu'avec les émulateurs, pas les appareils physiques.

## 📋 Commandes Disponibles

| Commande | Description | Cas d'Usage |
|----------|-------------|-------------|
| `npm run dev` | Mode automatique | Détection automatique |
| `npm run dev:lan` | Mode LAN | **Recommandé** - Même réseau Wi-Fi |
| `npm run dev:tunnel` | Mode tunnel | Réseaux différents |
| `npm run dev:localhost` | Mode localhost | Émulateurs uniquement |

## 🔍 Diagnostic des Problèmes

### Vérifier l'État de la Connexion

L'application inclut des outils de diagnostic:

1. **Page de Vérification de Connexion**
   - Accessible via: `/connection-check`
   - Vérifie: Internet, Supabase, État du projet

2. **Page de Diagnostics**
   - Accessible via: `/diagnostics`
   - Tests détaillés de tous les services

3. **Aide Ngrok**
   - Accessible via: `/ngrok-help`
   - Guide interactif de résolution

### Problèmes Courants et Solutions

#### Problème: "Connection refused"
**Solution:** Utilisez le mode LAN au lieu du tunnel
```bash
npm run dev:lan
```

#### Problème: "Tunnel connection failed"
**Solutions:**
1. Vérifier la connexion Internet
2. Désactiver le VPN
3. Vérifier le pare-feu
4. Utiliser le mode LAN

#### Problème: "Cannot connect to Metro"
**Solutions:**
1. Redémarrer le serveur avec `--clear`:
```bash
npm run dev
```
2. Vérifier que le port n'est pas utilisé
3. Redémarrer l'ordinateur si nécessaire

#### Problème: QR Code ne fonctionne pas
**Solutions:**
1. Saisir manuellement l'URL dans Expo Go
2. Vérifier que les deux appareils sont sur le même réseau
3. Essayer de scanner avec l'appareil photo natif

## 📱 Sur l'Appareil Mobile

### Après Redémarrage du Serveur:

1. **Ouvrir Expo Go**
   - Assurez-vous d'avoir la dernière version

2. **Scanner le QR Code**
   - Utilisez le scanner intégré d'Expo Go
   - Ou l'appareil photo natif (iOS)

3. **Si le Problème Persiste:**
   - Fermer complètement Expo Go
   - Vider le cache de l'application
   - Rouvrir et réessayer

### Saisie Manuelle de l'URL:

Si le QR code ne fonctionne pas:

1. Dans Expo Go, appuyez sur "Enter URL manually"
2. Saisissez l'URL affichée dans le terminal
3. Format: `exp://192.168.x.x:8081`

## 💡 Bonnes Pratiques

### Pour le Développement Quotidien:

1. **Utilisez le Mode LAN**
   ```bash
   npm run dev:lan
   ```
   - Plus rapide
   - Plus stable
   - Moins de problèmes

2. **Gardez les Appareils sur le Même Réseau**
   - Même Wi-Fi pour l'ordinateur et le téléphone
   - Évitez les réseaux d'entreprise avec restrictions

3. **Évitez le Mode Tunnel Sauf Nécessité**
   - Utilisez-le uniquement pour tester sur des réseaux différents
   - Plus lent et moins fiable

### Pour le Débogage:

1. **Vérifiez les Logs**
   - Terminal: Messages d'erreur du serveur
   - Expo Go: Erreurs de l'application

2. **Utilisez les Outils de Diagnostic**
   - `/connection-check` pour l'état général
   - `/diagnostics` pour les détails techniques

3. **Redémarrez avec --clear**
   ```bash
   npm run dev
   ```
   - Efface le cache Metro
   - Résout beaucoup de problèmes

## 🆘 Aide Supplémentaire

### Dans l'Application:

- **Bouton "Aide Ngrok"** dans les écrans de connexion
- **Page dédiée** `/ngrok-help` avec solutions interactives
- **Diagnostics automatiques** pour identifier les problèmes

### Ressources Externes:

- [Documentation Expo - Serveur de Développement](https://docs.expo.dev/guides/how-expo-works/#expo-development-server)
- [Documentation Ngrok](https://ngrok.com/docs)
- [Expo Forums](https://forums.expo.dev/)

## 🔄 Workflow Recommandé

### Démarrage Quotidien:

```bash
# 1. Démarrer en mode LAN
npm run dev:lan

# 2. Scanner le QR code avec Expo Go

# 3. Si problème, vérifier la connexion
# Aller à /connection-check dans l'app
```

### En Cas de Problème:

```bash
# 1. Arrêter le serveur (Ctrl+C)

# 2. Redémarrer avec clear
npm run dev

# 3. Si toujours un problème, utiliser LAN
npm run dev:lan

# 4. En dernier recours, réinstaller
rm -rf node_modules package-lock.json
npm install
npm run dev:lan
```

## ⚠️ Notes Importantes

1. **Le Mode Tunnel n'est PAS Nécessaire** pour la plupart des cas d'usage
2. **Le Mode LAN est Plus Rapide et Plus Fiable**
3. **Gardez Expo Go à Jour** pour éviter les problèmes de compatibilité
4. **Utilisez les Outils de Diagnostic** intégrés à l'application

## 📞 Support

Si les problèmes persistent après avoir essayé toutes les solutions:

1. Vérifiez les logs détaillés dans le terminal
2. Utilisez `/diagnostics` pour un rapport complet
3. Consultez les forums Expo
4. Vérifiez que votre projet Supabase est actif

---

**Dernière mise à jour:** Version 1.0.1
**Compatibilité:** Expo 54, React Native 0.81.4
