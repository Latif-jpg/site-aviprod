// src/intelligence/ui/RationAdvisorDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { colors, commonStyles } from '../../../styles/commonStyles';
import Icon from '../../../components/Icon';
import Button from '../../../components/Button';
import { useRationAdvisor } from '../agents/RationAdvisor';
import { supabase } from '../../../config';

const { width } = Dimensions.get('window');

// Interfaces
interface EnrichedRationAnalysis {
    race: string;
    phase: string;
    quantity: number;
    daily_feed_per_bird: number;
    total_daily_kg: number;
    ingredients: Array<{
        name: string;
        percentage: number;
        quantity_kg_per_day: number;
        quantity_per_bag?: number; // Ajouté
        total_phase_kg?: number; // Ajouté
    }>;
    nutritional_values: {
        protein_percentage: number;
        energy_kcal: number;
        calcium_percentage?: number;
    };
    total_cost_per_kg: number;
    efficiency_score: number;
    cycle: {
        days_remaining: number;
        total_kg: number;
        total_bags: number;
    };
}

interface RationAdvisorDashboardProps {
    lot: any;
    userId: string;
    onClose?: () => void;
    onSaveSuccess?: () => void;
}

export default function RationAdvisorDashboard({
    lot,
    userId,
    onClose,
    onSaveSuccess
}: RationAdvisorDashboardProps) {
    const { formulateRation } = useRationAdvisor();
    const [currentRation, setCurrentRation] = useState<EnrichedRationAnalysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feedStock, setFeedStock] = useState<any[]>([]);
    const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Charger le stock d'aliments
    useEffect(() => {
        const loadFeedStock = async () => {
            if (!lot) return;
            try {
                const { data, error: stockError } = await supabase
                    .from('stock')
                    .select('id, name')
                    .eq('category', 'feed');
                if (stockError) throw stockError;
                setFeedStock(data || []);
                if (data && data.length > 0) {
                    setSelectedFeedId(data[0].id);
                }
            } catch (err) {
                console.error("Erreur chargement du stock d'aliments:", err);
            }
        };
        loadFeedStock();
    }, [lot]);

    const loadRationAnalysis = useCallback(async () => {
        if (!lot) {
            setError("Aucun lot sélectionné.");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // 🔍 DEBUG - Afficher les données du lot
            console.log('🔍 DEBUG Lot:', {
                name: lot.name,
                quantity: lot.quantity,
                age: lot.age,
                weight: lot.poids_moyen,
                birdType: lot.bird_type
            });

            const getPhaseFromAge = (birdType: string, age: number) => {
                const type = birdType?.toLowerCase() || 'broilers';
                if (['layers', 'pondeuse', 'breeders'].includes(type)) {
                    if (age <= 42) return 'démarrage';
                    if (age <= 119) return 'croissance';
                    if (age <= 140) return 'pré-ponte';
                    return 'ponte';
                }
                if (age <= 21) return 'démarrage';
                if (age <= 32) return 'croissance';
                return 'finition';
            };

            const phase = getPhaseFromAge(lot.bird_type, lot.age);

            const breedKey = ['layers', 'pondeuse', 'breeders'].includes(lot.bird_type?.toLowerCase() || '') ? 'layer' : 'broiler';
            const stageKey = phase === 'démarrage' ? 'starter' :
                phase === 'croissance' ? 'grower' :
                    phase === 'pré-ponte' ? 'pre-layer' :
                        phase === 'ponte' ? 'layer' : 'finisher';

            const { data: rationStandards, error: standardsError } = await supabase
                .from('feed_rations')
                .select('daily_consumption_per_bird_grams')
                .eq('breed', breedKey)
                .eq('stage', stageKey)
                .single();

            if (standardsError && standardsError.code !== 'PGRST116') throw standardsError;

            // ✅ CORRECTION : Récupérer la valeur par oiseau depuis la base
            const dailyFeedPerBird = rationStandards?.daily_consumption_per_bird_grams || 100;

            // 🔍 DEBUG - Afficher la consommation calculée
            console.log('📊 Consommation calculée:', {
                dailyFeedPerBird: `${dailyFeedPerBird}g/oiseau/jour`,
                source: rationStandards ? 'Base de données' : 'Valeur par défaut'
            });

            const baseRation = await formulateRation(lot.bird_type, phase, lot.quantity);
            if (!baseRation) throw new Error(`L'IA n'a pas pu formuler de ration pour le lot ${lot.name}.`);

            // ✅ CORRECTION : Calcul correct du total quotidien
            const totalDailyKg = (dailyFeedPerBird * lot.quantity) / 1000;

            // 🔍 DEBUG - Afficher les calculs
            console.log('📊 Calculs finaux:', {
                perBird: `${dailyFeedPerBird}g`,
                quantity: lot.quantity,
                totalDaily: `${totalDailyKg.toFixed(2)}kg`,
                calculation: `(${dailyFeedPerBird}g × ${lot.quantity} oiseaux) ÷ 1000 = ${totalDailyKg.toFixed(2)}kg`
            });

            const STAGE_END_DAYS = {
                layer: { 'démarrage': 42, 'croissance': 119, 'pré-ponte': 140, 'ponte': 540 },
                broiler: { 'démarrage': 21, 'croissance': 32, 'finition': 45 }
            };
            const stageEndDay = STAGE_END_DAYS[breedKey as keyof typeof STAGE_END_DAYS][phase as keyof typeof STAGE_END_DAYS[typeof breedKey]] || lot.age + 1;
            const daysRemaining = Math.max(0, stageEndDay - lot.age);
            const totalKgForCycle = totalDailyKg * daysRemaining;
            const totalBagsForCycle = Math.ceil(totalKgForCycle / 50);

            const enrichedAnalysis: EnrichedRationAnalysis = {
                race: baseRation.race,
                phase: baseRation.phase,
                quantity: lot.quantity,
                daily_feed_per_bird: dailyFeedPerBird, // ✅ Valeur PAR OISEAU en grammes
                total_daily_kg: totalDailyKg, // ✅ Total pour tout le lot en kg
                ingredients: baseRation.ingredients.map(ing => ({
                    name: ing.name,
                    percentage: ing.percentage,
                    quantity_kg_per_day: (ing.percentage / 100) * totalDailyKg,
                    quantity_per_bag: (ing as any).quantity_per_bag, // Récupéré du calcul unifié
                    total_phase_kg: (ing as any).total_phase_kg // Récupéré du calcul unifié
                })),
                nutritional_values: {
                    protein_percentage: baseRation.ingredients.reduce((sum, ing) => sum + (ing.nutritional_value.protein * ing.percentage / 100), 0),
                    energy_kcal: baseRation.ingredients.reduce((sum, ing) => sum + (ing.nutritional_value.energy * ing.percentage / 100), 0),
                    calcium_percentage: baseRation.ingredients.reduce((sum, ing) => sum + ((ing.nutritional_value.calcium || 0) * ing.percentage / 100), 0) || undefined,
                },
                total_cost_per_kg: baseRation.total_cost_per_kg,
                efficiency_score: baseRation.efficiency_score,
                cycle: {
                    days_remaining: daysRemaining,
                    total_kg: totalKgForCycle,
                    total_bags: totalBagsForCycle,
                }
            };

            // 🔍 DEBUG FINAL - Afficher le résultat complet
            console.log('✅ Ration finale:', {
                phase: enrichedAnalysis.phase,
                perBird: `${enrichedAnalysis.daily_feed_per_bird}g/oiseau`,
                totalDaily: `${enrichedAnalysis.total_daily_kg.toFixed(2)}kg/jour`,
                totalCycle: `${enrichedAnalysis.cycle.total_kg.toFixed(2)}kg sur ${enrichedAnalysis.cycle.days_remaining} jours`,
                bags: `${enrichedAnalysis.cycle.total_bags} sacs de 50kg`
            });

            setCurrentRation(enrichedAnalysis);

        } catch (err: any) {
            console.error('❌ Erreur analyse ration:', err);
            setError(err.message || "Erreur lors de l'analyse de la ration.");
        } finally {
            setLoading(false);
        }
    }, [lot, formulateRation]);

    useEffect(() => {
        loadRationAnalysis();
    }, [loadRationAnalysis]);

    const handleSave = async () => {
        if (!currentRation || !lot || !selectedFeedId) {
            Alert.alert("Erreur", "Veuillez générer une ration et sélectionner un aliment avant d'enregistrer.");
            return;
        }

        setIsSaving(true);
        try {
            const rationName = `Ration IA (${currentRation.phase}) - ${currentRation.race}`;

            // 🔍 DEBUG - Vérifier les valeurs avant sauvegarde
            console.log('💾 Sauvegarde ration:', {
                rationName,
                dailyPerBird: `${currentRation.daily_feed_per_bird}g`,
                protein: `${currentRation.nutritional_values.protein_percentage.toFixed(1)}%`,
                energy: `${Math.round(currentRation.nutritional_values.energy_kcal)} kcal`
            });

            const { error: rationError } = await supabase
                .from("custom_feed_rations")
                .insert({
                    user_id: userId,
                    lot_id: lot.id,
                    name: rationName,
                    daily_consumption_per_bird_grams: currentRation.daily_feed_per_bird, // ✅ Valeur correcte
                    protein_percentage: currentRation.nutritional_values.protein_percentage,
                    energy_kcal: Math.round(currentRation.nutritional_values.energy_kcal),
                    notes: `Ration IA générée. Phase: ${currentRation.phase}. Total cycle: ${currentRation.cycle.total_kg.toFixed(2)} kg (${currentRation.cycle.total_bags} sacs). Jours restants: ${currentRation.cycle.days_remaining}.`,
                });

            if (rationError) throw new Error(`Impossible d'enregistrer la ration: ${rationError.message}`);

            const dailyQuantityPerBirdKg = currentRation.daily_feed_per_bird / 1000; // ✅ Conversion correcte

            // 🔍 DEBUG - Vérifier l'assignation
            console.log('🔗 Assignation:', {
                dailyPerBirdKg: dailyQuantityPerBirdKg,
                dailyPerBirdGrams: currentRation.daily_feed_per_bird,
                feedId: selectedFeedId
            });

            const { error: rpcError } = await supabase.rpc('upsert_lot_assignment', {
                p_user_id: userId,
                p_lot_id: lot.id,
                p_stock_item_id: selectedFeedId,
                p_daily_quantity: dailyQuantityPerBirdKg, // ✅ En kg par oiseau
                p_feed_type: currentRation.phase
            });

            if (rpcError) throw new Error(`Impossible d'assigner la ration: ${rpcError.message}`);

            Alert.alert(
                "✅ Succès",
                `Ration enregistrée:\n• ${currentRation.daily_feed_per_bird}g/oiseau/jour\n• ${currentRation.total_daily_kg.toFixed(2)}kg/jour total\n• ${currentRation.cycle.total_bags} sacs pour la phase`
            );

            if (onSaveSuccess) onSaveSuccess();
            if (onClose) onClose();

        } catch (error: any) {
            console.error('❌ Erreur sauvegarde:', error);
            Alert.alert("Erreur d'enregistrement", error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const getEfficiencyColor = (score: number) => {
        if (score >= 80) return '#10b981';
        if (score >= 40) return '#f59e0b';
        return '#ef4444';
    };

    const renderContent = () => {
        if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.loadingText}>Optimisation de la ration IA...</Text></View>;
        if (error) return <View style={styles.errorContainer}><Icon name="alert-circle" size={48} color={colors.error} /><Text style={styles.errorText}>Erreur d'analyse</Text><Text style={styles.errorSubtext}>{error}</Text><TouchableOpacity style={styles.retryButton} onPress={loadRationAnalysis}><Icon name="refresh" size={20} color={colors.white} /><Text style={styles.retryButtonText}>Réessayer</Text></TouchableOpacity></View>;

        if (currentRation) {
            return (
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Icon name="document-text" size={24} color={colors.primary} />
                            <Text style={styles.sectionTitle}>Ration Suggérée par IA</Text>
                            <View style={[styles.efficiencyBadge, { backgroundColor: getEfficiencyColor(currentRation.efficiency_score) }]}>
                                <Text style={styles.efficiencyText}>{currentRation.efficiency_score}%</Text>
                            </View>
                        </View>

                        {/* ✅ CORRECTION : Affichage clair des valeurs */}
                        <View style={styles.rationGrid}>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>Par oiseau/jour</Text>
                                <Text style={styles.metricValue}>{currentRation.daily_feed_per_bird}g</Text>
                            </View>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>Total lot/jour</Text>
                                <Text style={styles.metricValue}>{currentRation.total_daily_kg.toFixed(2)} kg</Text>
                            </View>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>Coût / kg</Text>
                                <Text style={styles.metricValue}>{currentRation.total_cost_per_kg.toFixed(0)} F</Text>
                            </View>
                        </View>

                        <View style={styles.cycleSection}>
                            <Text style={styles.cycleTitle}>📦 Prévision phase: {currentRation.phase} ({currentRation.cycle.days_remaining} j. restants)</Text>
                            <View style={styles.cycleGrid}>
                                <View style={styles.cycleItem}>
                                    <Text style={styles.cycleLabel}>Total Requis</Text>
                                    <Text style={styles.cycleValue}>{currentRation.cycle.total_kg.toFixed(1)} kg</Text>
                                </View>
                                <View style={styles.cycleItem}>
                                    <Text style={styles.cycleLabel}>Sacs de 50kg</Text>
                                    <Text style={styles.cycleValue}>{currentRation.cycle.total_bags}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.ingredientsSection}>
                            <Text style={styles.ingredientsTitle}>📋 Composition (Base 100kg)</Text>
                            {currentRation.ingredients
                                .filter((ing: any) => ing.percentage > 0)
                                .map((ing: any, index: number) => (
                                    <View key={index} style={styles.ingredientRow}>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={styles.ingredientName}>{ing.name}</Text>
                                                <Text style={styles.ingredientPercentage}>{ing.percentage.toFixed(1)}%</Text>
                                            </View>

                                            {/* Détails Pour 100kg et Total Stock */}
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                                                <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                                                    Pour 100kg: <Text style={{ fontWeight: '600', color: colors.text }}>{ing.percentage.toFixed(1)} kg</Text>
                                                </Text>
                                                <Text style={{ fontSize: 13, color: colors.primary }}>
                                                    Total Achat: <Text style={{ fontWeight: '600' }}>{ing.total_phase_kg ? ing.total_phase_kg + ' kg' : '--'}</Text>
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}

                            {/* Total Sacs en bas de liste */}
                            <View style={{ marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center', backgroundColor: colors.backgroundAlt, borderRadius: 12, padding: 16 }}>
                                <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 4 }}>📦 STOCK À PRÉVOIR (Phase)</Text>
                                <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.primary }}>{currentRation.cycle.total_bags} sacs <Text style={{ fontSize: 16, fontWeight: 'normal', color: colors.textSecondary }}>(50kg)</Text></Text>
                                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>Soit {currentRation.cycle.total_kg.toFixed(0)} kg d'aliment au total</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Assigner cette ration</Text>
                        <Text style={styles.label}>Sélectionner l'aliment du stock qui correspond</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={selectedFeedId}
                                onValueChange={(itemValue) => setSelectedFeedId(itemValue)}
                                style={styles.picker}
                            >
                                {feedStock.length > 0 ?
                                    feedStock.map(feed => <Picker.Item key={feed.id} label={feed.name} value={feed.id} />)
                                    : <Picker.Item label="Aucun aliment en stock..." value={null} />
                                }
                            </Picker>
                        </View>
                        <Button
                            text={isSaving ? "Enregistrement..." : "Enregistrer et Assigner"}
                            onPress={handleSave}
                            disabled={isSaving || !selectedFeedId}
                            style={{ marginTop: 16 }}
                        />
                    </View>
                </ScrollView>
            );
        }
        return null;
    }

    return (
        <SafeAreaView style={commonStyles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    {onClose && <TouchableOpacity onPress={onClose} style={styles.backButton}><Icon name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>}
                    <View>
                        <Text style={styles.title}>Ration IA pour {lot?.name || 'Lot'}</Text>
                        <Text style={styles.subtitle}>{lot?.quantity} sujets · {lot?.age} jours · {lot?.bird_type}</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={loadRationAnalysis} style={styles.refreshButton}>
                    {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Icon name="refresh" size={20} color={colors.primary} />}
                </TouchableOpacity>
            </View>
            {renderContent()}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    loadingText: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16, textAlign: 'center' },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    errorText: { fontSize: 18, fontWeight: '600', color: colors.error, marginTop: 16, textAlign: 'center' },
    errorSubtext: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
    retryButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
    retryButtonText: { fontSize: 16, fontWeight: '600', color: colors.white },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    backButton: { padding: 8, marginLeft: -8 },
    title: { fontSize: 20, fontWeight: '700', color: colors.text },
    subtitle: { fontSize: 14, color: colors.textSecondary },
    refreshButton: { padding: 8 },
    scrollView: { flex: 1 },
    section: { margin: 20, marginTop: 0, marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, flex: 1 },
    efficiencyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    efficiencyText: { fontSize: 12, fontWeight: '600', color: colors.white },
    rationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
    metricCard: { width: (width - 40 - 24) / 3, backgroundColor: colors.backgroundAlt, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    metricLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 4, textAlign: 'center' },
    metricValue: { fontSize: 16, fontWeight: '700', color: colors.text },
    cycleSection: { backgroundColor: `${colors.primary}10`, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: `${colors.primary}20`, marginBottom: 16 },
    cycleTitle: { fontSize: 16, fontWeight: '600', color: colors.primary, marginBottom: 8 },
    cycleGrid: { flexDirection: 'row', justifyContent: 'space-around' },
    cycleItem: { alignItems: 'center' },
    cycleLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
    cycleValue: { fontSize: 18, fontWeight: '700', color: colors.primary },
    ingredientsSection: { marginTop: 16 },
    ingredientsTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    ingredientRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    ingredientName: { fontSize: 15, color: colors.text, flex: 2 },
    ingredientValues: { flexDirection: 'row', flex: 1, justifyContent: 'space-between' },
    ingredientPercentage: { fontSize: 15, color: colors.primary, fontWeight: '600', textAlign: 'right' },
    ingredientQuantity: { fontSize: 13, color: colors.textSecondary, textAlign: 'right' },
    pickerContainer: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, marginTop: 4, backgroundColor: "#fff" },
    picker: { height: 50 },
    label: { fontWeight: "600", marginTop: 10, marginBottom: 4, color: colors.text },
});
