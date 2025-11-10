import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, commonStyles } from '../styles/commonStyles';
import Icon from '../components/Icon';
import { router } from 'expo-router';
import { ensureSupabaseInitialized } from './integrations/supabase/client';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../contexts/SubscriptionContext';
import Button from '../components/Button';
import { smartAlertSystem } from '../src/intelligence/core/SmartAlertSystem'; // Importer le singleton
import { useDataCollector } from '../src/hooks/useDataCollector';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const [profile, setProfile] = useState<{
    full_name: string | null;
    farm_name: string | null;
    phone: string | null;
    location: string | null;
    role: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [avicoins, setAvicoins] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editingFarmName, setEditingFarmName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { trackAction } = useDataCollector();

  useEffect(() => {
    if (user) {
      loadProfile();
      loadAvicoins();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const supabase = await ensureSupabaseInitialized();
      const { data, error } = await supabase
        .from('profiles') // Correction: 'profiles' au lieu de 'profile'
        .select('full_name, farm_name, phone, location, role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvicoins = async () => {
    if (!user) return;
    try {
      const supabase = await ensureSupabaseInitialized();
      const { data, error } = await supabase
        .from('user_avicoins')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading avicoins:', error);
      } else {
        setAvicoins(data?.balance || 0);
      }
    } catch (error) {
      console.error('Error loading avicoins:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            try {
              // Vider le cache des systèmes intelligents avant la déconnexion
              smartAlertSystem.clearCache();
              // dataCollector.clearCache(); // Si le dataCollector a aussi un cache

              const supabase = await ensureSupabaseInitialized();
              await supabase.auth.signOut();

              // Réinitialiser l'onboarding pour permettre de le revoir
              await AsyncStorage.removeItem('@onboarding_completed');
              await AsyncStorage.removeItem('@user_session');

              router.replace('/welcome');
            } catch (error: any) {
              console.log('Error logging out:', error);
              Alert.alert('Erreur', 'Impossible de se déconnecter');
            }
          },
        },
      ]
    );
  };

  const handleResetOnboarding = async () => {
    Alert.alert(
      "Réinitialiser l'accueil",
      "Êtes-vous sûr ? Vous serez déconnecté et verrez l'écran de bienvenue au prochain démarrage.",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('@onboarding_completed');
              await handleLogout(); // Utilise la fonction de déconnexion existante
            } catch (error) {
              console.error('Error resetting onboarding:', error);
              Alert.alert('Erreur', 'Impossible de réinitialiser l\'accueil.');
            }
          },
        },
      ]
    );
  };

  const handleSaveFarmName = async (newFarmName: string) => {
    if (!user) return;
    if (!newFarmName.trim()) {
      Alert.alert('Erreur', 'Le nom de la ferme ne peut pas être vide.');
      return;
    }

    setIsSaving(true);
    try {
      const supabase = await ensureSupabaseInitialized();
      const { error } = await supabase
        .from('profiles')
        .update({ farm_name: newFarmName.trim(), updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      // Mettre à jour l'état local
      setProfile(prev => prev ? { ...prev, farm_name: newFarmName.trim() } : null);
      setIsEditing(false);
      Alert.alert('Succès', 'Le nom de votre ferme a été mis à jour.');

      // Recharger le profil pour être sûr
      await loadProfile();

    } catch (error: any) {
      console.error('Error saving farm name:', error);
      Alert.alert('Échec', `Impossible de sauvegarder le nom de la ferme: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };


  if (loading || subscriptionLoading) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement du profil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Section Informations Personnelles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations Personnelles</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Icon name="person" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Nom complet</Text>
                <Text style={styles.infoValue}>{profile?.full_name || 'Non défini'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Icon name="call" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Téléphone</Text>
                <Text style={styles.infoValue}>{profile?.phone || 'Non défini'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Icon name="location" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Localisation</Text>
                <Text style={styles.infoValue}>{profile?.location || 'Non définie'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section Exploitation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exploitation</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Icon name="business" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Nom de la ferme</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.editableInfoValue}
                    value={editingFarmName}
                    onChangeText={setEditingFarmName}
                    placeholder="Nom de votre ferme"
                    autoFocus
                    onSubmitEditing={() => handleSaveFarmName(editingFarmName)}
                  />
                ) : (
                  <Text style={styles.infoValue}>{profile?.farm_name || 'Non défini'}</Text>
                )}
              </View>
              <View>
                {isEditing ? (
                  <Button text={isSaving ? "..." : "OK"} onPress={() => handleSaveFarmName(editingFarmName)} style={styles.saveButton} textStyle={styles.saveButtonText} />
                ) : (
                  <TouchableOpacity onPress={() => { setIsEditing(true); setEditingFarmName(profile?.farm_name || ''); }}>
                    <Text style={styles.editButtonText}>Modifier</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.infoRow}>
              <Icon name="card" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Rôle</Text>
                <Text style={styles.infoValue}>{profile?.role || 'Utilisateur'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section Abonnement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Abonnement & Crédits</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Icon name="star" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Plan actuel</Text>
                <Text style={styles.infoValue}>{subscription?.plan?.name || 'Freemium'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Icon name="cash" size={20} color={colors.warning} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Avicoins</Text>
                <Text style={[styles.infoValue, { color: colors.warning }]}>{avicoins} Avicoins</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section Administration (pour les admins) */}
        {profile?.role === 'admin' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Administration</Text>

            <View style={styles.adminCard}>
              <TouchableOpacity style={styles.adminButton} onPress={() => router.push('/admin/manage-ads')}>
                <Icon name="megaphone" size={24} color={colors.white} />
                <Text style={styles.adminButtonText}>Gérer les Publicités</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.adminButton} onPress={() => router.push('/admin-driver-validation')}>
                <Icon name="car" size={24} color={colors.white} />
                <Text style={styles.adminButtonText}>Valider les Livreurs</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.adminButton} onPress={() => router.push('/admin-kyc')}>
                <Icon name="document" size={24} color={colors.white} />
                <Text style={styles.adminButtonText}>Gestion KYC</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Boutons d'actions */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.actionButton} onPress={() => {
            // TRACKER L'ACCÈS AUX PARAMÈTRES
            trackAction('settings_accessed', {
              from_screen: 'profile'
            });
            router.push('/settings');
          }}>
            <Icon name="settings" size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>Paramètres</Text>
            <Icon name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => {
            // TRACKER L'ACCÈS À LA GESTION D'ABONNEMENT
            trackAction('subscription_management_accessed', {
              current_plan: subscription?.plan?.name || 'Freemium',
              from_screen: 'profile'
            });
            router.push('/subscription-plans');
          }}>
            <Icon name="card" size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>Gérer l'abonnement</Text>
            <Icon name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => {
            // TRACKER L'ACCÈS AU SUPPORT
            trackAction('support_accessed', {
              from_screen: 'profile'
            });
            router.push('/help-support');
          }}>
            <Icon name="help-circle" size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>Aide & Support</Text>
            <Icon name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* --- NOUVEAU BOUTON --- */}
          <TouchableOpacity style={[styles.actionButton, { marginTop: 16 }]} onPress={handleResetOnboarding}>
            <Icon name="refresh-circle" size={20} color={colors.warning} />
            <Text style={styles.actionButtonText}>Réinitialiser l'accueil</Text>
            <Icon name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>


        </View>

        {/* Bouton de déconnexion */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={() => {
            // TRACKER LA DÉCONNEXION
            trackAction('user_logout', {
              session_duration: 'unknown', // Pourrait être calculé avec un timer
              from_screen: 'profile'
            });
            handleLogout();
          }}>
            <Icon name="log-out" size={20} color={colors.error} />
            <Text style={styles.logoutButtonText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  editButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    paddingHorizontal: 8,
  },
  editableInfoValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
    borderBottomWidth: 1,
    borderColor: colors.primary,
    paddingBottom: 2,
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 14,
  },
  adminCard: {
    gap: 12,
  },
  adminButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
  },
  logoutSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: colors.error + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error + '20',
  },
  logoutButtonText: {
    fontSize: 16,
    color: colors.error,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  bottomPadding: {
    height: 100,
  },
});
