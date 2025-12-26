import { supabase } from '../../config';
import { Button, View, Text, Alert, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import { colors } from '../../styles/commonStyles';

export default function Login() {

  async function signInWithGoogle() {
    console.log('🔐 Attempting Google auth from login screen');

    // Crée l'URL de redirection vers laquelle Google doit renvoyer l'utilisateur
    // après une connexion réussie. Expo Router gérera cette URL.
    // Le chemin 'auth/callback' n'a pas besoin de correspondre à un fichier réel.
    const redirectUrl = Linking.createURL('auth/callback');
    console.log('↪️ Redirect URL created:', redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      console.error('🚨 Google auth error:', error.message);
      Alert.alert("Erreur d'authentification", error.message);
    } else {
      console.log('✅ Google auth initiated - waiting for callback from web browser');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🐔</Text>
      <Text style={styles.title}>Bienvenue sur Aviprod</Text>
      <Text style={styles.subtitle}>Connectez-vous pour gérer votre élevage</Text>
      <Button title="Se connecter avec Google" onPress={signInWithGoogle} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  logo: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 40,
    textAlign: 'center',
  },
});