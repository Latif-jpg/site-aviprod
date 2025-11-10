import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from "react-native";
import { colors } from "../styles/commonStyles";
import { calculateRationStats } from "../utils/calculateRation";
import { supabase } from "../config"; // Import supabase directly
import { useDataCollector } from "../src/hooks/useDataCollector";

interface Ingredient {
  id: string;
  name: string;
  quantityKg: number;
  protein: number;
  energy: number;
  calcium?: number;
  phosphorus?: number;
}

export default function ManualRationForm() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: "1", name: "", quantityKg: 0, protein: 0, energy: 0 },
  ]);
  const [summary, setSummary] = useState<any>(null);
  const { trackAction } = useDataCollector();

  useEffect(() => {
    const stats = calculateRationStats(ingredients);
    if (stats) setSummary(stats);
  }, [ingredients]);

  const handleChange = (id: string, field: keyof Ingredient, value: string) => {
    setIngredients((prev) =>
      prev.map((ing) =>
        ing.id === id
          ? { ...ing, [field]: field === "name" ? value : parseFloat(value) || 0 }
          : ing
      )
    );
  };

  const addIngredient = () => {
    setIngredients((prev) => [
      ...prev,
      { id: Date.now().toString(), name: "", quantityKg: 0, protein: 0, energy: 0 },
    ]);
  };

  const removeIngredient = (id: string) => {
    setIngredients((prev) => prev.filter((ing) => ing.id !== id));
  };

  const handleSave = async () => {
    if (!summary) {
      Alert.alert("Erreur", "Veuillez ajouter au moins un ingrédient");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Erreur", "Utilisateur non connecté");
        return;
      }

      const ingredientNames = ingredients.map(ing => ing.name).filter(name => name.trim()).join(", ");

      const { error } = await supabase.from("custom_feed_rations").insert([
        {
          user_id: user.id,
          name: `Ration manuelle - ${ingredients.length} ingrédients`,
          daily_consumption_per_bird_grams: 0, // Will be set when assigned to a lot
          protein_percentage: summary.proteinPercent,
          energy_kcal: summary.energyKcal,
          notes: `Ingrédients: ${ingredientNames}. Total: ${summary.totalWeightKg}kg (${summary.totalBags50kg} sacs)`,
        },
      ]);

      if (error) throw error;

      // TRACKER LA CRÉATION DE RATION
      trackAction(
        'ration_created',
        {
          ration_name: `Ration manuelle - ${ingredients.length} ingrédients`,
          ingredients_count: ingredients.length,
          total_weight_kg: summary.totalWeightKg,
          protein_percentage: summary.proteinPercent,
          energy_kcal: summary.energyKcal,
          ingredient_names: ingredientNames,
        }
      );

      Alert.alert("Succès", "Ration enregistrée avec succès !");
    } catch (error: any) {
      Alert.alert("Erreur", "Impossible d'enregistrer la ration");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={styles.title}>Formulation manuelle de ration</Text>

      {ingredients.map((ing, index) => (
        <View key={ing.id} style={styles.card}>
          <Text style={styles.subtitle}>Ingrédient {index + 1}</Text>

          <TextInput
            placeholder="Nom de l'ingrédient"
            value={ing.name}
            onChangeText={(text) => handleChange(ing.id, "name", text)}
            style={styles.input}
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Quantité (kg)</Text>
              <TextInput
                keyboardType="numeric"
                value={ing.quantityKg.toString()}
                onChangeText={(text) => handleChange(ing.id, "quantityKg", text)}
                style={styles.input}
              />
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Protéine (%)</Text>
              <TextInput
                keyboardType="numeric"
                value={ing.protein.toString()}
                onChangeText={(text) => handleChange(ing.id, "protein", text)}
                style={styles.input}
              />
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Énergie (kcal/kg)</Text>
              <TextInput
                keyboardType="numeric"
                value={ing.energy.toString()}
                onChangeText={(text) => handleChange(ing.id, "energy", text)}
                style={styles.input}
              />
            </View>
          </View>

          {ingredients.length > 1 && (
            <TouchableOpacity style={styles.deleteBtn} onPress={() => removeIngredient(ing.id)}>
              <Text style={styles.deleteText}>🗑 Supprimer</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      <TouchableOpacity style={styles.addBtn} onPress={addIngredient}>
        <Text style={styles.addText}>➕ Ajouter un ingrédient</Text>
      </TouchableOpacity>

      {summary && (
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Résumé nutritionnel</Text>
          <Text style={styles.summaryItem}>⚖️ Poids total : {summary.totalWeightKg.toFixed(2)} kg</Text>
          <Text style={styles.summaryItem}>🧪 Protéines moyennes : {summary.proteinPercent.toFixed(2)} %</Text>
          <Text style={styles.summaryItem}>🔥 Énergie moyenne : {summary.energyKcal.toFixed(0)} kcal/kg</Text>
          <Text style={styles.summaryItem}>🪣 Nombre de sacs (50 kg) : {summary.totalBags50kg}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveText}>💾 Enregistrer la ration</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background || "#f9f9f9",
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text || "#222",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  subtitle: {
    fontWeight: "600",
    marginBottom: 10,
    color: colors.text || "#222",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 8,
    fontSize: 14,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  col: {
    flex: 1,
    marginHorizontal: 4,
  },
  label: {
    fontSize: 12,
    color: "#555",
  },
  deleteBtn: {
    alignSelf: "flex-end",
    marginTop: 4,
  },
  deleteText: {
    color: "#d9534f",
    fontWeight: "600",
  },
  addBtn: {
    backgroundColor: colors.primary || "#4caf50",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginVertical: 16,
  },
  addText: {
    color: "#fff",
    fontWeight: "700",
  },
  summary: {
    backgroundColor: "#eef6f1",
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
  },
  summaryTitle: {
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 8,
    color: colors.text || "#222",
  },
  summaryItem: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  saveBtn: {
    backgroundColor: colors.success || "#28a745",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 24,
  },
  saveText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});