interface Ingredient {
  id: string;
  name: string;
  quantityKg: number;
  protein: number;
  energy: number;
  calcium?: number;
  phosphorus?: number;
}

export const calculateRationStats = (ingredients: Ingredient[]) => {
  const totalWeight = ingredients.reduce((sum, i) => sum + i.quantityKg, 0);
  if (totalWeight === 0) return null;

  const protein =
    ingredients.reduce((sum, i) => sum + i.protein * i.quantityKg, 0) / totalWeight;
  const energy =
    ingredients.reduce((sum, i) => sum + i.energy * i.quantityKg, 0) / totalWeight;

  const totalBags = totalWeight / 50;

  return {
    totalWeightKg: totalWeight,
    proteinPercent: protein,
    energyKcal: energy,
    totalBags50kg: totalBags.toFixed(2),
  };
};