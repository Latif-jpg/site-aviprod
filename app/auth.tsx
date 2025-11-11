
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { getSupabaseClient, getUserFriendlyErrorMessage, isProjectPausedError } from '../config'; // Import from config
import { colors, commonStyles } from '../styles/commonStyles';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 50,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logo: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputError: {
    borderColor: colors.error,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  buttonContainer: {
    marginTop: 30,
    gap: 12,
  },
  switchMode: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  switchModeText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  switchModeButton: {
    marginLeft: 4,
  },
  switchModeButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: colors.textSecondary,
  },
  demoButton: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    marginBottom: 16,
  },
  connectionStatusText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  errorBox: {
    backgroundColor: colors.error + '20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    lineHeight: 20,
  },
  successBox: {
    backgroundColor: colors.success + '20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.success,
  },
  successText: {
    fontSize: 14,
    color: colors.success,
    lineHeight: 20,
  },
      helpText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
      fontStyle: 'italic',
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundAlt,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    eyeIcon: {
      padding: 16,
    },
  });
export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [farmName, setFarmName] = useState(''); // New state for farm name
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      setConnectionStatus('checking');
      const client = await getSupabaseClient();
      
      if (client && client.auth) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.log('Connection check error:', error);
      setConnectionStatus('disconnected');
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleAuth = async () => {
    try {
      // Clear previous messages
      setErrorMessage(null);
      setSuccessMessage(null);

      // Validation
      if (!email || !validateEmail(email)) {
        setErrorMessage('Veuillez entrer une adresse email valide');
        return;
      }

      if (mode !== 'reset' && !password) {
        setErrorMessage('Veuillez entrer un mot de passe');
        return;
      }

      if (mode === 'signup') {
        if (password.length < 6) {
          setErrorMessage('Le mot de passe doit contenir au moins 6 caractères');
          return;
        }

        if (password !== confirmPassword) {
          setErrorMessage('Les mots de passe ne correspondent pas');
          return;
        }

        if (!name) {
          setErrorMessage('Veuillez entrer votre nom');
          return;
        }

        if (!farmName) {
          setErrorMessage('Veuillez entrer le nom de votre ferme');
          return;
        }
      }

      setLoading(true);
      const supabase = await getSupabaseClient();

      if (mode === 'login') {
        console.log('🔐 Attempting login for:', email);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) {
          console.log('❌ Login error:', error);
          
          // Provide specific error messages
          if (error.message.includes('Invalid login credentials')) {
            setErrorMessage('Email ou mot de passe incorrect. Vérifiez vos identifiants.');
          } else if (error.message.includes('Email not confirmed')) {
            setErrorMessage('Votre email n\'est pas encore confirmé. Vérifiez votre boîte de réception et cliquez sur le lien de confirmation.');
          } else {
            setErrorMessage(getUserFriendlyErrorMessage(error));
          }
        } else if (data.session) {
          console.log('✅ Login successful');
          setSuccessMessage('Connexion réussie! Redirection...');
          
          // Wait a moment to show success message
          setTimeout(() => {
            router.replace('/dashboard');
          }, 500);
        } else {
          setErrorMessage('Erreur de connexion. Veuillez réessayer.');
        }
      } else if (mode === 'signup') {
        console.log('📝 Attempting signup for:', email);
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: 'https://natively.dev/email-confirmed',
            data: {
              name: name, // name is already being passed here
            }
          }
        });

        if (error) {
          console.log('❌ Signup error:', error);
          
          if (error.message.includes('User already registered')) {
            setErrorMessage('Cet email est déjà enregistré. Essayez de vous connecter ou utilisez un autre email.');
          } else {
            setErrorMessage(getUserFriendlyErrorMessage(error));
          }
        } else if (data.user) {
          console.log('✅ Signup successful');
          
          // Update user profile with farm name and full name
          const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({ farm_name: farmName, full_name: name })
            .eq('id', data.user.id);

          if (profileUpdateError) {
            console.error('❌ Error updating profile with farm_name and full_name:', profileUpdateError);
            setErrorMessage('Erreur lors de la mise à jour du profil avec le nom de la ferme et le nom complet.');
            // Optionally, delete the user if profile update fails
            await supabase.auth.admin.deleteUser(data.user.id);
            return;
          }

          setSuccessMessage('Inscription réussie! Un email de confirmation a été envoyé à votre adresse.');
          
          Alert.alert(
            'Inscription réussie! 🎉',
            'Un email de confirmation a été envoyé à votre adresse. Veuillez vérifier votre boîte de réception et vos spams, puis cliquez sur le lien de confirmation avant de vous connecter.',
            [{ text: 'OK', onPress: () => switchMode('login') }]
          );
        } else {
          setErrorMessage('Erreur d\'inscription. Veuillez réessayer.');
        }
      } else if (mode === 'reset') {
        console.log('🔄 Attempting password reset for:', email);
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim().toLowerCase(),
          {
            redirectTo: 'https://natively.dev/reset-password',
          }
        );

        if (error) {
          console.log('❌ Reset error:', error);
          setErrorMessage(getUserFriendlyErrorMessage(error));
        } else {
          console.log('✅ Reset email sent');
          setSuccessMessage('Email de réinitialisation envoyé! Vérifiez votre boîte de réception.');
          
          Alert.alert(
            'Email envoyé 📧',
            'Un email de réinitialisation a été envoyé à votre adresse. Veuillez vérifier votre boîte de réception.',
            [{ text: 'OK', onPress: () => switchMode('login') }]
          );
        }
      }
    } catch (error: any) {
      console.log('❌ Auth error:', error);
      setErrorMessage(getUserFriendlyErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };



  const switchMode = (newMode: 'login' | 'signup' | 'reset') => {
    setMode(newMode);
    setPassword('');
    setConfirmPassword('');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.logo}>🐔</Text>
          <Text style={styles.title}>AviprodApp</Text>
          <Text style={styles.subtitle}>
            {mode === 'login' && 'Connectez-vous à votre compte'}
            {mode === 'signup' && 'Créez votre compte'}
            {mode === 'reset' && 'Réinitialisez votre mot de passe'}
          </Text>
        </View>

        <View style={styles.connectionStatus}>
          <Icon 
            name={connectionStatus === 'connected' ? 'checkmark-circle' : connectionStatus === 'checking' ? 'time' : 'alert-circle'} 
            size={16} 
            color={connectionStatus === 'connected' ? colors.success : connectionStatus === 'checking' ? colors.warning : colors.error} 
          />
          <Text style={styles.connectionStatusText}>
            {connectionStatus === 'connected' && 'Connecté au serveur'}
            {connectionStatus === 'checking' && 'Vérification de la connexion...'}
            {connectionStatus === 'disconnected' && 'Mode hors ligne - Connexion impossible'}
          </Text>
        </View>

        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {successMessage && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        )}

        <View style={styles.form}>
          {mode === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom complet</Text>
              <TextInput
                style={styles.input}
                placeholder="Entrez votre nom"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>
          )}

          {mode === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom de votre ferme *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nom de votre ferme"
                placeholderTextColor={colors.textSecondary}
                value={farmName}
                onChangeText={setFarmName}
                autoCapitalize="words"
                editable={!loading}
              />
              <Text style={styles.helpText}>
                Ce nom sera utilisé pour identifier votre exploitation.
              </Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errorMessage && !validateEmail(email) && email ? styles.inputError : null]}
              placeholder="votre@email.com"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setErrorMessage(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            {mode === 'login' && (
              <Text style={styles.helpText}>
                Utilisez l&apos;email avec lequel vous vous êtes inscrit
              </Text>
            )}
          </View>

          {mode !== 'reset' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0 }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setErrorMessage(null);
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  <Icon
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {mode === 'login' && (
                <TouchableOpacity 
                  style={styles.forgotPassword}
                  onPress={() => switchMode('reset')}
                  disabled={loading}
                >
                  <Text style={styles.forgotPasswordText}>
                    Mot de passe oublié?
                  </Text>
                </TouchableOpacity>
              )}
              {mode === 'signup' && (
                <Text style={styles.helpText}>
                  Minimum 6 caractères
                </Text>
              )}
            </View>
          )}

          {mode === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmer le mot de passe</Text>
            <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0 }, password && confirmPassword && password !== confirmPassword ? styles.inputError : null]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textSecondary}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setErrorMessage(null);
                  }}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  <Icon
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title={
              loading ? 'Chargement...' : 
              mode === 'login' ? 'Se connecter' :
              mode === 'signup' ? 'S\'inscrire' :
              'Réinitialiser'
            }
            onPress={handleAuth}
            disabled={loading || connectionStatus === 'disconnected'}
          />
        </View>

        <View style={styles.switchMode}>
          <Text style={styles.switchModeText}>
            {mode === 'login' && 'Pas encore de compte?'}
            {mode === 'signup' && 'Vous avez déjà un compte?'}
            {mode === 'reset' && 'Retour à la'}
          </Text>
          <TouchableOpacity
            style={styles.switchModeButton}
            onPress={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            disabled={loading}
          >
            <Text style={styles.switchModeButtonText}>
              {mode === 'login' && 'S\'inscrire'}
              {mode === 'signup' && 'Se connecter'}
              {mode === 'reset' && 'connexion'}
            </Text>
          </TouchableOpacity>
        </View>


      </ScrollView>
    </SafeAreaView>
  );
}
