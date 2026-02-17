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
    // .eq('available', true) // --- MODIFICATION : On prend TOUT pour afficher tout le potentiel
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

  // Liste des ingrédients standards "de secours" si l'utilisateur ne les a pas encore créés
  const defaultStandardIngredients = [
    { name: "Maïs grain", protein_percent: 9, energy_kcal: 3350, id: 'std_corn' },
    { name: "Tourteau de soja", protein_percent: 44, energy_kcal: 2230, id: 'std_soy' },
    { name: "Son de blé", protein_percent: 16, energy_kcal: 1300, id: 'std_bran' },
    { name: "Farine de poisson", protein_percent: 55, energy_kcal: 2800, id: 'std_fish' },
    { name: "Coquilles d'huîtres", protein_percent: 0, energy_kcal: 0, id: 'std_shell' },
    { name: "Sel", protein_percent: 0, energy_kcal: 0, id: 'std_salt' },
    { name: "Prémix", protein_percent: 0, energy_kcal: 0, id: 'std_premix' }
  ];

  if (error || !data) {
    console.log('⚠️ Erreur ou pas de données, utilisation des standards');
    return defaultStandardIngredients;
  }

  // FUSION INTELLIGENTE : On utilise les ingrédients de la base, mais on complète avec les standards s'ils manquent
  // pour éviter que le calcul ne plante par manque de Maïs ou de Soja.
  const userIngredients = data;
  const combinedIngredients = [...userIngredients];

  // Vérifier les essentiels manquants
  const hasEnergy = userIngredients.some((i: any) => i.name.toLowerCase().includes('maïs') || i.name.toLowerCase().includes('corn'));
  const hasProtein = userIngredients.some((i: any) => i.name.toLowerCase().includes('soja') || i.name.toLowerCase().includes('fish') || i.name.toLowerCase().includes('poisson'));

  if (!hasEnergy) {
    console.log('➕ Ajout automatique du Maïs standard (manquant en base)');
    combinedIngredients.push(defaultStandardIngredients[0]);
  }
  if (!hasProtein) {
    console.log('➕ Ajout automatique du Soja standard (manquant en base)');
    combinedIngredients.push(defaultStandardIngredients[1]);
  }

  // Ajouter les minéraux manquants pour l'affichage complet
  defaultStandardIngredients.slice(4).forEach(std => {
    if (!userIngredients.some((i: any) => i.name.toLowerCase().includes(std.name.toLowerCase().split(' ')[0]))) {
      combinedIngredients.push(std);
    }
  });

  return combinedIngredients;
};

