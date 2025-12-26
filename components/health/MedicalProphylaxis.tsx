import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../config';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../styles/commonStyles';
import Icon from '../Icon';

interface MedicalProphylaxisProps {
   onClose: () => void;
   onViewSanitaryPlan: () => void;
   onViewMedicalPlan: () => void;
 }

const MedicalProphylaxis: React.FC<MedicalProphylaxisProps> = ({ onClose, onViewSanitaryPlan, onViewMedicalPlan }) => {
  const router = useRouter();
  const { isSubscribed } = useAuth();

  const handleViewPlanClick = () => {
    if (isSubscribed) {
      onViewSanitaryPlan();
    } else {
      // Affiche une alerte pour proposer de s'abonner
      Alert.alert(
        'Fonctionnalité Premium',
        'Cette fonctionnalité est réservée aux abonnés. Voulez-vous voir les plans d\'abonnement ?',
        [
          {
            text: 'Annuler',
            style: 'cancel',
          },
          {
            text: 'Voir les abonnements',
            onPress: async () => {
              try {
                // Crée une action en attente dans Supabase pour reprendre après achat
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  await supabase.from('pending_user_actions').insert({
                    user_id: user.id,
                    action_type: 'view_sanitary_plan',
                    // --- CORRECTION : Inclure l'ID du plan dans le payload ---
                    // Nous supposons que l'ID du plan d'abonnement de base est connu
                    // ou peut être récupéré. Ici, nous utilisons un ID statique pour l'exemple.
                    payload: { returnTo: '/health', open: 'sanitary_plan', plan_id: 'VOTRE_PLAN_ID_PAR_DEFAUT' },
                  });
                }
              } catch (e) {
                console.warn('Impossible d\'enregistrer l\'action en attente:', e);
              } finally {
                router.push('/subscription-plans');
              }
            }
          }
        ]
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Prophylaxie Médicale</Text>
        <TouchableOpacity onPress={onClose}>
          <Icon name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <Text style={styles.description}>
        La prophylaxie médicale comprend les vaccins et les traitements médicamenteux préventifs pour protéger vos lots contre les maladies courantes.
      </Text>

      <View style={styles.infoCard}>
        <Icon name="information-circle" size={24} color={colors.primary} />
        <Text style={styles.infoText}>
          Un plan de prophylaxie bien suivi est essentiel pour minimiser la mortalité et garantir la rentabilité de votre élevage.
        </Text>
      </View>

      <TouchableOpacity style={styles.planButton} onPress={() => onViewMedicalPlan()}>
        <Icon name="medical" size={20} color={colors.white} />
        <Text style={styles.planButtonText}>Voir le Plan Médical</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.planButton} onPress={handleViewPlanClick}>
        <Icon name="document-text-outline" size={20} color={colors.white} />
        <Text style={styles.planButtonText}>Voir le Plan Sanitaire Recommandé</Text>
      </TouchableOpacity>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.primary,
    lineHeight: 20,
  },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  planButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});

export default MedicalProphylaxis;