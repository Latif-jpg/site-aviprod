import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, TextInput, Platform, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { colors } from '../styles/commonStyles';
import { supabase } from '../config';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useProfile } from '../contexts/ProfileContext';
import { LinearGradient } from 'expo-linear-gradient';
import FinancialAdvisorDashboard from '../src/intelligence/ui/FinancialAdvisorDashboard';
import FinancialRecordCard from './FinancialRecordCard';
import FinancialBreakdown from './FinancialBreakdown';
import SimpleBottomSheet from '../components/BottomSheet';
import AddFinancialRecordForm from '../components/AddFinancialRecordForm';
import EditFinancialRecordForm from './EditFinancialRecordForm';
import FloatingActionButton from '../components/FloatingActionButton';
import { FinancialRecord } from '../types';
import Icon from '../components/Icon';
// --- IMPORTS POUR L'EXPORT ---
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// ... (getCategoryIcon reste inchangé)
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
  return 'help-circle-outline';
};

export default function FinanceScreen() {
  const { profile } = useProfile();
  const { subscription } = useSubscription();
  const { user } = useAuth();
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<FinancialRecord | null>(null);
  const [showAdvisor, setShowAdvisor] = useState(false);
  const [addRecordType, setAddRecordType] = useState<'income' | 'expense'>('expense');
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expense'>('all');
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'semester' | 'year'>('month');
  const [summary, setSummary] = useState({ revenue: 0, expenses: 0, profit: 0, profitMargin: 0 });
  const [budgetStatus, setBudgetStatus] = useState<any>(null);
  const [isBudgetModalVisible, setIsBudgetModalVisible] = useState(false);
  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // ... (fetchRecords et la suite restent inchangés)
  const fetchRecords = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const fromDate = new Date();
      if (period === 'week') {
        fromDate.setDate(fromDate.getDate() - 7);
      } else if (period === 'month') {
        const now = new Date();
        fromDate.setMonth(now.getMonth() - 1, 1);
        fromDate.setHours(0, 0, 0, 0);
      } else if (period === 'quarter') {
        fromDate.setMonth(fromDate.getMonth() - 3);
      } else if (period === 'semester') {
        fromDate.setMonth(fromDate.getMonth() - 6);
      } else if (period === 'year') {
        fromDate.setFullYear(fromDate.getFullYear() - 1);
      }

      let query = supabase
        .from('financial_records')
        .select('*')
        .eq('user_id', user.id)
        .gte('record_date', fromDate.toISOString())
        .order('record_date', { ascending: false });

      const rpcParams = { p_user_id: user.id };
      const { data: summaryData, error: summaryError } = await supabase.rpc('get_dashboard_financial_summary', rpcParams);

      try {
        const { data: budgetData, error: budgetError } = await supabase.rpc('get_monthly_budget_status', { p_user_id: user.id });
        if (!budgetError && budgetData && budgetData.length > 0) {
          setBudgetStatus(budgetData[0]);
        }
      } catch (e) {
        console.log('Budget RPC not available yet or error', e);
      }

      if (activeTab !== 'all') {
        query = query.eq('type', activeTab);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (summaryError) throw summaryError;

      setRecords(data || []);

      if (summaryData) {
        let revenue = 0, expenses = 0, profit = 0, profitMargin = 0;
        if (period === 'week') {
          revenue = summaryData.weeklyrevenue || 0;
          expenses = summaryData.weeklyexpenses || 0;
          profit = summaryData.weeklyprofit || 0;
          profitMargin = summaryData.weeklyprofitmargin || 0;
        } else if (period === 'quarter') {
          revenue = summaryData.quarterlyrevenue || 0;
          expenses = summaryData.quarterlyexpenses || 0;
          profit = summaryData.quarterlyprofit || 0;
          profitMargin = summaryData.quarterlyprofitmargin || 0;
        } else if (period === 'semester') {
          revenue = (data || []).filter((r: any) => r.type === 'income').reduce((sum: number, r: any) => sum + r.amount, 0);
          expenses = (data || []).filter((r: any) => r.type === 'expense').reduce((sum: number, r: any) => sum + r.amount, 0);
          profit = revenue - expenses;
          profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
        } else if (period === 'year') {
          revenue = summaryData.yearlyrevenue || 0;
          expenses = summaryData.yearlyexpenses || 0;
          profit = summaryData.yearlyprofit || 0;
          profitMargin = summaryData.yearlyprofitmargin || 0;
        } else {
          revenue = summaryData.revenue || 0;
          expenses = summaryData.expenses || 0;
          profit = summaryData.monthlyprofit || 0;
          profitMargin = summaryData.monthlyprofitmargin || 0;
        }

        setSummary({ revenue, expenses, profit, profitMargin });
      }
    } catch (error: any) {
      console.error("Erreur chargement transactions:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user, activeTab, period]);

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

  const handleSaveBudget = async () => {
    if (!newBudgetAmount || isNaN(parseFloat(newBudgetAmount))) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }
    try {
      const amount = parseFloat(newBudgetAmount);
      const monthDate = new Date();
      monthDate.setDate(1);
      monthDate.setHours(0, 0, 0, 0);

      const { error } = await supabase
        .from('budgets')
        .upsert({ user_id: user.id, amount: amount, month: monthDate.toISOString(), category: 'general' }, { onConflict: 'user_id, month, category' });

      if (error) throw error;
      setIsBudgetModalVisible(false);
      fetchRecords();
      Alert.alert('Succès', 'Budget défini avec succès');
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible de sauvegarder le budget: ' + error.message);
    }
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
              onRefresh();
            } catch (error: any) {
              Alert.alert("Erreur", "Impossible de supprimer la transaction.");
            }
          },
        },
      ]
    );
  };

  // --- NOUVEAU : Fonction d'exportation CSV SEULEMENT (pour éviter crash PDF) ---
  const handleExport = async () => {
    // --- VERIFICATION ABONNEMENT PRO ---
    const isPro = subscription?.plan?.name === 'pro';
    if (!isPro) {
      Alert.alert(
        'Réservé aux membres Pro',
        'L\'export du bilan financier est une fonctionnalité exclusive aux abonnés Pro. Veuillez mettre à niveau votre abonnement pour y accéder.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Voir les offres', onPress: () => router.push('/subscription-plans') }
        ]
      );
      return;
    }

    if (records.length === 0) {
      Alert.alert('Aucune donnée', 'Il n\'y a aucune transaction à exporter pour cette période.');
      return;
    }

    setIsExporting(true);

    // PDF DÉSACTIVÉ POUR ÉVITER LES CRASHS (Module natif manquant)
    console.log('⚡ Export CSV direct pour stabilité...');
    await generateAndShareCSV();
  };



  const generateAndShareCSV = async () => {
    try {
      // Construction du CSV
      let csvContent = "Date,Type,Categorie,Description,Montant (CFA)\n";
      records.forEach(r => {
        const date = new Date(r.record_date).toLocaleDateString('fr-FR');
        const type = r.type === 'income' ? 'Revenu' : 'Dépense';
        // Échapper les guillemets pour le format CSV
        const desc = (r.description || '').replace(/"/g, '""');
        const amount = r.type === 'expense' ? -r.amount : r.amount;
        csvContent += `"${date}","${type}","${r.category}","${desc}","${amount}"\n`;
      });

      // Ajout du résumé à la fin
      // Utilisation de ?? 0 pour éviter d'afficher "undefined"
      const safeRevenue = summary.revenue ?? 0;
      const safeExpenses = summary.expenses ?? 0;
      const safeProfit = summary.profit ?? 0;

      csvContent += `\nRESUME DE LA PERIODE,,,\n`;
      csvContent += `TOTAL REVENUS,,,,"${safeRevenue}"\n`;
      csvContent += `TOTAL DEPENSES,,,,"${safeExpenses}"\n`;
      csvContent += `MARGE NETTE (PROFIT),,,,"${safeProfit}"\n`;

      const fileName = `Bilan_Finance_${new Date().getTime()}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
      console.log('✅ CSV généré:', fileUri);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Exporter vers Excel' });
      } else {
        Alert.alert('Succès', 'Fichier CSV généré dans vos documents.');
      }
    } catch (e: any) {
      console.error('❌ Erreur export CSV:', e);
      Alert.alert('Erreur', 'Impossible de générer le fichier CSV.');
    } finally {
      setIsExporting(false);
    }
  };


  const filteredRecordsForBreakdown = useMemo(() => {
    if (activeTab === 'all') {
      return records.filter(r => r.type === 'expense');
    }
    return records.filter(r => r.type === activeTab);
  }, [records, activeTab]);

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
      <LinearGradient
        colors={['#1e3a8a', '#1e293b']}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/dashboard')}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Finances</Text>
          {/* BOUTON EXPORT DANS LE HEADER */}
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExport}
            disabled={isExporting}
          >
            {isExporting ? <ActivityIndicator color="#fff" size="small" /> : <Icon name="download-outline" size={24} color="#fff" />}
          </TouchableOpacity>
        </View>
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryLabel}>
            Profit Net ({period === 'week' ? 'Semaine' : period === 'month' ? 'Mois' : period === 'quarter' ? 'Trimestre' : period === 'semester' ? 'Semestre' : 'Année'})
          </Text>
          <Text style={styles.summaryProfitValue}>
            {summary.profit >= 0 ? '+' : ''}{(summary.profit ?? 0).toLocaleString()} CFA
          </Text>
          <View style={styles.summaryDetails}>
            <View style={styles.summaryDetailItem}>
              <Icon name="arrow-up-outline" size={16} color={colors.success} />
              <Text style={styles.summaryDetailText}>Revenus: {(summary.revenue ?? 0).toLocaleString()} CFA</Text>
            </View>
            <View style={styles.summaryDetailItem}>
              <Icon name="arrow-down-outline" size={16} color={colors.error} />
              <Text style={styles.summaryDetailText}>Dépenses: {(summary.expenses ?? 0).toLocaleString()} CFA</Text>
            </View>
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
          <View style={styles.periodSelector}>
            {['week', 'month', 'quarter', 'semester', 'year'].map((periodKey) => (
              <TouchableOpacity
                key={periodKey}
                style={[styles.periodButton, period === periodKey && styles.periodButtonActive, periodKey === 'semester' && { minWidth: 50 }]}
                onPress={() => setPeriod(periodKey as any)}
              >
                <Text style={[styles.periodButtonText, period === periodKey && styles.periodButtonTextActive]}>
                  {periodKey === 'week' ? '7j' : periodKey === 'month' ? 'Mois' : periodKey === 'quarter' ? '3M' : periodKey === 'semester' ? '6M' : 'An'}
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

          {/* --- NOUVEAU : Carte Budget de Fonctionnement --- */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Budget de Fonctionnement (Mois)</Text>
              <TouchableOpacity onPress={() => {
                setNewBudgetAmount(budgetStatus?.total_budget?.toString() || '');
                setIsBudgetModalVisible(true);
              }}>
                <Icon name="create-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.budgetCard}>
              <View style={styles.budgetHeader}>
                <Text style={styles.budgetLabel}>Budget défini</Text>
                <Text style={styles.budgetAmount}>{(budgetStatus?.total_budget || 0).toLocaleString()} CFA</Text>
              </View>

              {/* Barre de progression */}
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, {
                  width: `${Math.min(((budgetStatus?.total_spent || 0) / (budgetStatus?.total_budget || 1)) * 100, 100)}%`,
                  backgroundColor: (budgetStatus?.budget_health === 'danger') ? colors.error : (budgetStatus?.budget_health === 'warning') ? colors.warning : colors.success
                }]} />
              </View>

              <View style={styles.budgetFooter}>
                <Text style={styles.budgetSpent}>Dépensé: {(budgetStatus?.total_spent || 0).toLocaleString()} CFA</Text>
                <Text style={[styles.budgetRemaining, { color: (budgetStatus?.remaining_budget < 0) ? colors.error : colors.success }]}>
                  Restant: {(budgetStatus?.remaining_budget || 0).toLocaleString()} CFA
                </Text>
              </View>
            </View>
          </View>

          {/* Boutons d'Ajout Rapide */}
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: colors.success }]}
              onPress={() => handleAddRecord('income')}
            >
              <Icon name="add-circle" size={20} color="#fff" />
              <Text style={styles.quickActionText}>Ajouter un Revenu</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: colors.error }]}
              onPress={() => handleAddRecord('expense')}
            >
              <Icon name="remove-circle" size={20} color="#fff" />
              <Text style={styles.quickActionText}>Ajouter une Dépense</Text>
            </TouchableOpacity>
          </View>

          {/* Répartition des Dépenses */}
          <FinancialBreakdown
            title="Répartition des Dépenses"
            records={records.filter(r => r.type === 'expense')}
            type="expense"
          />

          {/* Répartition des Revenus */}
          <FinancialBreakdown
            title="Répartition des Revenus"
            records={records.filter(r => r.type === 'income')}
            type="income"
          />

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
            summary={summary}
            records={records}
            period={period}
            budgetStatus={budgetStatus}
            onPeriodChange={setPeriod}
          />
        )}
      </SimpleBottomSheet>

      {/* --- NOUVEAU : Modale pour définir le budget --- */}
      <SimpleBottomSheet isVisible={isBudgetModalVisible} onClose={() => setIsBudgetModalVisible(false)}>
        <View style={{ padding: 20 }}>
          <Text style={styles.sectionTitle}>Définir le Budget Mensuel</Text>
          <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>
            Fixez une limite pour vos dépenses de fonctionnement ce mois-ci.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Montant (CFA)"
            keyboardType="numeric"
            value={newBudgetAmount}
            onChangeText={setNewBudgetAmount}
          />
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveBudget}>
            <Text style={styles.saveButtonText}>Enregistrer</Text>
          </TouchableOpacity>
        </View>
      </SimpleBottomSheet>
    </SafeAreaView >
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
    flex: 1, // Permet au titre de prendre l'espace
  },
  exportButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)', // Fond semi-transparent
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
    justifyContent: 'space-between', // Mieux réparti avec 5 éléments
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
    minWidth: 45, // Assurer une taille minimale
    alignItems: 'center',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
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
  // --- STYLES BUDGET ---
  section: {
    marginBottom: 24,
  },
  budgetCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetLabel: { fontSize: 14, color: colors.textSecondary },
  budgetAmount: { fontSize: 18, fontWeight: '700', color: colors.text },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 5,
    marginVertical: 12,
    overflow: 'hidden',
  },
  progressBar: { height: '100%', borderRadius: 5 },
  budgetFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  budgetSpent: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  budgetRemaining: { fontSize: 13, fontWeight: '700' },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  // --- STYLES POUR LES BOUTONS D'AJOUT RAPIDE ---
  quickActionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});