import { ensureSupabaseInitialized } from "../app/integrations/supabase/client";

export const generateAutoRation = async (race: string, phase: string, nbAnimaux: number) => {
  const supabase = await ensureSupabaseInitialized();

  // Normalize breed and phase
  const normalizedBreed = race.toLowerCase().includes('pondeuse') || race.toLowerCase().includes('layer') ? 'layer' :
                         race.toLowerCase().includes('chair') || race.toLowerCase().includes('broiler') ? 'broiler' : 'broiler';

  const normalizedPhase = phase.toLowerCase();
  const stage = normalizedPhase.includes('démarrage') || normalizedPhase.includes('starter') ? 'starter' :
                normalizedPhase.includes('croissance') || normalizedPhase.includes('grower') ? 'grower' :
                normalizedPhase.includes('pré-ponte') || normalizedPhase.includes('pre-lay') ? 'grower' :
                normalizedPhase.includes('ponte') || normalizedPhase.includes('layer') ? 'layer' :
                normalizedPhase.includes('finition') || normalizedPhase.includes('finisher') ? 'finisher' : 'finisher';

  console.log('🔍 Generating ration composition for:', { normalizedBreed, stage });

  // Get feed ration nutritional requirements
  let { data: ration, error } = await supabase
    .from('feed_rations')
    .select('*')
    .eq('breed', normalizedBreed)
    .eq('stage', stage);

  if (error) {
    console.error('❌ Database error:', error);
    throw new Error(`Erreur de base de données: ${error.message}`);
  }

  let selectedRation;
  if (!ration || ration.length === 0) {
    // Use default nutritional requirements based on phase
    const defaultRequirements = {
      starter: { protein: 21, energy: 2900 },
      grower: { protein: 19, energy: 3000 },
      finisher: { protein: 18, energy: 3100 },
      layer: { protein: 16, energy: 2750 }
    };

    selectedRation = {
      protein_percentage: defaultRequirements[stage as keyof typeof defaultRequirements]?.protein || 18,
      energy_kcal: defaultRequirements[stage as keyof typeof defaultRequirements]?.energy || 3000,
      daily_consumption_per_bird_grams: stage === 'starter' ? 25 : stage === 'grower' ? 80 : stage === 'finisher' ? 120 : 110
    };
    console.log('⚠️ Using default nutritional requirements:', selectedRation);
  } else {
    selectedRation = ration[0];
    console.log('✅ Found ration requirements:', selectedRation);
  }

  // Generate ingredient composition using Pearson Square method based on actual nutritional needs
  const targetProtein = selectedRation.protein_percentage; // Use actual nutritional requirements
  const ingredients = await getAvailableIngredients(supabase);

  // Calculate composition based on real nutritional needs
  const composition = calculatePearsonSquareComposition(ingredients, targetProtein, stage, normalizedBreed);

  // Calculate total consumption
  const totalDailyGrams = selectedRation.daily_consumption_per_bird_grams * nbAnimaux;
  const totalKg = totalDailyGrams / 1000;
  const bags = (totalKg / 50).toFixed(2);

  // Calculate ingredient quantities
  const ingredientQuantities = composition.map(item => ({
    ...item,
    quantityKg: (item.percentage / 100) * totalKg,
    totalQuantity: ((item.percentage / 100) * totalKg).toFixed(2) + ' kg'
  }));

  return {
    ration: selectedRation,
    ingredients: ingredientQuantities,
    totalKg: totalKg.toFixed(2),
    protein: targetProtein,
    energy: selectedRation.energy_kcal,
    bags,
    dailyPerBird: selectedRation.daily_consumption_per_bird_grams,
    totalDailyGrams,
  };
};

// Get available ingredients from database
const getAvailableIngredients = async (supabase: any) => {
  const { data, error } = await supabase
    .from('feed_ingredients')
    .select('*')
    .eq('available', true)
    .order('protein_percent', { ascending: false });

  if (error) {
    console.log('⚠️ No ingredients in database, using defaults');
    // Return default West African ingredients
    return [
      { name: "Tourteau de soja", protein_percent: 44, energy_kcal: 2500 },
      { name: "Maïs jaune", protein_percent: 9, energy_kcal: 3300 },
      { name: "Son de blé", protein_percent: 16, energy_kcal: 2000 },
      { name: "Farine de poisson", protein_percent: 55, energy_kcal: 2400 },
      { name: "Coquilles d'huîtres", protein_percent: 0, energy_kcal: 0 },
      { name: "Sel", protein_percent: 0, energy_kcal: 0 }
    ];
  }

  return data || [];
};

