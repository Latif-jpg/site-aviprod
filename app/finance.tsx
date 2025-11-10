
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { PieChart } from 'react-native-svg-charts'; // Retiré pour cause d'incompatibilité
import { LinearGradient } from 'expo-linear-gradient';
import { colors, commonStyles } from '../styles/commonStyles';
import Icon from '../components/Icon';
import SimpleBottomSheet from '../components/BottomSheet';
import AddFinancialRecordForm from '../components/AddFinancialRecordForm';
import { useFinance } from '../hooks/useFinance'; // Assurez-vous que ce chemin est correct
import { supabase } from '../config'; // Utiliser le client Supabase consolidé
import FinancialAdvisorDashboard from '../src/intelligence/ui/FinancialAdvisorDashboard';
import { useAuth } from '../hooks/useAuth';

import { useDataCollector } from '../src/hooks/useDataCollector'; // Importer le collecteur
const { width } = Dimensions.get('window');

export default function FinanceScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const { financialRecords, financialSummary, loading, loadFinancialRecords } = useFinance(selectedPeriod);
  const [isAddRecordVisible, setIsAddRecordVisible] = useState(false);
  const [recordType, setRecordType] = useState<'income' | 'expense'>('income');
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvisor, setShowAdvisor] = useState(false);
  const { user } = useAuth();
  const { trackAction } = useDataCollector(); // Utiliser le collecteur



  const getAIInsights = () => {
    if (!financialSummary) return [];

    const insights = [];
    const { totalIncome, totalExpenses, profitMargin } = financialSummary;

    // Insight 1: Cost optimization
    if (totalIncome > 0 && totalExpenses > totalIncome * 0.7) {
      insights.push({
        type: 'warning',
        title: 'Optimisation des coûts recommandée',
        description: `Vos dépenses représentent ${((totalExpenses / totalIncome) * 100).toFixed(0)}% de vos revenus`,
        impact: `Réduire de 10% = +${(totalExpenses * 0.1).toLocaleString()} FCFA`,
        confidence: 92,
        icon: 'alert-circle'
      });
      trackAction('ai_financial_insight_generated', {
        insight_type: 'cost_optimization',
        expense_ratio: (totalExpenses / totalIncome),
        impact: `Réduire de 10% = +${(totalExpenses * 0.1).toLocaleString()} FCFA`,
        confidence: 92,
        icon: 'alert-circle'
      });
    }

    // Insight 2: Growth opportunity
    if (profitMargin > 30) {
      insights.push({
        type: 'success',
        title: 'Excellente performance',
        description: `Votre marge de ${profitMargin.toFixed(1)}% dépasse les standards`,
        impact: 'Capacité d\'expansion détectée',
        confidence: 95,
        icon: 'trending-up'
      });
      trackAction('ai_financial_insight_generated', {
        insight_type: 'growth_opportunity',
        profit_margin: profitMargin,
        impact: 'Capacité d\'expansion détectée',
        confidence: 95,
        icon: 'trending-up'
      });
    }

    // Insight 3: Revenue trend
    const incomeRecords = financialRecords.filter(r => r.type === 'income');
    const avgRevenue = incomeRecords.length > 0 ? totalIncome / incomeRecords.length : 0;
    if (avgRevenue > 0) {
      insights.push({
        type: 'info',
        title: 'Revenu moyen par transaction',
        description: `${avgRevenue.toLocaleString()} FCFA`,
        impact: 'Analyser les sources les plus rentables',
        confidence: 88,
        icon: 'analytics'
      });
      trackAction('ai_financial_insight_generated', {
        insight_type: 'average_revenue',
        average_revenue: avgRevenue,
        impact: 'Analyser les sources les plus rentables',
        confidence: 88,
        icon: 'analytics'
      });
    }

    return insights;
  };

  // La logique de sauvegarde est maintenant dans AddFinancialRecordForm.
  // Ce handler est appelé une fois que la sauvegarde a réussi.
  const handleRecordAdded = () => {
    setIsAddRecordVisible(false); // Fermer le formulaire
    // Recharger les données pour mettre à jour l'écran
    loadFinancialRecords(selectedPeriod); 
  };

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {(['week', 'month', 'quarter'] as const).map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.periodButtonActive
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text style={[
            styles.periodButtonText,
            selectedPeriod === period && styles.periodButtonTextActive
          ]}>
            {period === 'week' ? '7J' : period === 'month' ? '30J' : '90J'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderMetricCard = (
    title: string,
    amount: number,
    icon: string,
    gradient: string[]
  ) => (
    // Le paramètre 'trend' n'est plus utilisé, les données viennent de financialSummary
    // La logique est maintenant directement dans le JSX ci-dessous

    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.metricCard}
    >
      <View style={styles.metricHeader}>
        <View style={styles.metricIconContainer}>
          <Icon name={icon as any} size={24} color="#fff" />
        </View>
      </View>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricAmount}>{amount.toLocaleString()} FCFA</Text>
    </LinearGradient>
  );

  const renderProfitCard = () => {
    if (!financialSummary) return null;
    const { profit, profitMargin, isRentable } = financialSummary;

    return (
      <View style={styles.profitCard}>
        <LinearGradient
          colors={isRentable ? ['#10b981', '#059669'] : ['#ef4444', '#dc2626']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profitGradient}
        >
          <View style={styles.profitHeader}>
            <View style={styles.profitIconContainer}>
              <Icon name={isRentable ? 'checkmark-circle' : 'close-circle'} size={40} color="#fff" />
            </View>
            <View style={styles.profitInfo}>
              <Text style={styles.profitStatus}>
                {isRentable ? '✅ Rentable' : '⚠️ Non Rentable'}
              </Text>
              <Text style={styles.profitMargin}>Marge: {profitMargin.toFixed(1)}%</Text>
            </View>
          </View>
          <Text style={styles.profitAmount}>{profit.toLocaleString()} FCFA</Text>
        </LinearGradient>
      </View>
    );
  };

  const renderAIInsights = () => {
    const insights = getAIInsights();

    return (
      <View style={styles.aiInsightsContainer}>
        <View style={styles.aiHeader}>
          <View style={styles.aiIconContainer}>
            <Icon name="bulb" size={20} color="#fff" />
          </View>
          <Text style={styles.aiTitle}>Insights IA</Text>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>

        {insights.map((insight, index) => (
          <View key={index} style={[
            styles.insightCard,
            insight.type === 'warning' && styles.insightWarning,
            insight.type === 'success' && styles.insightSuccess,
            insight.type === 'info' && styles.insightInfo,
          ]}>
            <View style={styles.insightHeader}>
              <Icon name={insight.icon as any} size={24} color={
                insight.type === 'warning' ? '#f59e0b' :
                insight.type === 'success' ? '#10b981' : '#3b82f6'
              } />
              <View style={styles.insightTitleContainer}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightDescription}>{insight.description}</Text>
              </View>
            </View>
            <View style={styles.insightFooter}>
              <Text style={styles.insightImpact}>💡 {insight.impact}</Text>
              <View style={styles.confidenceContainer}>
                <View style={styles.confidenceBar}>
                  <View style={[styles.confidenceFill, { width: `${insight.confidence}%` }]} />
                </View>
                <Text style={styles.confidenceText}>{insight.confidence}%</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };





  if (loading) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1e293b', '#0f172a']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Finance Intelligence</Text>
            <Text style={styles.headerSubtitle}>Analyse avancée IA</Text>
          </View>
        </View>
        {renderPeriodSelector()}
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Revenus',
            financialSummary?.totalIncome || 0,
            'trending-up',
            ['#10b981', '#059669']
          )}
          {renderMetricCard(
            'Dépenses',
            financialSummary?.totalExpenses || 0,
            'trending-down',
            ['#ef4444', '#dc2626']
          )}
        </View>

        {renderProfitCard()}
        
        {/* RESTAURATION DE L'ANCIENNE VUE DE RÉPARTITION DES DÉPENSES */}
        <View style={styles.breakdownSection}>
          <Text style={styles.sectionTitle}>Répartition des Dépenses</Text>
          {Object.entries(financialRecords
            .filter(record => record.type === 'expense')
            .reduce((acc, record) => {
              acc[record.category] = (acc[record.category] || 0) + record.amount;
              return acc;
            }, {} as Record<string, number>)).map(([category, amount]) => {
            const totalExpenses = financialSummary?.totalExpenses || 1;
            const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
            return (
              <View key={category} style={styles.breakdownItem}>
                <View style={styles.breakdownInfo}>
                  <Text style={styles.breakdownCategory}>{category}</Text>
                  <Text style={styles.breakdownAmount}>{amount.toLocaleString()} FCFA</Text>
                </View>
                <View style={styles.breakdownBarContainer}>
                  <View style={[styles.breakdownBar, { width: `${percentage}%` }]} />
                </View>
                <Text style={styles.breakdownPercentage}>{percentage.toFixed(0)}%</Text>
              </View>
            );
          })}
        </View>

        {renderAIInsights()}

        <View style={styles.transactionsSection}>
          <Text style={styles.sectionTitle}>Transactions Récentes</Text>
          {financialRecords.slice(0, 5).map((record) => (
            <View key={record.id} style={styles.transactionItem}>
              <View style={styles.transactionLeft}>
                <View style={[
                  styles.transactionIcon,
                  { backgroundColor: record.type === 'income' ? '#10b98120' : '#ef444420' }
                ]}>
                  <Icon
                    name={record.type === 'income' ? 'arrow-down' : 'arrow-up'}
                    size={20}
                    color={record.type === 'income' ? '#10b981' : '#ef4444'}
                  />
                </View>
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionDescription}>{record.description}</Text>
                  <Text style={styles.transactionCategory}>{record.category}</Text>
                </View>
              </View>
              <Text style={[
                styles.transactionAmount,
                { color: record.type === 'income' ? '#10b981' : '#ef4444' }
              ]}>
                {record.type === 'income' ? '+' : '-'}{record.amount.toLocaleString()}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.actionButtons}>
           <TouchableOpacity
             style={styles.addIncomeButton}
             onPress={() => {
               setRecordType('income');
               setIsAddRecordVisible(true);
             }}
           >
             <LinearGradient
               colors={['#10b981', '#059669']}
               start={{ x: 0, y: 0 }}
               end={{ x: 1, y: 1 }}
               style={styles.buttonGradient}
             >
               <Icon name="add" size={22} color="#fff" />
               <Text style={styles.buttonText}>Ajouter Revenu</Text>
             </LinearGradient>
           </TouchableOpacity>

           <TouchableOpacity
             style={styles.addExpenseButton}
             onPress={() => {
               setRecordType('expense');
               setIsAddRecordVisible(true);
             }}
           >
             <LinearGradient
               colors={['#ef4444', '#dc2626']}
               start={{ x: 0, y: 0 }}
               end={{ x: 1, y: 1 }}
               style={styles.buttonGradient}
             >
               <Icon name="remove" size={22} color="#fff" />
               <Text style={styles.buttonText}>Ajouter Dépense</Text>
             </LinearGradient>
           </TouchableOpacity>
         </View>

         {/* Bouton Conseiller Financier IA */}
         <View style={styles.aiAdvisorSection}>
           <TouchableOpacity
             style={styles.aiAdvisorButton}
             onPress={() => setShowAdvisor(true)}
           >
             <LinearGradient
               colors={['#3b82f6', '#1d4ed8']}
               start={{ x: 0, y: 0 }}
               end={{ x: 1, y: 1 }}
               style={styles.aiAdvisorGradient}
             >
               <View style={styles.aiAdvisorContent}>
                 <Icon name="analytics" size={24} color="#fff" />
                 <View style={styles.aiAdvisorText}>
                   <Text style={styles.aiAdvisorTitle}>Conseiller Financier IA</Text>
                   <Text style={styles.aiAdvisorSubtitle}>
                     Analyse prédictive, anomalies, optimisation fiscale
                   </Text>
                 </View>
                 <Icon name="chevron-forward" size={20} color="#fff" />
               </View>
             </LinearGradient>
           </TouchableOpacity>
         </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <SimpleBottomSheet
        isVisible={isAddRecordVisible}
        onClose={() => setIsAddRecordVisible(false)}
      >
        <AddFinancialRecordForm
          type={recordType}
          onSubmitSuccess={handleRecordAdded} // Nouveau prop pour signaler le succès
          onCancel={() => setIsAddRecordVisible(false)}
        />
      </SimpleBottomSheet>

      {/* Financial Advisor Dashboard */}
      <SimpleBottomSheet
        isVisible={showAdvisor}
        onClose={() => setShowAdvisor(false)}
      >
        {user?.id && (
          <FinancialAdvisorDashboard
            farmId={user.id}
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
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#ffffff20',
  },
  periodButtonActive: {
    backgroundColor: '#fff',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
  },
  periodButtonTextActive: {
    color: '#1e293b',
  },
  scrollView: {
    flex: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    minHeight: 140,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ffffff30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  metricTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffffdd',
    marginBottom: 6,
  },
  metricAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
  },
  profitCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  noDataText: {
    textAlign: 'center',
    color: colors.textSecondary,
  },
  profitGradient: {
    padding: 24,
  },
  profitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profitIconContainer: {
    marginRight: 16,
  },
  profitInfo: {
    flex: 1,
  },
  profitStatus: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
  },
  profitMargin: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffffcc',
  },
  profitAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
  },
  aiInsightsContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  aiIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    flex: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  insightCard: {
    backgroundColor: '#ffffff15',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  insightWarning: {
    borderLeftColor: '#f59e0b',
  },
  insightSuccess: {
    borderLeftColor: '#10b981',
  },
  insightInfo: {
    borderLeftColor: '#3b82f6',
  },
  insightHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  insightTitleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 13,
    color: '#94a3b8',
  },
  insightFooter: {
    marginTop: 8,
  },
  insightImpact: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 8,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confidenceBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#ffffff20',
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  transactionsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  transactionCategory: {
    fontSize: 13,
    color: '#64748b',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '900',
  },
  breakdownSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  breakdownItem: {
    marginBottom: 16,
  },
  breakdownInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  breakdownCategory: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    textTransform: 'capitalize',
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  breakdownBarContainer: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  breakdownBar: {
    height: '100%',
    backgroundColor: '#ef4444',
    borderRadius: 4,
  },
  breakdownPercentage: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 8,
  },
  addIncomeButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  addExpenseButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  bottomPadding: {
    height: 100,
  },
  aiAdvisorSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  aiAdvisorButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  aiAdvisorGradient: {
    padding: 20,
  },
  aiAdvisorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  aiAdvisorText: {
    flex: 1,
  },
  aiAdvisorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  aiAdvisorSubtitle: {
    fontSize: 14,
    color: '#ffffffcc',
    lineHeight: 20,
  },
});
