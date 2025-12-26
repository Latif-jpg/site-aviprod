import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { colors } from '../styles/commonStyles';
import { supabase } from '../config';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../contexts/ProfileContext'; // --- NOUVEAU : Pour obtenir l'ID de la ferme ---
import { LinearGradient } from 'expo-linear-gradient';
import FinancialAdvisorDashboard from '../src/intelligence/ui/FinancialAdvisorDashboard'; // --- NOUVEAU : Importer le bon tableau de bord IA ---
import FinancialRecordCard from './FinancialRecordCard'; // CORRECTION : Le fichier est dans le même dossier 'app'
import SimpleBottomSheet from '../components/BottomSheet';
import AddFinancialRecordForm from '../components/AddFinancialRecordForm';
import EditFinancialRecordForm from './EditFinancialRecordForm'; // CORRECTION : Le fichier est dans le même dossier 'app'
import FloatingActionButton from '../components/FloatingActionButton';
import { FinancialRecord } from '../types';
import Icon from '../components/Icon';

// --- NOUVEAU : Fonction pour obtenir l'icône de catégorie ---
// Cette fonction centralise la logique pour choisir la bonne icône en fonction de la catégorie.
const getCategoryIcon = (category: string): string => {
  const cat = category.toLowerCase();
  if (cat.includes('vente')) return 'cash-outline';
  if (cat.includes('aliment')) return 'fast-food-outline';
  if (cat.includes('médicament')) return 'medkit-outline';
  if (cat.includes('équipement')) return 'build-outline';
  if (cat.includes('main d\'œuvre') || cat.includes('salaire')) return 'people-outline';
  if (cat.includes('transport')) return 'car-outline';
  if (cat.includes('facture') || cat.includes('électricité') || cat.includes('eau')) return 'receipt-outline';
  if (cat.includes('service')) return 'construct-outline';
  if (cat.includes('partenariat') || cat.includes('investissement')) return 'business-outline';
  if (cat.includes('autre')) return 'apps-outline';

  // Icône par défaut si aucune correspondance n'est trouvée
  return 'help-circle-outline';
};