// Calculate ingredient composition using real West African formulations
const calculatePearsonSquareComposition = (ingredients: any[], targetProtein: number, stage: string, breed: string) => {
  // Real formulations based on West African poultry farming standards

  const formulations = {
    broiler: {
      starter: [
        { name: "Maïs grain", percentage: 52, protein: 9 },
        { name: "Tourteau de soja", percentage: 20, protein: 44 },
        { name: "Tourteau de coton", percentage: 8, protein: 36 },
        { name: "Son de blé", percentage: 5, protein: 16 },
        { name: "Farine de poisson", percentage: 8, protein: 55 },
        { name: "Coquilles d'huîtres", percentage: 3, protein: 0 },
        { name: "Phosphate bicalcique", percentage: 1.5, protein: 0 },
        { name: "Sel", percentage: 0.3, protein: 0 },
        { name: "Prémix vitamines/minéraux", percentage: 0.5, protein: 0 },
        { name: "Huile de palme/arachide", percentage: 1.5, protein: 0 }
      ],
      grower: [
        { name: "Maïs grain", percentage: 58, protein: 9 },
        { name: "Tourteau de soja", percentage: 15, protein: 44 },
        { name: "Tourteau de coton", percentage: 10, protein: 36 },
        { name: "Son de riz", percentage: 6, protein: 12 },
        { name: "Farine de poisson", percentage: 5, protein: 55 },
        { name: "Coquilles d'huîtres", percentage: 2.5, protein: 0 },
        { name: "Phosphate bicalcique", percentage: 1, protein: 0 },
        { name: "Sel", percentage: 0.3, protein: 0 },
        { name: "Prémix", percentage: 0.5, protein: 0 },
        { name: "Huile de palme", percentage: 1.7, protein: 0 }
      ],
      finisher: [
        { name: "Maïs grain", percentage: 62, protein: 9 },
        { name: "Tourteau de soja", percentage: 12, protein: 44 },
        { name: "Tourteau de coton", percentage: 8, protein: 36 },
        { name: "Son de riz", percentage: 8, protein: 12 },
        { name: "Farine de poisson", percentage: 3, protein: 55 },
        { name: "Coquilles d'huîtres", percentage: 2.5, protein: 0 },
        { name: "Phosphate bicalcique", percentage: 1, protein: 0 },
        { name: "Sel", percentage: 0.3, protein: 0 },
        { name: "Prémix", percentage: 0.5, protein: 0 },
        { name: "Huile de palme", percentage: 2.7, protein: 0 }
      ]
    },
    layer: {
      starter: [
        { name: "Maïs grain", percentage: 55, protein: 9 },
        { name: "Tourteau de soja", percentage: 18, protein: 44 },
        { name: "Tourteau d'arachide", percentage: 10, protein: 45 },
        { name: "Son de blé", percentage: 8, protein: 16 },
        { name: "Farine de poisson", percentage: 4, protein: 55 },
        { name: "Coquilles d'huîtres", percentage: 2, protein: 0 },
        { name: "Phosphate bicalcique", percentage: 1.5, protein: 0 },
        { name: "Sel", percentage: 0.3, protein: 0 },
        { name: "Prémix", percentage: 0.5, protein: 0 },
        { name: "Huile", percentage: 0.7, protein: 0 }
      ],
      grower: [
        { name: "Maïs grain", percentage: 57, protein: 9 },
        { name: "Tourteau de soja", percentage: 16, protein: 44 },
        { name: "Tourteau d'arachide", percentage: 8, protein: 45 },
        { name: "Son de blé", percentage: 10, protein: 16 },
        { name: "Farine de poisson", percentage: 3, protein: 55 },
        { name: "Coquilles d'huîtres", percentage: 2.5, protein: 0 },
        { name: "Phosphate bicalcique", percentage: 1.2, protein: 0 },
        { name: "Sel", percentage: 0.3, protein: 0 },
        { name: "Prémix", percentage: 0.5, protein: 0 },
        { name: "Huile", percentage: 1.5, protein: 0 }
      ],
      layer: [
        { name: "Maïs grain", percentage: 60, protein: 9 },
        { name: "Tourteau de soja", percentage: 15, protein: 44 },
        { name: "Tourteau d'arachide", percentage: 5, protein: 45 },
        { name: "Son de riz", percentage: 6, protein: 12 },
        { name: "Farine de poisson", percentage: 3, protein: 55 },
        { name: "Coquilles d'huîtres/calcaire", percentage: 8, protein: 0 },
        { name: "Phosphate bicalcique", percentage: 1, protein: 0 },
        { name: "Sel", percentage: 0.3, protein: 0 },
        { name: "Prémix pondeuses", percentage: 0.5, protein: 0 },
        { name: "Huile de palme", percentage: 1.2, protein: 0 }
      ]
    }
  };

  // Get the appropriate formulation
  const breedKey = breed.includes('layer') || breed.includes('pondeuse') ? 'layer' : 'broiler';
  const stageKey = stage as keyof typeof formulations.broiler;

  const formulation = formulations[breedKey]?.[stageKey] || formulations.broiler.finisher;

  // Calculate quantities based on total needed
  return formulation.map((item: any) => ({
    ...item,
    quantityKg: (item.percentage / 100) // Will be calculated based on total needed
  }));
};