// Algorithme de formulation dynamique (Carré de Pearson modifié)
const calculatePearsonSquareComposition = (availableIngredients: any[], targetProtein: number, stage: string, breed: string) => {
  console.log('🧮 Début du calcul de ration dynamique...');

  // 1. Classification des ingrédients disponibles
  const energySources = availableIngredients.filter(i =>
    i.protein_percent < 12 && (i.name.toLowerCase().includes('maïs') || i.name.toLowerCase().includes('corn') || i.name.toLowerCase().includes('sorgho'))
  );

  const proteinSources = availableIngredients.filter(i =>
    i.protein_percent > 20 && (i.name.toLowerCase().includes('soja') || i.name.toLowerCase().includes('fish') || i.name.toLowerCase().includes('poisson') || i.name.toLowerCase().includes('concentré'))
  );

  const mineralsAndAdditives = availableIngredients.filter(i =>
    i.protein_percent < 5 && (i.name.toLowerCase().includes('coquille') || i.name.toLowerCase().includes('sel') || i.name.toLowerCase().includes('prémix') || i.name.toLowerCase().includes('phosphate'))
  );

  const fillers = availableIngredients.filter(i =>
    i.name.toLowerCase().includes('son') && i.protein_percent >= 10 && i.protein_percent <= 20
  );

  // 2. Définir les ingrédients fixes (Minéraux & Additifs indispensables)
  // On essaye de trouver les équivalents dans le stock de l'utilisateur, sinon on ignore (ou on alerte idéalement)
  const fixedIngredients = [
    { type: 'coquille', target: breed === 'layer' && stage.includes('ponte') ? 8 : 1.5, found: null as any },
    { type: 'prémix', target: 0.5, found: null as any },
    { type: 'sel', target: 0.3, found: null as any },
    { type: 'phosphate', target: 1.0, found: null as any },
    { type: 'methionine', target: 0.1, found: null as any },
    { type: 'lysine', target: 0.1, found: null as any }
  ];

  let fixedPercentageTotal = 0;
  let rationComposition: any[] = [];

  // Remplir les ingrédients fixes avec ce qu'on trouve en stock
  fixedIngredients.forEach(req => {
    const match = mineralsAndAdditives.find(i => i.name.toLowerCase().includes(req.type));
    if (match) {
      rationComposition.push({
        ...match,
        percentage: req.target,
        fixed: true
      });
      fixedPercentageTotal += req.target;
    }
  });

  // Ajouter un peu de son (filler) pour les fibres si dispo
  const bran = fillers[0];
  if (bran) {
    const branTarget = 5; // 5% de son par défaut
    rationComposition.push({
      ...bran,
      percentage: branTarget,
      fixed: true
    });
    fixedPercentageTotal += branTarget;
  }

  // 3. Calculer l'espace restant pour Énergie + Protéine
  const remainingSpace = 100 - fixedPercentageTotal;

  // Si on n'a pas de sources principales, on retourne ce qu'on a (échec partiel)
  if (energySources.length === 0 || proteinSources.length === 0) {
    console.warn('⚠️ Manque de sources d\'énergie ou de protéines pour le calcul');
    return availableIngredients.map(i => ({ ...i, percentage: 0, quantityKg: 0 }));
  }

  // --- SIMPLIFICATION : On prend la meilleure source d'énergie et la meilleure source de protéine ---
  // Pour un algorithme plus complexe, on pourrait mélanger plusieurs sources.
  // Pour l'instant, on prend le Maïs (ou équivalent) et le Soja/Concentré principal.

  const mainEnergy = energySources[0]; // ex: Maïs
  const mainProtein = proteinSources[0]; // ex: Tourteau de Soja ou Concentré

  // Calcul du taux de protéine cible ajusté pour l'espace restant
  // Ex: Si on veut 18% au total, et que les fixes apportent ~0%, il faut que les 90% restants apportent les 18% globaux.
  // Donc la cible dans le mélange (Maïs+Soja) doit être : (18 - proteinFromFixed) * 100 / remainingSpace

  let proteinFromFixed = 0;
  rationComposition.forEach(item => {
    proteinFromFixed += (item.protein_percent * item.percentage) / 100;
  });

  const requiredProteinInMix = ((targetProtein - proteinFromFixed) * 100) / remainingSpace;

  // --- CARRÉ DE PEARSON ---
  // Part A (Energy Source) : Protein % = mainEnergy.protein_percent
  // Part B (Protein Source) : Protein % = mainProtein.protein_percent
  // Target = requiredProteinInMix

  const valA = mainEnergy.protein_percent || 9;
  const valB = mainProtein.protein_percent || 44;
  const target = requiredProteinInMix;

  let ratioA = 0;
  let ratioB = 0;

  if (target <= valA) {
    // Impossible mathématiquement, on ne met que du A
    ratioA = 1;
    ratioB = 0;
  } else if (target >= valB) {
    // Impossible mathématiquement, on ne met que du B
    ratioA = 0;
    ratioB = 1;
  } else {
    // Calcul Pearson
    const diffA = Math.abs(target - valB); // Parts de A
    const diffB = Math.abs(target - valA); // Parts de B
    const totalParts = diffA + diffB;

    ratioA = diffA / totalParts;
    ratioB = diffB / totalParts;
  }

  // Appliquer les ratios à l'espace restant
  const percentageA = ratioA * remainingSpace;
  const percentageB = ratioB * remainingSpace;

  rationComposition.push({
    ...mainEnergy,
    percentage: parseFloat(percentageA.toFixed(2)),
    fixed: false
  });

  rationComposition.push({
    ...mainProtein,
    percentage: parseFloat(percentageB.toFixed(2)),
    fixed: false
  });

  // 4. Compléter la liste avec les ingrédients non utilisés (à 0%) pour l'affichage complet
  const usedIds = new Set(rationComposition.map(i => i.id));

  availableIngredients.forEach(item => {
    if (!usedIds.has(item.id)) {
      rationComposition.push({
        ...item,
        percentage: 0,
        quantityKg: 0,
        fixed: false
      });
    }
  });

  // Trier pour avoir les ingrédients utilisés en premier
  rationComposition.sort((a, b) => b.percentage - a.percentage);

  // Vérification finale du total (devrait être proche de 100%)
  const totalCheck = rationComposition.reduce((sum, item) => sum + item.percentage, 0);
  console.log(`✅ Ration calculée (Total: ${totalCheck.toFixed(2)}%)`);

  // Retourner avec les pourcentages calculés
  return rationComposition.map(item => ({
    ...item,
    quantityKg: 0 // Sera calculé dans la fonction appelante
  }));
};
