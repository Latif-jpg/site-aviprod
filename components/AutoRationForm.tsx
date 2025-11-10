import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { colors } from "../styles/commonStyles";
import { Picker } from '@react-native-picker/picker'; // Importer le sélecteur
import { generateAutoRation } from "../utils/autoRation";
import { supabase } from "../config"; // Import supabase directly
import Icon from './Icon';

// --- ÉTAPE 1: Importer les outils de verrouillage ---
import { useSubscription } from "../contexts/SubscriptionContext";
import PremiumModal from "./PremiumModal";
import { router } from 'expo-router';

interface Lot {
  id: string;
  name: string;
  breed: string;
  quantity: number;
  age: number;
}

interface AutoRationFormProps {
  selectedLot?: Lot | null;
  onSave?: () => void;
}

interface StockFeedItem {
  id: string;
  name: string;
}


export default function AutoRationForm({ selectedLot, onSave }: AutoRationFormProps) {
   const [race, setRace] = useState(selectedLot?.breed || "");
   const [phase, setPhase] = useState("");
   const [nbAnimaux, setNbAnimaux] = useState(selectedLot?.quantity?.toString() || "0");
   const [result, setResult] = useState<any>(null);
   const [isLoading, setIsLoading] = useState(false);
   const [paidAccess, setPaidAccess] = useState(false); // Pour suivre si l'accès a été payé avec Avicoins
   // --- NOUVEAU : Gérer la liste des aliments et la sélection ---
   const [feedStock, setFeedStock] = useState<StockFeedItem[]>([]);
   const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);

   // --- ÉTAPE 2: Utiliser le hook d'abonnement ---
   const { hasAccess, canAffordFeature, getFeatureCost, loading: subscriptionLoading } = useSubscription();
   const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Auto-detect phase based on lot age and breed type
  useEffect(() => {
    if (selectedLot?.age && selectedLot?.bird_type) {
      const detectedPhase = getStageFromAge(selectedLot.bird_type, selectedLot.age);
      setPhase(detectedPhase);
    }
  }, [selectedLot]);

  // Reset result when lot changes
  useEffect(() => {
    setResult(null);
    setPaidAccess(false); // Reset paid access when lot changes
  }, [selectedLot]);

  // --- NOUVEAU : Charger les aliments du stock ---
  useEffect(() => {
    const loadFeedStock = async () => {
      if (!selectedLot) return;
      try {
        const { data, error } = await supabase
          .from('stock')
          .select('id, name')
          .eq('category', 'feed');

        if (error) throw error;
        setFeedStock(data || []);
        if (data && data.length > 0) {
          setSelectedFeedId(data[0].id); // Pré-sélectionner le premier aliment
        }
      } catch (error) {
        console.error("Erreur lors du chargement du stock d'aliments:", error);
      }
    };
    loadFeedStock();
  }, [selectedLot]);

  const getStageFromAge = (birdType: string, age: number): 'démarrage' | 'croissance' | 'finition' | 'ponte' | 'pré-ponte' | 'inconnu' => {
    // Protocole pour les races commerciales à croissance rapide (Broilers)
    if (birdType === 'layers') { // Pondeuses
      if (age <= 42) return 'démarrage'; // J1 à J42
      if (age <= 119) return 'croissance'; // J43 à J119
      if (age <= 140) return 'pré-ponte'; // J120 à J140
      return 'ponte';
    }
    // Protocole pour les poulets de chair (Broilers) et autres par défaut
    if (age <= 21) return 'démarrage'; // J1 à J21
    if (age <= 32) return 'croissance'; // J22 à J32
    return 'finition';
  };

  const handleGenerate = async () => {
    if (!race || !phase || !nbAnimaux || parseInt(nbAnimaux) <= 0) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs correctement");
      return;
    }

    setIsLoading(true);
    try {
      const ration = await generateAutoRation(race, phase, parseInt(nbAnimaux));
      setResult(ration);
    } catch (error: any) {
      Alert.alert("Erreur", error.message || "Impossible de générer la ration");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayWithAvicoins = async () => {
    const cost = getFeatureCost('auto_feeding');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Erreur", "Utilisateur non connecté");
        return;
      }

      // Déduire les Avicoins
      const { error } = await supabase
        .from('avicoins_transactions')
        .insert({
          user_id: user.id,
          amount: -cost,
          transaction_type: 'spent',
          description: `Calcul automatique de ration (${race} - ${phase})`,
          reference_type: 'auto_feeding'
        });

      if (error) {
        console.error('Erreur lors de la déduction Avicoins:', error);
        Alert.alert("Erreur", "Impossible de débiter les Avicoins");
        return;
      }

      // Marquer l'accès comme payé
      setPaidAccess(true);

      // Rafraîchir le solde Avicoins sur le dashboard
      const { DeviceEventEmitter } = require('react-native');
      DeviceEventEmitter.emit('refreshAvicoins');

      Alert.alert("Succès", `${cost} Avicoins ont été débités. Vous pouvez maintenant utiliser le calcul automatique de ration.`);

    } catch (error: any) {
      console.error('Erreur lors du paiement Avicoins:', error);
      Alert.alert("Erreur", "Impossible de traiter le paiement");
    }
  };

  // --- CORRECTION : S'assurer que la génération auto ne se fait qu'une seule fois ---
  useEffect(() => {
    // Ce hook ne doit s'exécuter qu'au premier chargement du lot.
    // La condition `!result` empêche une nouvelle génération si un résultat existe déjà.
    if (selectedLot && !result) {
      handleGenerate();
    }
  }, [selectedLot]); // Retrait des autres dépendances pour éviter les re-déclenchements.

  const handleSave = async () => {
    if (!result || !selectedLot || !selectedFeedId) {
      Alert.alert("Erreur", "Veuillez générer une ration et sélectionner un aliment avant d'enregistrer.");
      return;
    }

    setIsLoading(true); // Démarrer le chargement
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non connecté.");

      // --- ÉTAPE 1 : Enregistrer les détails de la ration dans custom_feed_rations ---
      console.log('💾 Étape 1: Enregistrement des détails de la ration...');
      const rationName = `Ration auto (${result.ration.stage}) - ${race}`;
      const { data: savedRation, error: rationError } = await supabase
        .from("custom_feed_rations")
        .insert({
          user_id: user.id,
          lot_id: selectedLot.id,
          name: rationName,
          daily_consumption_per_bird_grams: result.dailyPerBird,
          protein_percentage: result.protein,
          energy_kcal: result.energy,
          notes: `Quantité totale : ${result.totalKg} kg (${result.bags} sacs de 50kg)`,
        })
        .select()
        .single();

      if (rationError) {
        console.error('❌ Erreur lors de l\'enregistrement de la ration:', rationError);
        throw new Error(`Impossible d'enregistrer les détails de la ration: ${rationError.message}`);
      }
      console.log('✅ Ration enregistrée avec succès:', savedRation);

      // --- ÉTAPE 2 : Créer ou mettre à jour l'assignation dans lot_stock_assignments ---
      console.log('🔗 Étape 2: Création de l\'assignation de stock...');
      const dailyQuantityPerBirdKg = result.dailyPerBird / 1000; // Convertir les grammes en kg

      // --- LOGIQUE AMÉLIORÉE : Utiliser une fonction RPC pour une opération atomique ---
      const { error: rpcError } = await supabase.rpc('upsert_lot_assignment', {
        p_user_id: user.id,
        p_lot_id: selectedLot.id,
        p_stock_item_id: selectedFeedId,
        p_daily_quantity: dailyQuantityPerBirdKg,
        p_feed_type: result.ration.stage
      });

      if (rpcError) {
        console.error('❌ Erreur RPC lors de la création de l\'assignation:', rpcError);
        throw new Error(`Impossible de créer l'assignation: ${rpcError.message}`);
      }
      
      console.log('✅ Assignation créée avec succès.');

      Alert.alert("Succès", "L'assignation de l'aliment a été enregistrée avec succès !");
      if (onSave) { // Appeler la fonction de rafraîchissement si elle est fournie
          onSave();
      }
    } catch (error: any) {
      // --- GESTION D'ERREUR AMÉLIORÉE ---
      Alert.alert("Erreur d'enregistrement", error.message || "Une erreur inattendue est survenue.");
    } finally {
      setIsLoading(false); // Arrêter le chargement
    }
  };


  // --- ÉTAPE 3: Verrouiller l'accès ---
  if (subscriptionLoading) {
    return <ActivityIndicator style={{ margin: 20 }} size="large" color={colors.primary} />;
  }

  if (!hasAccess('auto_feeding') && !paidAccess) {
    const cost = getFeatureCost('auto_feeding');
    const canAfford = canAffordFeature('auto_feeding');

    if (canAfford) {
      // L'utilisateur peut payer avec des Avicoins
      return (
        <View style={styles.premiumContainer}>
          <Text style={styles.premiumTitle}>Fonctionnalité Premium</Text>
          <Text style={styles.premiumText}>
            Le calcul automatique des rations coûte {cost} Avicoins.{'\n'}
            Cette fonctionnalité sera débloquée pour cette session.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={handlePayWithAvicoins}>
            <Text style={styles.btnText}>🪙 Utiliser {cost} Avicoins</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary, marginTop: 10 }]} onPress={() => {
            try {
              router.push('/subscription-plans');
            } catch (error) {
              console.error('Navigation error:', error);
            }
          }}>
            <Text style={styles.btnText}>💎 S'abonner (accès permanent)</Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      // L'utilisateur n'a pas assez d'Avicoins, proposer abonnement ou achat d'Avicoins
      return (
        <View style={styles.premiumContainer}>
          <Text style={styles.premiumTitle}>Fonctionnalité Premium</Text>
          <Text style={styles.premiumText}>
            Le calcul automatique des rations est réservé aux abonnés.{'\n'}
            Coût: {cost} Avicoins ou abonnement premium.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={() => {
            try {
              router.push('/subscription-plans');
            } catch (error) {
              console.error('Navigation error:', error);
            }
          }}>
            <Text style={styles.btnText}>💎 S'abonner maintenant</Text>
          </TouchableOpacity>
        </View>
      );
    }
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Formulation automatique de ration (Premium)</Text>

      <Text style={styles.label}>Race</Text>
      <TextInput
        placeholder="Ex: Pondeuse, Chair, Locale..."
        value={race}
        onChangeText={setRace}
        style={styles.input}
      />

      <Text style={styles.label}>Phase de croissance</Text>
      <View style={styles.autoDetectedField}>
        <Icon name="leaf" size={20} color={colors.primary} />
        <Text style={styles.autoDetectedText}>
          {phase ? `Phase détectée : ${phase.charAt(0).toUpperCase() + phase.slice(1)}` : 'En attente de l\'âge du lot...'}
        </Text>
      </View>

      <Text style={styles.label}>Nombre d'animaux</Text>
      <TextInput
        keyboardType="numeric"
        value={nbAnimaux}
        onChangeText={setNbAnimaux}
        style={styles.input}
      />

      {/* --- NOUVEAU : Sélecteur d'aliment --- */}
      <Text style={styles.label}>Sélectionner l'aliment du stock *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedFeedId}
          onValueChange={(itemValue) => setSelectedFeedId(itemValue)}
          style={styles.picker}
        >
          {feedStock.length === 0 ? (
            <Picker.Item label="Aucun aliment dans le stock..." value={null} enabled={false} />
          ) : (
            feedStock.map(feed => <Picker.Item key={feed.id} label={feed.name} value={feed.id} />)
          )}
        </Picker>
      </View>


      <TouchableOpacity style={[styles.btn, isLoading && { opacity: 0.6 }]} onPress={handleGenerate} disabled={isLoading}>
        <Text style={styles.btnText}>{isLoading ? "⏳ Génération..." : "⚡ Générer la ration"}</Text>
      </TouchableOpacity>

      {result && (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>Ration composée automatiquement</Text>

          <Text style={styles.resultLine}>
            📊 Race: {race} - Phase: {phase}
          </Text>
          <Text style={styles.resultLine}>
            🐔 Nombre d'animaux: {nbAnimaux}
          </Text>
          <Text style={styles.resultLine}>
            ⚖️ Consommation par oiseau: {result.dailyPerBird}g/jour
          </Text>

          <Text style={styles.sectionTitle}>🥘 Composition des ingrédients</Text>
          {result.ingredients?.map((ing: any, index: number) => (
            <Text key={index} style={styles.ingredientLine}>
              • {ing.name}: {ing.percentage}% ({ing.totalQuantity})
            </Text>
          ))}

          <Text style={styles.sectionTitle}>📊 Valeurs nutritionnelles</Text>
          <Text style={styles.summary}>⚖️ Total journalier : {result.totalKg} kg</Text>
          <Text style={styles.summary}>🧪 Protéines : {result.protein}%</Text>
          <Text style={styles.summary}>🔥 Énergie : {result.energy} kcal/kg</Text>
          <Text style={styles.summary}>🪣 Sacs (50kg) : {result.bags}</Text>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveText}>💾 Enregistrer cette ration</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f8f8f8" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  label: { fontWeight: "600", marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
    backgroundColor: "#fff",
  },
  autoDetectedField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
    backgroundColor: colors.backgroundAlt,
    gap: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: "#fff",
  },
  picker: {
    height: 50,
  },
  autoDetectedText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  btn: {
    backgroundColor: colors.primary || "#4caf50",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  btnText: { color: "#fff", fontWeight: "700" },
  result: {
    marginTop: 20,
    backgroundColor: "#eef6f1",
    padding: 16,
    borderRadius: 12,
  },
  resultTitle: { fontWeight: "700", fontSize: 16, marginBottom: 10 },
  resultLine: { fontSize: 14, marginBottom: 4 },
  summary: { marginTop: 6, fontWeight: "600" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
    marginTop: 12,
    marginBottom: 8,
  },
  ingredientLine: {
    fontSize: 14,
    marginBottom: 2,
    paddingLeft: 8,
  },
  saveBtn: {
    backgroundColor: colors.success || "#28a745",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  saveText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  premiumContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    margin: 16,
  },
  premiumTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  premiumText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
});