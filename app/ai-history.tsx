
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../styles/commonStyles';
import { ensureSupabaseInitialized } from '../config';
import { router } from 'expo-router';
import Icon from '../components/Icon';
import Button from '../components/Button';

interface AnalysisRecord {
  id: string;
  lot_id: string;
  images: string[];
  symptoms: string[];
  diagnosis: string;
  confidence: number;
  treatment_plan: string;
  recommended_products: any[];
  created_at: string;
}

export default function AIHistoryScreen() {
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisRecord | null>(null);

  useEffect(() => {
    loadAnalyses();
  }, []);

  const loadAnalyses = async () => {
    try {
      console.log('📥 Loading AI analyses history...');
      setLoading(true);
      
      const supabase = await ensureSupabaseInitialized();
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log('⚠️ No user logged in');
        Alert.alert('Erreur', 'Vous devez être connecté pour voir l\'historique');
        router.back();
        return;
      }

      const { data, error } = await supabase
        .from('ai_health_analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.log('❌ Error loading analyses:', error.message);
        throw error;
      }
      
      console.log(`✅ Loaded ${data?.length || 0} analyses`);
      setAnalyses(data || []);
    } catch (error: any) {
      console.log('❌ Error in loadAnalyses:', error.message || error);
      Alert.alert('Erreur', 'Impossible de charger l\'historique des analyses');
    } finally {
      setLoading(false);
    }
  };

  const deleteAnalysis = async (id: string) => {
    try {
      console.log('🗑️ Deleting analysis:', id);
      
      const supabase = await ensureSupabaseInitialized();
      
      const { error } = await supabase
        .from('ai_health_analyses')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      console.log('✅ Analysis deleted');
      Alert.alert('Succès', 'Analyse supprimée avec succès');
      
      // Reload analyses
      loadAnalyses();
      setSelectedAnalysis(null);
    } catch (error: any) {
      console.log('❌ Error deleting analysis:', error.message || error);
      Alert.alert('Erreur', 'Impossible de supprimer l\'analyse');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return colors.success;
    if (confidence >= 60) return colors.warning;
    return colors.error;
  };

  const renderAnalysisCard = (analysis: AnalysisRecord) => (
    <TouchableOpacity
      key={analysis.id}
      style={styles.analysisCard}
      onPress={() => setSelectedAnalysis(analysis)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Icon name="medical" size={24} color={colors.primary} />
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.cardTitle}>{analysis.diagnosis}</Text>
            <Text style={styles.cardDate}>{formatDate(analysis.created_at)}</Text>
          </View>
        </View>
        <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor(analysis.confidence) + '20' }]}>
          <Text style={[styles.confidenceText, { color: getConfidenceColor(analysis.confidence) }]}>
            {analysis.confidence}%
          </Text>
        </View>
      </View>
      
      <View style={styles.cardContent}>
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Icon name="image" size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>{analysis.images.length} photo{analysis.images.length > 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="list" size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>{analysis.symptoms.length} symptôme{analysis.symptoms.length > 1 ? 's' : ''}</Text>
          </View>
        </View>
        
        <Text style={styles.cardPreview} numberOfLines={2}>
          {analysis.treatment_plan}
        </Text>
      </View>
      
      <View style={styles.cardFooter}>
        <Text style={styles.viewDetailsText}>Voir les détails →</Text>
      </View>
    </TouchableOpacity>
  );

  const renderAnalysisDetail = () => {
    if (!selectedAnalysis) return null;

    return (
      <View style={styles.detailContainer}>
        <View style={styles.detailHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedAnalysis(null)}
          >
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.detailTitle}>Détails de l&apos;Analyse</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              Alert.alert(
                'Supprimer l\'Analyse',
                'Êtes-vous sûr de vouloir supprimer cette analyse?',
                [
                  { text: 'Annuler', style: 'cancel' },
                  {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: () => deleteAnalysis(selectedAnalysis.id)
                  }
                ]
              );
            }}
          >
            <Icon name="trash" size={24} color={colors.error} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>📅 Date</Text>
            <Text style={styles.sectionText}>{formatDate(selectedAnalysis.created_at)}</Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>🔬 Diagnostic</Text>
            <Text style={styles.diagnosisText}>{selectedAnalysis.diagnosis}</Text>
            <View style={styles.confidenceBar}>
              <View style={[styles.confidenceFill, { 
                width: `${selectedAnalysis.confidence}%`,
                backgroundColor: getConfidenceColor(selectedAnalysis.confidence)
              }]} />
            </View>
            <Text style={[styles.confidenceLabel, { color: getConfidenceColor(selectedAnalysis.confidence) }]}>
              Confiance: {selectedAnalysis.confidence}%
            </Text>
          </View>

          {selectedAnalysis.images.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>📸 Photos ({selectedAnalysis.images.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.imagesGrid}>
                  {selectedAnalysis.images.map((image, index) => (
                    <Image
                      key={index}
                      source={{ uri: image }}
                      style={styles.detailImage}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>🩺 Symptômes ({selectedAnalysis.symptoms.length})</Text>
            <View style={styles.symptomsList}>
              {selectedAnalysis.symptoms.map((symptom, index) => (
                <View key={index} style={styles.symptomItem}>
                  <Icon name="checkmark-circle" size={16} color={colors.primary} />
                  <Text style={styles.symptomText}>{symptom}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>💊 Plan de Traitement</Text>
            <Text style={styles.treatmentText}>{selectedAnalysis.treatment_plan}</Text>
          </View>

          {selectedAnalysis.recommended_products && selectedAnalysis.recommended_products.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>🛒 Produits Recommandés</Text>
              {selectedAnalysis.recommended_products.map((product: any, index: number) => (
                <View key={index} style={styles.productCard}>
                  <Image source={{ uri: product.image || 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&h=300&fit=crop' }} style={styles.productImage} />
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productDescription}>{product.description}</Text>
                    <Text style={styles.productPrice}>{product.price.toLocaleString()} CFA</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement de l&apos;historique...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (selectedAnalysis) {
    return (
      <SafeAreaView style={styles.container}>
        {renderAnalysisDetail()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historique IA</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadAnalyses}
        >
          <Icon name="refresh" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {analyses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="document-text" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Aucune Analyse</Text>
          <Text style={styles.emptyText}>
            Vous n&apos;avez pas encore effectué d&apos;analyse IA.{'\n'}
            Commencez par analyser la santé de vos volailles!
          </Text>
          <Button
            text="Nouvelle Analyse"
            onPress={() => router.back()}
            style={styles.newAnalysisButton}
          />
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text style={styles.statsText}>
              {analyses.length} analyse{analyses.length > 1 ? 's' : ''} effectuée{analyses.length > 1 ? 's' : ''}
            </Text>
            {analyses.map(renderAnalysisCard)}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBackButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  refreshButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  statsText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  analysisCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardContent: {
    marginBottom: 12,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cardPreview: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  viewDetailsText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  newAnalysisButton: {
    backgroundColor: colors.primary,
  },
  detailContainer: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  deleteButton: {
    padding: 4,
  },
  detailScroll: {
    flex: 1,
  },
  detailSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    color: colors.text,
  },
  diagnosisText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  confidenceFill: {
    height: '100%',
  },
  confidenceLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  imagesGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  detailImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  symptomsList: {
    gap: 8,
  },
  symptomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  symptomText: {
    fontSize: 16,
    color: colors.text,
  },
  treatmentText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
