import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Button from '../components/Button';
import Icon from '../components/Icon';
import * as Linking from 'expo-linking';
import { getSupabaseClient, getUserFriendlyErrorMessage, isProjectPausedError } from '../config';
// import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
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
  const searchParams = useLocalSearchParams();
  const referralCode = searchParams.referral_code as string || '';

  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [farmName, setFarmName] = useState(''); // New state for farm name
  const [referralInput, setReferralInput] = useState(referralCode || ''); // Pre-fill with referral code from URL
  const [referralError, setReferralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Configuration de la nouvelle bibliothèque Google Sign-In
  useEffect(() => {
    // GoogleSignin.configure({
    //   webClientId: '1022343342905-ltrnlgnc74to5nle94s4a66ps8khcv50.apps.googleusercontent.com',
    // });
  }, []);
  useEffect(() => {
    checkConnectionStatus();

    // Handle OAuth callback
    const handleAuthCallback = async () => {
      try {
        const supabase = await getSupabaseClient();
        const { data: { session }, error } = await supabase.auth.getSession();

        console.log('🔍 Checking auth session:', { hasSession: !!session, error });

        if (session && !error) {
          console.log('✅ OAuth successful, user authenticated:', session.user.email);

          // If we have referral code from URL params, update the profile
          if (referralInput.trim()) {
            console.log('🔗 Processing referral code:', referralInput);
            const validation = await validateReferralCode(referralInput);
            if (validation.isValid) {
              console.log('✅ Referral code valid, updating profile');
              const { error: profileUpdateError } = await supabase
                .from('profiles')
                .update({
                  referred_by_code: referralInput,
                  referred_by: validation.referrerId,
                })
                .eq('id', session.user.id);

              if (profileUpdateError) {
                console.error('❌ Error updating profile with referral:', profileUpdateError);
              } else {
                console.log('✅ Profile updated with referral information');
              }
            } else {
              console.log('❌ Referral code invalid');
            }
          }

          // Redirect to dashboard
          console.log('🏠 Redirecting to dashboard');
          router.replace('/dashboard');
        } else if (error) {
          console.error('❌ Auth session error:', error);
        }
      } catch (error) {
        console.error('❌ Error handling auth callback:', error);
      }
    };

    handleAuthCallback();

    // Auth state listener is handled in _layout.tsx
  }, [referralInput]);

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

  const validateReferralCode = async (code: string): Promise<{ isValid: boolean; referrerId?: string }> => {
    if (!code.trim()) {
      return { isValid: true }; // Empty code is valid (optional)
    }

    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, referral_code')
        .eq('referral_code', code.trim().toUpperCase()); // Ensure case insensitive matching

      console.log('Referral code validation:', {
        inputCode: code.trim(),
        found: data && data.length > 0,
        data,
        error
      });

      if (error || !data || data.length === 0) {
        console.log('Referral code not found or error:', error);
        return { isValid: false };
      }

      return { isValid: true, referrerId: data[0].id };
    } catch (error) {
      console.error('Error validating referral code:', error);
      return { isValid: false };
    }
  };

  // const handleGoogleAuth = async () => {
  //   try {
  //     setErrorMessage(null);
  //     setSuccessMessage(null);
  //     setLoading(true);

  //     // 1. Vérifier si les services Google Play sont disponibles
  //     await GoogleSignin.hasPlayServices();

  //     // 2. Récupérer les informations de l'utilisateur depuis Google
  //     const { idToken } = await GoogleSignin.signIn();

  //     if (idToken) {
  //       const supabase = await getSupabaseClient();
  //       // 3. Authentifier l'utilisateur auprès de Supabase avec le token
  //       const { data, error } = await supabase.auth.signInWithIdToken({
  //         provider: 'google',
  //         token: idToken,
  //       });

  //       if (error) {
  //         throw error; // L'erreur sera attrapée par le bloc catch
  //       }

  //       // Si tout va bien, la session est gérée par le listener global dans _layout.tsx
  //       // et l'utilisateur sera redirigé.
  //       console.log('✅ Connexion Google réussie avec Supabase:', data);

  //       // Après la connexion, vérifions si le profil existe et créons-le si nécessaire
  //       if (data.user) {
  //         const { data: profile, error: profileError } = await supabase
  //           .from('profiles')
  //           .select('id')
  //           .eq('id', data.user.id)
  //           .single();

  //         // Si le profil n'existe pas, on le crée
  //         if (!profile && data.user.email) {
  //           console.log('👤 Profil non trouvé, création en cours...');
  //           const { error: createError } = await supabase
  //             .from('profiles')
  //             .insert({
  //               id: data.user.id,
  //               email: data.user.email,
  //               full_name: data.user.user_metadata.full_name || data.user.user_metadata.name || 'Utilisateur Google',
  //               // Appliquer le code de parrainage si disponible
  //               referred_by_code: referralInput.trim() || null,
  //             });

  //           if (createError) {
  //             console.error('❌ Erreur lors de la création du profil après la connexion Google:', createError);
  //             setErrorMessage('Erreur lors de la finalisation de votre profil.');
  //           } else {
  //             console.log("✅ Profil créé avec succès pour l'utilisateur Google.");
  //           }
  //         } else if (profileError) {
  //           // Gérer le cas où la requête de vérification du profil échoue
  //           console.error('❌ Erreur lors de la vérification du profil:', profileError);
  //         }
  //       }

  //     } else {
  //       throw new Error('Aucun ID token reçu de Google');
  //     }

  //   } catch (error: any) {
  //     console.log('❌ Google auth error:', error);
  //     if (error.code === statusCodes.SIGN_IN_CANCELLED) {
  //       // L'utilisateur a annulé, pas besoin d'afficher une erreur
  //     } else if (error.code === statusCodes.IN_PROGRESS) {
  //       Alert.alert('Connexion en cours...');
  //     } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
  //       Alert.alert('Erreur', 'Les services Google Play ne sont pas disponibles sur cet appareil.');
  //     } else {
  //       // Pour toutes les autres erreurs
  //       setErrorMessage(getUserFriendlyErrorMessage(error));
  //     }
  //   } finally {
  //     setLoading(false);
  //   }
  // };

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

        // Validation du code de parrainage avant de continuer
        if (referralInput.trim()) {
          const validation = await validateReferralCode(referralInput);
          if (!validation.isValid) {
            setReferralError('Code de parrainage invalide. Vérifiez le code et réessayez.');
            return; // Arrêter le processus si le code est invalide
          }
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

        // Validate referral code if provided
        let referrerId = null;
        if (referralInput.trim()) {
          const validation = await validateReferralCode(referralInput);
          if (!validation.isValid) {
            setReferralError('Code de parrainage invalide. Vérifiez le code et réessayez.');
            setLoading(false); // Arrêter le chargement
            return;
          }
          referrerId = validation.referrerId;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            // emailRedirectTo removed - will use default from Supabase settings
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

          // Stratégie : Essayer d'abord UPDATE (si un trigger a déjà créé le profil)
          // Si cela ne modifie rien (pas de profil), alors seulement faire un INSERT.
          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({
              full_name: name,
              farm_name: farmName,
              referred_by_code: referralInput || null,
              referred_by: referrerId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', data.user.id)
            .select();

          let finalError = updateError;

          // Si aucune ligne n'a été mise à jour et qu'il n'y a pas d'erreur technique,
          // cela veut dire que le profil n'existe pas encore. On tente un INSERT.
          if (!updateError && (!updatedProfile || updatedProfile.length === 0)) {
            console.log('ℹ️ Profil non trouvé lors de l\'update, tentative d\'insertion manuelle...');
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                full_name: name,
                farm_name: farmName,
                referred_by_code: referralInput || null,
                referred_by: referrerId,
                updated_at: new Date().toISOString(),
              });
            finalError = insertError;
          }

          if (finalError) {
            // ... error handling using finalError ...
            console.error('❌ Error creating/updating profile:', finalError);
            setErrorMessage('Erreur lors de la création du profil.');

            // Tenter de supprimer l'utilisateur qui vient d'être créé pour éviter un compte "fantôme"
            // ATTENTION : Cela nécessite des privilèges d'admin pour le client Supabase.
            // Si vous n'utilisez pas un client admin, cette opération échouera silencieusement
            // et il est plus sûr de simplement déconnecter l'utilisateur.
            try {
              await supabase.auth.signOut();
              console.log('Signed out user due to profile creation failure.');
            } catch (signOutError) {
              console.error('Error signing out after profile creation failure:', signOutError);
            }
            return;
          }

          setSuccessMessage('Inscription réussie! Vous pouvez maintenant vous connecter.');

          Alert.alert(
            'Inscription réussie! 🎉',
            'Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter avec vos identifiants.',
            [{ text: 'OK', onPress: () => switchMode('login') }]
          );
        } else {
          setErrorMessage('Erreur d\'inscription. Veuillez réessayer.');
        }
      } else if (mode === 'reset') {
        const redirectUrl = Linking.createURL('reset-password');
        console.log('🔄 Attempting password reset for:', email, 'Redirect:', redirectUrl);

        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim().toLowerCase(),
          {
            redirectTo: redirectUrl,
          }
        );

        if (error) {
          console.log('❌ Reset error:', error);
          setErrorMessage(getUserFriendlyErrorMessage(error));
        } else {
          console.log('✅ Reset email sent');
          setSuccessMessage('Si ce compte existe, un email a été envoyé. Vérifiez vos spams.');

          Alert.alert(
            'Vérifiez vos emails 📧',
            'Si un compte est associé à cette adresse, vous recevrez un lien de réinitialisation. Pensez à vérifier vos spams.',
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
    setReferralError(null);
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

          {mode === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Code de parrainage (optionnel)</Text>
              <TextInput
                style={[styles.input, referralError ? styles.inputError : null]}
                placeholder="Entrez un code de parrainage"
                placeholderTextColor={colors.textSecondary}
                value={referralInput}
                onChangeText={(text) => {
                  setReferralInput(text);
                  setReferralError(null); // Clear error when user types
                }}
                autoCapitalize="characters"
                editable={!loading}
              />
              <Text style={styles.helpText}>
                Si quelqu'un vous a invité, entrez son code pour gagner des récompenses.
              </Text>
              {referralError && (
                <Text style={styles.errorText}>{referralError}</Text>
              )}
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
                Utilisez l'email avec lequel vous vous êtes inscrit
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

          {
            /* {(mode === 'login' || mode === 'signup') && (
              <>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>ou</Text>
                  <View style={styles.dividerLine} />
                </View>
                <Button
                  title={loading ? 'Chargement...' : 'Continuer avec Google'}
                  onPress={handleGoogleAuth}
                  disabled={loading || connectionStatus === 'disconnected'}
                  style={styles.demoButton}
                  textStyle={{ color: colors.text }}
                />
              </>
            )} */
          }
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
