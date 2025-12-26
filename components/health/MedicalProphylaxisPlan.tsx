import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { colors } from '../../styles/commonStyles';
import Icon from '../Icon';
import { supabase } from '../../config';

interface Vaccination {
  id: string;
  vaccine_name: string;
  due_date: string;
  status: 'pending' | 'completed' | 'overdue';
  description?: string;
}

interface MedicalProphylaxisPlanProps {
  lotId: string; // --- NOUVEAU : ID du lot pour charger les données spécifiques ---
  onClose: () => void;
  onAddVaccination: () => void;
  onBack: () => void; // --- NOUVEAU : Pour gérer le retour à la sélection de lot ---
}

export default function MedicalProphylaxisPlan({ lotId, onClose, onAddVaccination, onBack }: MedicalProphylaxisPlanProps) {
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'overdue' | 'completed'>('pending');

  // --- NOUVEAU : Fonction pour charger les vaccinations du lot sélectionné ---
  const loadVaccinationsForLot = useCallback(async () => {
    if (!lotId) return;

    setIsLoading(true);
    try {
      // --- VÉRIFICATION 1 : Confirmer que l'ID du lot est bien reçu ---
      console.log(`💉 Chargement des vaccinations pour le lot ID: ${lotId}`);

      const { data, error } = await supabase
        .from('vaccinations')
        .select('*')
        .eq('lot_id', lotId)
        .order('due_date', { ascending: true });


      if (error) throw error;

      // --- VÉRIFICATION 2 : Afficher le nombre de résultats trouvés ---
      console.log(`✅ ${data.length} vaccinations trouvées.`);
      console.log(`✅ Vaccinations data: ${JSON.stringify(data)}`);
      setVaccinations(data || []);
    } catch (error: any) {
      console.error("Erreur lors du chargement du plan de vaccination:", error);
      Alert.alert("Erreur", "Impossible de charger le plan de vaccination pour ce lot.");
    } finally {
      setIsLoading(false);
    }
  }, [lotId]);

  useEffect(() => {
    loadVaccinationsForLot();
  }, [loadVaccinationsForLot]);

  const getStatusInfo = (status: Vaccination['status'], dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Ignorer l'heure pour la comparaison
    const vaccinationDate = new Date(dueDate);
    vaccinationDate.setHours(0, 0, 0, 0); // Ignorer l'heure pour la comparaison

    switch (status) {
      case 'completed':
        return { icon: 'checkmark-circle', color: colors.success, label: 'Effectué' };
      case 'overdue':
        return { icon: 'close-circle', color: colors.error, label: 'Dépassé' };
      case 'pending':
        if (vaccinationDate < today) {
          return { icon: 'close-circle', color: colors.error, label: 'Dépassé' };
        } else {
          return { icon: 'time', color: colors.warning, label: 'À faire' };
        }
    }
    return { icon: 'time', color: colors.warning, label: 'À faire' }; // Fallback
  };

  // --- NOUVEAU : Fonction pour marquer une vaccination comme faite ---
  const handleMarkAsDone = async (vaccinationId: string) => {
    try {
      const { error } = await supabase
        .from('vaccinations')
        .update({ status: 'completed', completed_date: new Date().toISOString() })
        .eq('id', vaccinationId);

      if (error) throw error;

      // Mettre à jour l'état local pour un retour visuel immédiat
      setVaccinations(prev =>
        prev.map(v => (v.id === vaccinationId ? { ...v, status: 'completed' } : v))
      );
      Alert.alert('Succès', 'La vaccination a été marquée comme effectuée.');
    } catch (error: any) {
      console.error("Erreur lors de la mise à jour de la vaccination:", error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut de la vaccination.');
    }
  };

  const formatDate = (dateString: string) => {
    // --- CORRECTION : Gérer les dates en UTC pour éviter les décalages de fuseau horaire ---
    const date = new Date(`${dateString}T00:00:00Z`);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
    };
    return date.toLocaleDateString('fr-FR', options);
  };

  // --- NOUVEAU : Logique pour filtrer les vaccinations ---
  const getLogicalStatus = (vaccination: Vaccination): 'completed' | 'overdue' | 'pending' => {
    if (vaccination.status === 'completed') return 'completed';
    if (vaccination.status === 'overdue') return 'overdue';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const vaccinationDate = new Date(vaccination.due_date);
    vaccinationDate.setHours(0, 0, 0, 0);

    if (vaccination.status === 'pending' && vaccinationDate < today) {
      return 'overdue';
    }
    return 'pending';
  };

  const filteredVaccinations = useMemo(() => {
    if (activeFilter === 'all') {
      return vaccinations;
    }
    return vaccinations.filter(v => getLogicalStatus(v) === activeFilter);
  }, [vaccinations, activeFilter]);

  // --- NOUVEAU : Calculer les compteurs pour chaque filtre ---
  const filterCounts = useMemo(() => ({
    all: vaccinations.length,
    pending: vaccinations.filter(v => getLogicalStatus(v) === 'pending').length,
    overdue: vaccinations.filter(v => getLogicalStatus(v) === 'overdue').length,
    completed: vaccinations.filter(v => getLogicalStatus(v) === 'completed').length,
  }), [vaccinations]);

  return (
    <View style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Icon name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Plan du Lot</Text>
            <TouchableOpacity onPress={onClose}>
                <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
        </View>

        {/* --- CORRECTION : Onglets de filtrage améliorés --- */}
        <View style={styles.filterContainer}>
          <TouchableOpacity style={[styles.filterButton, activeFilter === 'all' && styles.filterButtonActive]} onPress={() => setActiveFilter('all')}>
            <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>Tous ({filterCounts.all})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterButton, activeFilter === 'pending' && styles.filterButtonActive]} onPress={() => setActiveFilter('pending')}>
            <Text style={[styles.filterText, activeFilter === 'pending' && styles.filterTextActive]}>À faire ({filterCounts.pending})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterButton, activeFilter === 'overdue' && styles.filterButtonActive]} onPress={() => setActiveFilter('overdue')}>
            <Text style={[styles.filterText, activeFilter === 'overdue' && styles.filterTextActive]}>Dépassé ({filterCounts.overdue})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterButton, activeFilter === 'completed' && styles.filterButtonActive]} onPress={() => setActiveFilter('completed')}>
            <Text style={[styles.filterText, activeFilter === 'completed' && styles.filterTextActive]}>Effectué ({filterCounts.completed})</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : vaccinations.length === 0 ? (
            <View style={styles.emptyState}>
                <Icon name="document-text-outline" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyText}>Aucun plan de vaccination trouvé pour ce lot.</Text>
                <Text style={styles.emptySubtext}>Commencez par ajouter une vaccination.</Text>
            </View>
        ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
                {filteredVaccinations.map((vaccination) => {
                    const statusInfo = getStatusInfo(vaccination.status, vaccination.due_date);
                    return (
                        <View key={vaccination.id} style={[styles.stepContainer, { borderLeftColor: statusInfo.color, paddingRight: vaccination.status !== 'completed' ? 8 : 16 }]}>
                            <View style={styles.stepContent}>
                                <View style={styles.stepHeader}>
                                    <View style={styles.statusBadge}>
                                        <Icon name={statusInfo.icon as any} size={16} color={statusInfo.color} />
                                        <Text style={[styles.stepDay, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                                    </View>
                                    <Text style={styles.stepDate}>{formatDate(vaccination.due_date)}</Text>
                                </View>
                                <Text style={styles.stepTitle}>{vaccination.vaccine_name}</Text>
                                {vaccination.description && <Text style={styles.stepDescription}>{vaccination.description}</Text>}
                            </View>
                            {vaccination.status !== 'completed' && (
                                <TouchableOpacity style={styles.checkboxContainer} onPress={() => handleMarkAsDone(vaccination.id)}>
                                    <Icon name="square-outline" size={28} color={colors.primary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    );
                })}
            </ScrollView>
        )}

        <TouchableOpacity style={styles.addButton} onPress={onAddVaccination}>
            <Icon name="add" size={24} color={colors.white} />
            <Text style={styles.addButtonText}>Ajouter une Vaccination</Text>
        </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: { padding: 4 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'center' },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    paddingVertical: 16,
    paddingLeft: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepDay: { fontSize: 16, fontWeight: '700', color: colors.primary },
  stepDate: { fontSize: 14, color: colors.textSecondary },
  stepTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 4 },
  stepDescription: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, marginTop: 16 },
  addButtonText: { fontSize: 16, fontWeight: '600', color: colors.white, marginLeft: 8 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, marginTop: 40 },
  emptyText: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
  checkboxContainer: {
    marginLeft: 16,
    padding: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.white,
  },
});