export default function FinanceScreen() {
  // --- NOUVEAU : État pour le résumé financier ---
  const { profile } = useProfile(); // --- NOUVEAU ---
  const { user } = useAuth();
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<FinancialRecord | null>(null);
  const [showAdvisor, setShowAdvisor] = useState(false); // --- NOUVEAU : État pour la modale IA ---
  const [addRecordType, setAddRecordType] = useState<'income' | 'expense'>('expense');
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expense'>('all');
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [summary, setSummary] = useState({ revenue: 0, expenses: 0, profit: 0, profitMargin: 0 }); // CORRECTION : Ajout de profitMargin

  const fetchRecords = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // --- CORRECTION : La fonction RPC gère déjà les périodes (mois/semaine).
      // On simplifie donc la logique ici. On garde le filtre pour la liste des transactions.
      const fromDate = new Date();
      if (period === 'week') {
        fromDate.setDate(fromDate.getDate() - 7);
      } else if (period === 'month') {
        // La RPC calcule déjà le mois, mais on garde un filtre d'un mois pour la liste.
        // Pour une meilleure cohérence, on pourrait même aller chercher plus loin (ex: 3 mois)
        // et laisser les onglets filtrer l'affichage.
        // Pour l'instant, on garde un filtre d'un mois pour la liste.
        const now = new Date();
        // On prend le premier jour du mois précédent pour être sûr de tout avoir.
        fromDate.setMonth(now.getMonth() - 1, 1);
        fromDate.setHours(0, 0, 0, 0);
      } else if (period === 'quarter') { // --- NOUVEAU : Gestion du trimestre ---
        fromDate.setMonth(fromDate.getMonth() - 3);

      } else if (period === 'year') {
        fromDate.setFullYear(fromDate.getFullYear() - 1);
      }

      // --- MODIFICATION : Utiliser une seule requête RPC pour tout récupérer ---
      let query = supabase
          .from('financial_records')
          .select('*')
          .eq('user_id', user.id)
          // --- CORRECTION : La logique de date est maintenant gérée par la RPC,
          // mais on garde un filtre large côté client pour la liste.
          .gte('record_date', fromDate.toISOString())
          .order('record_date', { ascending: false });

      // --- NOUVEAU : Appeler la fonction RPC. Elle calcule déjà toutes les périodes.
      const rpcParams = { p_user_id: user.id };
      const { data: summaryData, error: summaryError } = await supabase.rpc('get_dashboard_financial_summary', rpcParams);

      if (activeTab !== 'all') {
        query = query.eq('type', activeTab);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (summaryError) throw summaryError;

      // --- LOG DE DÉBOGAGE : Affiche les données brutes du résumé reçues de la RPC ---
      console.log('📊 [FinanceScreen] Données brutes du résumé reçues de la RPC:', JSON.stringify(summaryData, null, 2));

      setRecords(data || []);

      // On met à jour l'état du résumé avec les données de la RPC.
      // On choisit les données à afficher (mensuelles ou hebdomadaires) en fonction de la période sélectionnée.
      if (summaryData) {
        let revenue = 0, expenses = 0, profit = 0, profitMargin = 0;

        // --- CORRECTION : La logique est maintenant unifiée et pilotée par la RPC ---
        // On utilise directement les valeurs retournées, car la RPC gère maintenant tous les cas.
        if (period === 'week') {
          revenue = summaryData.weeklyrevenue;
          expenses = summaryData.weeklyexpenses;
          profit = summaryData.weeklyprofit;
          profitMargin = summaryData.weeklyprofitmargin;
        } else if (period === 'quarter') {
          revenue = summaryData.quarterlyrevenue;
          expenses = summaryData.quarterlyexpenses;
          profit = summaryData.quarterlyprofit;
          profitMargin = summaryData.quarterlyprofitmargin;
        } else if (period === 'year') {
          revenue = summaryData.yearlyrevenue;
          expenses = summaryData.yearlyexpenses;
          profit = summaryData.yearlyprofit;
          profitMargin = summaryData.yearlyprofitmargin;
        } else { // Par défaut, on utilise les données mensuelles (qui sont maintenant sur 30 jours glissants)
          revenue = summaryData.monthlyrevenue;
          expenses = summaryData.monthlyexpenses;
          profit = summaryData.monthlyprofit;
          profitMargin = summaryData.monthlyprofitmargin;
        }

        setSummary({
          revenue, expenses, profit, profitMargin
        });
      }
    } catch (error: any) {
      console.error("Erreur chargement transactions:", error);
      // Gérer l'erreur, par exemple avec une alerte
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user, activeTab, period]); // --- NOUVEAU : Ajouter 'period' aux dépendances ---

  useFocusEffect(
    useCallback(() => {
      fetchRecords();
    }, [fetchRecords])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchRecords();
  };

  const handleEdit = (record: FinancialRecord) => {
    setRecordToEdit(record);
  };

  const handleUpdateSuccess = () => {
    setRecordToEdit(null);
    onRefresh();
  };

  const handleAddRecord = (type: 'income' | 'expense') => {
    setAddRecordType(type);
    setIsAddModalVisible(true);
  };


  const handleDelete = async (recordId: string) => {
    Alert.alert(
      "Confirmer la suppression",
      "Êtes-vous sûr de vouloir supprimer cette transaction ? Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.from('financial_records').delete().eq('id', recordId);
              if (error) throw error;
              Alert.alert("Succès", "La transaction a été supprimée.");
              onRefresh(); // Rafraîchir la liste
            } catch (error: any) {
              Alert.alert("Erreur", "Impossible de supprimer la transaction.");
            }
          },
        },
      ]
    );
  };
  // --- NOUVEAU : Filtrer les enregistrements pour l'analyse ---
  const filteredRecordsForBreakdown = useMemo(() => {
    if (activeTab === 'all') {
      // Pour l'analyse, il est souvent plus utile de voir les dépenses
      return records.filter(r => r.type === 'expense');
    }
    return records.filter(r => r.type === activeTab);
  }, [records, activeTab]);

  const breakdownTitle = activeTab === 'income' ? "Répartition des Revenus" : "Répartition des Dépenses";

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />;
    }
    if (records.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Icon name="document-text-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Aucune transaction pour le moment.</Text>
        </View>
      );
    }
    return records.map(record => (
      <FinancialRecordCard 
        key={record.id} 
        record={record} 
        onEdit={() => handleEdit(record)} 
        onDelete={() => handleDelete(record.id)}
      />
    ));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* --- NOUVEL EN-TÊTE --- */}
      <LinearGradient
        colors={['#1e3a8a', '#1e293b']}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/dashboard')}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Finances</Text>
        </View>
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryLabel}>
            Profit Net ({period === 'week' ? 'Semaine' : period === 'month' ? 'Mois' : period === 'quarter' ? 'Trimestre' : 'Année'})
          </Text>
          <Text style={styles.summaryProfitValue}>
            {summary.profit >= 0 ? '+' : ''}{(summary.profit ?? 0).toLocaleString()} CFA
          </Text>
          <View style={styles.summaryDetails}>
            <View style={styles.summaryDetailItem}>
              <Icon name="arrow-down-outline" size={16} color={colors.success} />
              <Text style={styles.summaryDetailText}>Revenus: {(summary.revenue ?? 0).toLocaleString()} CFA</Text>
            </View>
            <View style={styles.summaryDetailItem}>
              <Icon name="arrow-up-outline" size={16} color={colors.error} />
              <Text style={styles.summaryDetailText}>Dépenses: {(summary.expenses ?? 0).toLocaleString()} CFA</Text>
            </View>
            {/* CORRECTION : Le bloc pour afficher la marge bénéficiaire était manquant */}
            <View style={styles.summaryDetailItem}>
              <Icon name="pie-chart-outline" size={16} color={summary.profitMargin >= 15 ? colors.success : colors.warning} />
              <Text style={styles.summaryDetailText}>Marge: {(summary.profitMargin ?? 0).toFixed(1)}%</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        style={styles.scrollView}
      >
        <View style={styles.content}>
          {/* --- NOUVEAU : Sélecteur de période --- */}
          <View style={styles.periodSelector}>
            {['week', 'month', 'quarter', 'year'].map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.periodButton, period === p && styles.periodButtonActive]}
                onPress={() => setPeriod(p as 'week' | 'month' | 'quarter' | 'year')}
              >
                <Text style={[styles.periodButtonText, period === p && styles.periodButtonTextActive]}>
                  {p === 'week' ? '7j' : p === 'month' ? 'Mois' : p === 'quarter' ? '3M' : 'An'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* --- NOUVEAU : Bouton pour lancer le conseiller financier IA --- */}
          <TouchableOpacity
            style={styles.aiAdvisorButton}
            onPress={() => setShowAdvisor(true)}
          >
            <LinearGradient
              colors={['#3b82f6', '#1d4ed8']}
              style={styles.aiAdvisorGradient}
            >
              <View style={styles.aiAdvisorContent}>
                <Icon name="bulb" size={24} color="#fff" />
                <Text style={styles.aiAdvisorTitle}>Conseiller Financier IA</Text>
                <Icon name="chevron-forward" size={20} color="#fff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Le titre est maintenant plus discret */}
          <Text style={styles.sectionTitle}>Transactions Récentes</Text>

          {/* NOUVEAU : Onglets de filtre pour une navigation claire */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'all' && styles.activeTab]}
              onPress={() => setActiveTab('all')}
            >
              <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>Tout</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'income' && styles.activeTab]}
              onPress={() => setActiveTab('income')}
            >
              <Text style={[styles.tabText, activeTab === 'income' && styles.activeTabText]}>Revenus</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'expense' && styles.activeTab]}
              onPress={() => setActiveTab('expense')}
            >
              <Text style={[styles.tabText, activeTab === 'expense' && styles.activeTabText]}>Dépenses</Text>
            </TouchableOpacity>
          </View>

          {/* Le contenu (liste des transactions) s'affiche ici */}
          {renderContent()}
        </View>
      </ScrollView>

      {/* Le bouton flottant pour ajouter une transaction */}
      <FloatingActionButton 
        onAddIncome={() => handleAddRecord('income')}
        onAddExpense={() => handleAddRecord('expense')}
      />

      {/* Modale pour AJOUTER une transaction */}
      <SimpleBottomSheet isVisible={isAddModalVisible} onClose={() => setIsAddModalVisible(false)}>
        <AddFinancialRecordForm
          type={addRecordType}
          onSubmitSuccess={() => {
            setIsAddModalVisible(false);
            onRefresh();
          }}
          onCancel={() => setIsAddModalVisible(false)}
        />
      </SimpleBottomSheet>

      {/* Modale pour MODIFIER une transaction */}
      <SimpleBottomSheet isVisible={!!recordToEdit} onClose={() => setRecordToEdit(null)}>
        {recordToEdit && (
          <EditFinancialRecordForm
            record={recordToEdit}
            onClose={() => setRecordToEdit(null)}
            onUpdateSuccess={handleUpdateSuccess}
          />
        )}
      </SimpleBottomSheet>

      {/* --- NOUVEAU : Modale pour le conseiller financier --- */}
      <SimpleBottomSheet
        isVisible={showAdvisor}
        onClose={() => setShowAdvisor(false)}
        snapPoints={['95%']} // La modale prendra 95% de l'écran
      >
        {profile && (
          <FinancialAdvisorDashboard
            farmId={profile.id} // L'ID du profil est utilisé comme ID de ferme
            onClose={() => setShowAdvisor(false)}
          />
        )}
      </SimpleBottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', // Fond plus clair
  },
  // --- NOUVEAUX STYLES POUR L'EN-TÊTE ---
  headerGradient: {
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
  },
  summaryContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
  },
  summaryProfitValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 16,
  },
  summaryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-evenly', // CORRECTION: Assure une meilleure répartition
    flexWrap: 'wrap',
    gap: 16,
    width: '100%',
  },
  summaryDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryDetailText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  scrollView: {
    flex: 1,
    marginTop: -10, // Le contenu passe légèrement sous l'en-tête
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    marginTop: 24, // Espace au-dessus du titre
  },
  // --- NOUVEAU : STYLES POUR LE BOUTON IA ---
  aiAdvisorButton: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  aiAdvisorGradient: {
    padding: 20,
  },
  aiAdvisorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  aiAdvisorTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
  },
  // --- NOUVEAUX STYLES POUR LE SÉLECTEUR DE PÉRIODE ---
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  periodButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
  // --- NOUVEAUX STYLES POUR LES ONGLETS ---
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.white,
  },
});