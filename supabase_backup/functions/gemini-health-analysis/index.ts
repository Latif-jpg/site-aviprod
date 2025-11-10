import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Generate a cache key from images, symptoms, and description
function generateCacheKey(images, symptoms, description) {
  // Ensure all inputs are properly defined with defaults
  const safeImages = Array.isArray(images) ? images : [];
  const safeSymptoms = Array.isArray(symptoms) ? symptoms : [];
  const safeDescription = typeof description === 'string' ? description : '';

  const sortedSymptoms = [...safeSymptoms].sort().join('|');
  const imageHashes = safeImages.map((img) => {
    // Simple hash of image URI (in production, use actual image hash)
    const safeImg = img || '';
    return safeImg.substring(Math.max(0, safeImg.length - 20));
  }).sort().join('|');
  const descHash = safeDescription.substring(0, 50);

  return `${imageHashes}::${sortedSymptoms}::${descHash}`;
}

// Call OpenAI API with GPT-4 and veterinary expertise prompt
async function callOpenAIAPI(apiKey, images, symptoms, description) {
  console.log('🤖 Calling OpenAI GPT-4 API with veterinary expertise...');

  // Ensure all inputs are properly defined
  const safeImages = Array.isArray(images) ? images : [];
  const safeSymptoms = Array.isArray(symptoms) ? symptoms : [];
  const safeDescription = typeof description === 'string' ? description.trim() : '';

  const symptomsText = safeSymptoms.length > 0 ? `Symptômes observés: ${safeSymptoms.join(', ')}` : '';
  const descriptionText = safeDescription ? `Description détaillée: ${safeDescription}` : '';
  const imagesText = safeImages.length > 0 ? `${safeImages.length} photo(s) fournie(s)` : '';

  // Enhanced prompt with veterinary expertise and concise response requirement
  const prompt = `Tu es un vétérinaire expert spécialisé en aviculture avec plus de 15 ans d'expérience dans le diagnostic et le traitement des maladies aviaires. Tu as une connaissance approfondie des pathologies courantes chez les volailles (poulets, poules pondeuses, dindes, canards, etc.), des protocoles de traitement, et des mesures préventives.

Analyse les informations suivantes concernant des volailles:

${symptomsText}
${descriptionText}
${imagesText}

En tant qu'expert vétérinaire, fournis une analyse CONCISE et PRÉCISE:
1. Un diagnostic précis de la maladie probable ou du problème de santé
2. Un niveau de confiance (0-100) basé sur les informations fournies
3. Un plan de traitement COURT et PRATIQUE avec les actions essentielles

IMPORTANT: Sois CONCIS. Limite le plan de traitement à 3-5 points essentiels maximum. Évite les détails superflus.

Réponds UNIQUEMENT au format JSON suivant (sans texte supplémentaire):
{
  "diagnosis": "nom de la maladie ou problème",
  "confidence": 85,
  "treatmentPlan": "1. Action prioritaire\n2. Traitement recommandé\n3. Mesure préventive"
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 512,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ OpenAI API error:', error);
      throw new Error(error.error?.message || 'Erreur avec l\'API OpenAI');
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      console.error('❌ Empty response from OpenAI');
      throw new Error('Réponse vide de l\'API OpenAI');
    }

    // Extract JSON from response (handle markdown code blocks)
    let jsonText = text;
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const result = JSON.parse(jsonText);
    console.log('✅ OpenAI analysis complete:', result.diagnosis);
    console.log(`📊 Response length: ${result.treatmentPlan.length} characters`);

    return result;
  } catch (error) {
    console.error('❌ Error with OpenAI API:', error.message);
    throw error;
  }
}

// Call Gemini API with Gemini 2.0 Flash and veterinary expertise prompt
async function callGeminiAPI(apiKey, images, symptoms, description) {
  console.log('🤖 Calling Gemini 2.0 Flash API with veterinary expertise...');

  // Ensure all inputs are properly defined
  const safeImages = Array.isArray(images) ? images : [];
  const safeSymptoms = Array.isArray(symptoms) ? symptoms : [];
  const safeDescription = typeof description === 'string' ? description.trim() : '';

  const symptomsText = safeSymptoms.length > 0 ? `Symptômes observés: ${safeSymptoms.join(', ')}` : '';
  const descriptionText = safeDescription ? `Description détaillée: ${safeDescription}` : '';
  const imagesText = safeImages.length > 0 ? `${safeImages.length} photo(s) fournie(s)` : '';

  // Enhanced prompt with veterinary expertise and concise response requirement
  const prompt = `Tu es un vétérinaire expert spécialisé en aviculture avec plus de 15 ans d'expérience dans le diagnostic et le traitement des maladies aviaires. Tu as une connaissance approfondie des pathologies courantes chez les volailles (poulets, poules pondeuses, dindes, canards, etc.), des protocoles de traitement, et des mesures préventives.

Analyse les informations suivantes concernant des volailles:

${symptomsText}
${descriptionText}
${imagesText}

En tant qu'expert vétérinaire, fournis une analyse CONCISE et PRÉCISE:
1. Un diagnostic précis de la maladie probable ou du problème de santé
2. Un niveau de confiance (0-100) basé sur les informations fournies
3. Un plan de traitement COURT et PRATIQUE avec les actions essentielles

IMPORTANT: Sois CONCIS. Limite le plan de traitement à 3-5 points essentiels maximum. Évite les détails superflus.

Réponds UNIQUEMENT au format JSON suivant (sans texte supplémentaire):
{
  "diagnosis": "nom de la maladie ou problème",
  "confidence": 85,
  "treatmentPlan": "1. Action prioritaire\n2. Traitement recommandé\n3. Mesure préventive"
}`;

  // Try Gemini 2.0 Flash first, fallback to other models if needed
  const models = [
    'gemini-2.0-flash-exp',
    'gemini-1.5-pro',
    'gemini-1.5-flash-latest',
    'gemini-pro'
  ];

  let lastError = null;
  for (const model of models) {
    try {
      console.log(`🔄 Trying model: ${model}`);

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 512
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(`❌ Model ${model} error:`, error);
        lastError = new Error(error.error?.message || `Erreur avec le modèle ${model}`);
        continue; // Try next model
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        console.error(`❌ Empty response from ${model}`);
        lastError = new Error(`Réponse vide du modèle ${model}`);
        continue; // Try next model
      }

      // Extract JSON from response (handle markdown code blocks)
      let jsonText = text;
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      const result = JSON.parse(jsonText);
      console.log(`✅ Gemini analysis complete with ${model}:`, result.diagnosis);
      console.log(`📊 Response length: ${result.treatmentPlan.length} characters`);

      return result;
    } catch (error) {
      console.error(`❌ Error with model ${model}:`, error.message);
      lastError = error;
      continue; // Try next model
    }
  }

  // If all models failed, throw the last error
  throw new Error(`Tous les modèles Gemini ont échoué. Dernière erreur: ${lastError?.message || 'Erreur inconnue'}`);
}

// Get recommended products based on diagnosis
function getRecommendedProducts(diagnosis) {
  // Mock products - in production, query from marketplace
  const products = [
    {
      id: '1',
      name: 'Antibiotique Large Spectre',
      description: 'Efficace contre les infections respiratoires et digestives',
      price: 2500,
      category: 'medicine',
      seller: 'VetMed Solutions',
      rating: 4.8,
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop',
      inStock: true
    },
    {
      id: '2',
      name: 'Supplément Vitamine C',
      description: 'Renforce le système immunitaire des volailles',
      price: 1200,
      category: 'supplement',
      seller: 'AgriSupply Co.',
      rating: 4.5,
      image: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=200&h=200&fit=crop',
      inStock: true
    },
    {
      id: '3',
      name: 'Désinfectant Poulailler',
      description: 'Prévention et traitement des infections',
      price: 1800,
      category: 'hygiene',
      seller: 'FarmCare Pro',
      rating: 4.7,
      image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=200&h=200&fit=crop',
      inStock: true
    }
  ];

  return products;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('👤 User authenticated:', user.id);

    // Parse request body
    const body = await req.json();
    const { images = [], symptoms = [], description = '', lotId } = body;

    // Ensure all inputs are properly typed and have defaults
    const safeImages = Array.isArray(images) ? images : [];
    const safeSymptoms = Array.isArray(symptoms) ? symptoms : [];
    const safeDescription = typeof description === 'string' ? description.trim() : '';

    // Validate that at least one input is provided
    if (safeImages.length === 0 && safeSymptoms.length === 0 && !safeDescription) {
      throw new Error('Au moins une image, une description ou des symptômes sont requis');
    }

    console.log(`📊 Analysis request: ${safeImages.length} images (compressed), ${safeSymptoms.length} symptoms, description: ${safeDescription ? 'yes' : 'no'}`);

    // Generate cache key
    const cacheKey = generateCacheKey(safeImages, safeSymptoms, safeDescription);
    console.log('🔑 Cache key:', cacheKey.substring(0, 50) + '...');

    // Check cache
    const { data: cachedAnalysis, error: cacheError } = await supabase
      .from('ai_health_analyses')
      .select('*')
      .eq('cache_key', cacheKey)
      .eq('user_id', user.id)
      .maybeSingle();

    if (cachedAnalysis && !cacheError) {
      console.log('✅ Cache hit! Returning cached analysis (no API cost)');
      return new Response(JSON.stringify({
        id: cachedAnalysis.id,
        diagnosis: cachedAnalysis.diagnosis,
        confidence: cachedAnalysis.confidence,
        treatmentPlan: cachedAnalysis.treatment_plan,
        recommendedProducts: cachedAnalysis.recommended_products,
        cached: true
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    console.log('❌ Cache miss, calling AI API');

    // Get admin API key from environment variables (try Gemini first, OpenAI as fallback)
    let adminApiKey = Deno.env.get('GEMINI_API_KEY');
    let apiProvider = 'gemini';

    if (!adminApiKey) {
      adminApiKey = Deno.env.get('OPENAI_API_KEY');
      apiProvider = 'openai';
    }

    if (!adminApiKey) {
      throw new Error("Configuration IA non disponible. Aucune clé API configurée (GEMINI_API_KEY ou OPENAI_API_KEY).");
    }

    console.log(`🔑 Using ${apiProvider.toUpperCase()} API key for analysis`);

    // Call appropriate API based on provider
    let analysisResult;
    if (apiProvider === 'gemini') {
      analysisResult = await callGeminiAPI(adminApiKey, safeImages, safeSymptoms, safeDescription);
    } else {
      analysisResult = await callOpenAIAPI(adminApiKey, safeImages, safeSymptoms, safeDescription);
    }

    // Get recommended products
    const recommendedProducts = getRecommendedProducts(analysisResult.diagnosis);

    // Save to database (cache)
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('ai_health_analyses')
      .insert({
        user_id: user.id,
        lot_id: lotId,
        images: safeImages,
        symptoms: safeSymptoms,
        diagnosis: analysisResult.diagnosis,
        confidence: analysisResult.confidence,
        treatment_plan: analysisResult.treatmentPlan,
        recommended_products: recommendedProducts,
        cache_key: cacheKey
      })
      .select()
      .single();

    if (saveError) {
      console.error('⚠️ Error saving analysis:', saveError);
      // Continue anyway, don't fail the request
    } else {
      console.log('✅ Analysis saved to database');
    }

    const response = {
      id: savedAnalysis?.id || crypto.randomUUID(),
      diagnosis: analysisResult.diagnosis,
      confidence: analysisResult.confidence,
      treatmentPlan: analysisResult.treatmentPlan,
      recommendedProducts,
      cached: false
    };

    console.log('✅ Returning fresh analysis result');
    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('❌ Error in edge function:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Erreur interne du serveur'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
});
