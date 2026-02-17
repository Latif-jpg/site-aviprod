import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { colors } from "../styles/commonStyles";
import { Picker } from '@react-native-picker/picker';
import { generateAutoRation } from "../utils/autoRation";
import { supabase } from "../config";
import Icon from './Icon';
import { useSubscription } from "../contexts/SubscriptionContext";
import { router } from 'expo-router';
import { usePremiumFeature } from "../hooks/usePremiumFeature";
import SmartTunnelModal from "./SmartTunnelModal";

interface Lot {
  id: string;
  name: string;
  breed: string;
  quantity: number;
  age: number;
  bird_type?: string;
  target_sale_date?: string;
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
  const [feedStock, setFeedStock] = useState<StockFeedItem[]>([]);
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);

  // Hook Premium pour le Tunnel Malin
  const { requestAccess, showTunnel, tunnelProps, isLoading: accessLoading } = usePremiumFeature({
    featureKey: 'auto_feeding',
    featureName: 'Ration Automatique',
    cost: 10,
  });

  useEffect(() => {
    if (selectedLot?.age && selectedLot?.bird_type) {
      const detectedPhase = getStageFromAge(selectedLot.bird_type, selectedLot.age);
      setPhase(detectedPhase);
    }
  }, [selectedLot]);

  useEffect(() => {
    setResult(null);
  }, [selectedLot]);

  useEffect(() => {
    const loadFeedStock = async () => {
      if (!selectedLot) return;
      try {
        const { data, error } = await supabase
          .from('stock')
          .select('id, name')
          .in('category', ['feed', 'other', 'supplement', 'ingredient'])
          .order('name');

        if (error) throw error;
        setFeedStock(data || []);
        if (data && data.length > 0) {
          setSelectedFeedId(data[0].id);
        }
      } catch (error) {
        console.error("Erreur stock:", error);
      }
    };
    loadFeedStock();
  }, [selectedLot]);

  const getStageFromAge = (birdType: string, age: number): string => {
    if (birdType === 'layers') {
      if (age <= 42) return 'démarrage';
      if (age <= 119) return 'croissance';
      if (age <= 140) return 'pré-ponte';
      return 'ponte';
    }
    if (age <= 21) return 'démarrage';
    if (age <= 32) return 'croissance';
    return 'finition';
  };

  const handleGenerate = async () => {
    if (!race || !phase || !nbAnimaux || parseInt(nbAnimaux) <= 0) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    // --- Appel au Tunnel Malin ---
    const access = await requestAccess();
    if (!access.granted) return;

    setIsLoading(true);
    try {
      const dailyRation = await generateAutoRation(race, phase, parseInt(nbAnimaux));

      const STAGE_END_DAYS = {
        layers: { 'démarrage': 42, 'croissance': 119, 'pré-ponte': 140, 'ponte': 540 },
        broilers: { 'démarrage': 21, 'croissance': 32, 'finition': 45 }
      };

      const birdTypeKey = selectedLot?.bird_type === 'layers' ? 'layers' : 'broilers';
      const stageEndDay = (STAGE_END_DAYS[birdTypeKey] as any)[phase] || (selectedLot?.age || 0) + 1;

      let daysRemainingInStage = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const isLastStage = (birdTypeKey === 'broilers' && phase === 'finition') || (birdTypeKey === 'layers' && phase === 'ponte');

      if (selectedLot?.target_sale_date && isLastStage) {
        const saleDate = new Date(selectedLot.target_sale_date);
        daysRemainingInStage = Math.max(0, Math.ceil((saleDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
      } else {
        daysRemainingInStage = Math.max(0, (stageEndDay as number) - (selectedLot?.age || 0));
      }

      const totalKg = Number(dailyRation.totalKg) || 0;
      setResult({
        ...dailyRation,
        cycle: {
          daysRemaining: daysRemainingInStage,
          totalKg: totalKg * daysRemainingInStage,
          totalBags: Math.ceil((totalKg * daysRemainingInStage) / 50),
        }
      });
    } catch (error: any) {
      Alert.alert("Erreur", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result || !selectedLot || !selectedFeedId) {
      Alert.alert("Erreur", "Générez une ration et sélectionnez un aliment.");
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

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
        })
        .select().single();

      if (rationError) throw rationError;

      const { error: rpcError } = await supabase.rpc('upsert_lot_assignment', {
        p_user_id: user.id,
        p_lot_id: selectedLot.id,
        p_stock_item_id: selectedFeedId,
        p_daily_quantity: result.dailyPerBird / 1000,
        p_feed_type: result.ration.stage
      });

      if (rpcError) throw rpcError;

      Alert.alert("Succès", "Ration enregistrée et assignée !");
      if (onSave) onSave();
    } catch (error: any) {
      Alert.alert("Erreur", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || isPremiumLoading) {
    return <ActivityIndicator style={{ margin: 20 }} size="large" color={colors.primary} />;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Formulation automatique</Text>

      <Text style={styles.label}>Race</Text>
      <TextInput
        placeholder="Ex: Pondeuse, Chair..."
        value={race}
        onChangeText={setRace}
        style={styles.input}
      />

      <Text style={styles.label}>Phase détectée : {phase}</Text>

      <Text style={styles.label}>Nombre d'animaux</Text>
      <TextInput
        keyboardType="numeric"
        value={nbAnimaux}
        onChangeText={setNbAnimaux}
        style={styles.input}
      />

      <Text style={styles.label}>Aliment du stock</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedFeedId}
          onValueChange={(val) => setSelectedFeedId(val)}
        >
          {feedStock.map(feed => <Picker.Item key={feed.id} label={feed.name} value={feed.id} />)}
        </Picker>
      </View>

      <TouchableOpacity style={styles.btn} onPress={handleGenerate}>
        <Text style={styles.btnText}>⚡ Générer la ration (10 🪙)</Text>
      </TouchableOpacity>

      {result && (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>Ration composée</Text>
          <Text>📊 {result.dailyPerBird}g / oiseau / jour</Text>
          <Text>🧪 Protéines : {result.protein}%</Text>
          <Text>🔥 Énergie : {result.energy} kcal/kg</Text>
          <Text>📦 Total Phase ({result.cycle.daysRemaining}j) : {result.cycle.totalKg.toFixed(1)} kg</Text>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveText}>💾 Enregistrer et Assigner</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal du Tunnel Malin */}
      <SmartTunnelModal {...tunnelProps} />

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f8f8f8" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  label: { fontWeight: "600", marginTop: 10, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  btn: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  result: {
    marginTop: 20,
    backgroundColor: "#eef6f1",
    padding: 16,
    borderRadius: 12,
  },
  resultTitle: { fontWeight: "700", fontSize: 16, marginBottom: 10 },
  saveBtn: {
    backgroundColor: colors.success,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  saveText: { color: "#fff", fontWeight: "700" },
});