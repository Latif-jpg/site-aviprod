
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '../styles/commonStyles';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { router } from 'expo-router';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    padding: 20,
  },
  errorBox: {
    backgroundColor: colors.error + '20',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.error,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 15,
  },
  solutionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  solutionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  solutionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  solutionText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 10,
  },
  commandBox: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  commandText: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: colors.primary,
  },
  noteBox: {
    backgroundColor: colors.warning + '20',
    borderRadius: 12,
    padding: 15,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.warning,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  successBox: {
    backgroundColor: colors.success + '20',
    borderRadius: 12,
    padding: 15,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.success,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: 30,
    marginBottom: 20,
  },
  stepList: {
    marginTop: 10,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 10,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    marginRight: 8,
    minWidth: 20,
  },
  stepText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
  linkButton: {
    marginTop: 10,
    padding: 12,
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
    alignItems: 'center',
  },
  linkButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default function NgrokHelpScreen() {
  const handleOpenNgrokDocs = async () => {
    const url = 'https://ngrok.com/docs';
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Info', 'Visitez https://ngrok.com/docs pour plus d\'informations');
      }
    } catch (error) {
      console.log('Error opening URL:', error);
      Alert.alert('Info', 'Visitez https://ngrok.com/docs pour plus d\'informations');
    }
  };

  const handleOpenExpoDocs = async () => {
    const url = 'https://docs.expo.dev/guides/how-expo-works/#expo-development-server';
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Info', 'Visitez https://docs.expo.dev pour plus d\'informations');
      }
    } catch (error) {
      console.log('Error opening URL:', error);
      Alert.alert('Info', 'Visitez https://docs.expo.dev pour plus d\'informations');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Problème de Connexion Ngrok</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>❌ Erreur: err_ngrok</Text>
          <Text style={styles.errorText}>
            Le tunnel ngrok n&apos;a pas pu être établi. Cela empêche votre appareil de se connecter au serveur de développement Expo.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>🔍 Qu&apos;est-ce que Ngrok?</Text>
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            Ngrok est un service de tunneling qui permet à votre téléphone de se connecter à votre serveur de développement même s&apos;ils ne sont pas sur le même réseau. Expo l&apos;utilise automatiquement en mode tunnel.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>🔧 Solutions Recommandées</Text>

        <View style={styles.solutionCard}>
          <Text style={styles.solutionNumber}>✅ Solution 1 (Recommandée)</Text>
          <Text style={styles.solutionTitle}>Utiliser le Mode LAN</Text>
          <Text style={styles.solutionText}>
            Le mode LAN est plus stable et ne nécessite pas de tunnel ngrok. C&apos;est la méthode recommandée pour le développement local.
          </Text>
          
          <View style={styles.stepList}>
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>1.</Text>
              <Text style={styles.stepText}>
                Assurez-vous que votre ordinateur et votre téléphone sont connectés au même réseau Wi-Fi
              </Text>
            </View>
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>2.</Text>
              <Text style={styles.stepText}>
                Arrêtez le serveur Expo actuel (Ctrl+C dans le terminal)
              </Text>
            </View>
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>3.</Text>
              <Text style={styles.stepText}>
                Redémarrez avec la commande:
              </Text>
            </View>
          </View>
          
          <View style={styles.commandBox}>
            <Text style={styles.commandText}>npm run dev:lan</Text>
          </View>
          
          <View style={styles.stepList}>
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>4.</Text>
              <Text style={styles.stepText}>
                Scannez le nouveau QR code avec Expo Go
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.solutionCard}>
          <Text style={styles.solutionNumber}>Solution 2</Text>
          <Text style={styles.solutionTitle}>Utiliser le Mode Par Défaut</Text>
          <Text style={styles.solutionText}>
            Le mode par défaut détecte automatiquement la meilleure méthode de connexion (LAN ou tunnel).
          </Text>
          <View style={styles.commandBox}>
            <Text style={styles.commandText}>npm run dev</Text>
          </View>
        </View>

        <View style={styles.solutionCard}>
          <Text style={styles.solutionNumber}>Solution 3</Text>
          <Text style={styles.solutionTitle}>Vérifier votre Connexion Internet</Text>
          <Text style={styles.solutionText}>
            Si vous devez absolument utiliser le tunnel ngrok:
          </Text>
          
          <View style={styles.stepList}>
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>•</Text>
              <Text style={styles.stepText}>
                Vérifiez que vous avez une connexion Internet stable
              </Text>
            </View>
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>•</Text>
              <Text style={styles.stepText}>
                Désactivez temporairement votre VPN si vous en utilisez un
              </Text>
            </View>
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>•</Text>
              <Text style={styles.stepText}>
                Vérifiez que votre pare-feu n&apos;bloque pas ngrok
              </Text>
            </View>
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>•</Text>
              <Text style={styles.stepText}>
                Essayez de redémarrer votre routeur
              </Text>
            </View>
          </View>
          
          <Text style={styles.solutionText}>
            Puis réessayez:
          </Text>
          <View style={styles.commandBox}>
            <Text style={styles.commandText}>npm run dev:tunnel</Text>
          </View>
        </View>

        <View style={styles.solutionCard}>
          <Text style={styles.solutionNumber}>Solution 4</Text>
          <Text style={styles.solutionTitle}>Installer/Mettre à Jour @expo/ngrok</Text>
          <Text style={styles.solutionText}>
            Parfois, le package ngrok d&apos;Expo peut avoir besoin d&apos;être réinstallé:
          </Text>
          
          <View style={styles.stepList}>
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>1.</Text>
              <Text style={styles.stepText}>
                Arrêtez le serveur Expo
              </Text>
            </View>
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>2.</Text>
              <Text style={styles.stepText}>
                Supprimez le dossier node_modules et package-lock.json
              </Text>
            </View>
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>3.</Text>
              <Text style={styles.stepText}>
                Réinstallez les dépendances:
              </Text>
            </View>
          </View>
          
          <View style={styles.commandBox}>
            <Text style={styles.commandText}>npm install</Text>
          </View>
          
          <View style={styles.stepList}>
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>4.</Text>
              <Text style={styles.stepText}>
                Redémarrez le serveur
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.solutionCard}>
          <Text style={styles.solutionNumber}>Solution 5</Text>
          <Text style={styles.solutionTitle}>Utiliser Localhost (Émulateur Uniquement)</Text>
          <Text style={styles.solutionText}>
            Si vous utilisez un émulateur Android ou iOS sur le même ordinateur:
          </Text>
          <View style={styles.commandBox}>
            <Text style={styles.commandText}>npm run dev:localhost</Text>
          </View>
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              ⚠️ Cette option ne fonctionne qu&apos;avec les émulateurs, pas avec les appareils physiques.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>📋 Commandes Disponibles</Text>
        <View style={styles.successBox}>
          <Text style={styles.successTitle}>Scripts NPM Disponibles</Text>
          <View style={styles.stepList}>
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>•</Text>
              <Text style={styles.stepText}>
                <Text style={{fontWeight: 'bold'}}>npm run dev</Text> - Mode automatique (recommandé)
              </Text>
            </View>
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>•</Text>
              <Text style={styles.stepText}>
                <Text style={{fontWeight: 'bold'}}>npm run dev:lan</Text> - Mode LAN (le plus stable)
              </Text>
            </View>
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>•</Text>
              <Text style={styles.stepText}>
                <Text style={{fontWeight: 'bold'}}>npm run dev:tunnel</Text> - Mode tunnel avec ngrok
              </Text>
            </View>
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>•</Text>
              <Text style={styles.stepText}>
                <Text style={{fontWeight: 'bold'}}>npm run dev:localhost</Text> - Mode localhost (émulateurs)
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>💡 Conseil Important</Text>
          <Text style={styles.noteText}>
            Pour la plupart des cas d&apos;utilisation, le mode LAN (Solution 1) est suffisant et beaucoup plus fiable que le tunnel ngrok. 
            {'\n\n'}
            Le tunnel n&apos;est nécessaire que si vous devez tester l&apos;application depuis un réseau différent de celui de votre ordinateur de développement.
          </Text>
        </View>

        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>📱 Sur Votre Appareil Mobile</Text>
          <Text style={styles.noteText}>
            Après avoir redémarré le serveur avec une des solutions ci-dessus:
            {'\n\n'}
            1. Ouvrez l&apos;application Expo Go sur votre téléphone
            {'\n'}
            2. Scannez le nouveau QR code affiché dans le terminal
            {'\n'}
            3. L&apos;application devrait se charger correctement
            {'\n\n'}
            Si le problème persiste, essayez de fermer complètement Expo Go et de le rouvrir.
          </Text>
        </View>

        <View style={styles.successBox}>
          <Text style={styles.successTitle}>🔗 Ressources Utiles</Text>
          
          <TouchableOpacity style={styles.linkButton} onPress={handleOpenExpoDocs}>
            <Text style={styles.linkButtonText}>
              📖 Documentation Expo - Serveur de Développement
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.linkButton} onPress={handleOpenNgrokDocs}>
            <Text style={styles.linkButtonText}>
              📖 Documentation Ngrok
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Vérifier la Connexion"
            onPress={() => router.push('/connection-check')}
            variant="primary"
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Retour à l'accueil"
            onPress={() => router.push('/')}
            variant="secondary"
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Retour au Tableau de Bord"
            onPress={() => router.push('/dashboard')}
            variant="secondary"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
