// c:\Users\tifla\Downloads\elevage\supabase\functions\claim-delivery\index.ts

// Importez les dépendances nécessaires
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("🚀 Fonction claim-delivery initialisée (version corrigée)");

Deno.serve(async (req) => {
  console.log("🔄 Nouvelle requête reçue", { method: req.method, url: req.url });

  if (req.method === 'OPTIONS') {
    console.log("✅ Réponse OPTIONS envoyée");
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Créer un client admin pour outrepasser les RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    console.log("🔑 Client admin Supabase créé");

    // 1. Authentifier l'utilisateur à partir du token de la requête
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth Error:", authError);
      return new Response(JSON.stringify({ error: 'Utilisateur non connecté ou token invalide.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    console.log(`👤 Utilisateur authentifié: ${user.id}`);

    // 2. Valider les paramètres de la requête
    const { deliveryId } = await req.json();
    if (!deliveryId) {
      console.error("Paramètre manquant: deliveryId");
      return new Response(JSON.stringify({ error: "L'ID de la livraison (deliveryId) est manquant" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    console.log(`📄 ID de livraison reçu: ${deliveryId}`);

    // 3. Récupérer la livraison
    console.log("🔍 Récupération de la livraison...");
    const { data: delivery, error: deliveryError } = await supabaseAdmin
      .from('deliveries')
      .select('id, status, driver_id')
      .eq('id', deliveryId)
      .single();

    if (deliveryError) {
      console.error(`Erreur lors de la récupération de la livraison ${deliveryId}:`, deliveryError);
      if (deliveryError.code === 'PGRST116') {
        return new Response(JSON.stringify({ error: `Livraison avec l'ID ${deliveryId} non trouvée.` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        });
      }
      throw deliveryError;
    }
    console.log("📦 Livraison trouvée:", delivery);

    // 4. Vérifier la disponibilité de la livraison
    if (delivery.status !== 'pending' || delivery.driver_id !== null) {
      console.warn("⚠️ Tentative de réclamation d'une livraison non disponible", { deliveryId, status: delivery.status, driver_id: delivery.driver_id });
      return new Response(JSON.stringify({ error: "Cette livraison n'est plus disponible" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 409, // Conflit
      });
    }
    console.log("✅ La livraison est disponible");

    // 5. Vérifier le statut du livreur dans la table de vérification
    console.log(`🕵️ Récupération du profil livreur pour l'utilisateur: ${user.id}`);
    const { data: verificationProfile, error: verificationError } = await supabaseAdmin
      .from('livreur_verifications') // Utilise la bonne table
      .select('verification_status, is_online') // On a juste besoin de vérifier le statut ici
      .eq('user_id', user.id)
      .eq('verification_status', 'approved') // S'assure que le livreur est approuvé
      .single();

    if (verificationError) {
      console.error(`Erreur lors de la récupération du statut du livreur pour ${user.id}:`, verificationError);
      if (verificationError.code === 'PGRST116') {
        return new Response(JSON.stringify({ error: 'Profil livreur non trouvé ou non approuvé.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        });
      }
      throw verificationError;
    }
    console.log("✅ Statut du livreur vérifié:", verificationProfile);

    // 6. Récupérer le VRAI profil de livreur depuis `delivery_drivers` pour obtenir l'ID correct
    const { data: driverProfile, error: driverProfileError } = await supabaseAdmin
      .from('delivery_drivers')
      .select('id') // On a juste besoin de l'ID pour la clé étrangère
      .eq('user_id', user.id)
      .single();

    if (driverProfileError) throw new Error(`Profil de livreur actif introuvable dans delivery_drivers: ${driverProfileError.message}`);
    console.log("🚚 Profil livreur actif trouvé:", driverProfile);

    // 7. Vérifier si le livreur est en ligne
    if (!verificationProfile.is_online) {
      console.warn(`Livreur hors ligne essaie de réclamer: ${user.id}`);
      return new Response(JSON.stringify({ error: 'Vous devez être "En ligne" pour accepter une livraison.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }
    console.log("👍 Le livreur est actif et en ligne");

    // 8. Mettre à jour la livraison avec l'ID correct de `delivery_drivers`
    console.log(`⏳ Mise à jour de la livraison ${deliveryId} pour le driver_id ${driverProfile.id}...`);
    const { data: updatedDelivery, error: updateError } = await supabaseAdmin
      .from('deliveries')
      .update({
        status: 'accepted',
        driver_id: driverProfile.id, // Utilise l'ID du profil livreur
        estimated_delivery_time: new Date(Date.now() + 45 * 60 * 1000).toISOString(), // Ajoute 45 min
      })
      .eq('id', deliveryId)
      .select()
      .single();

    if (updateError) {
      console.error(`❌ Erreur lors de la mise à jour de la livraison ${deliveryId}:`, updateError);
      // C'est ici que l'erreur "realtime.send" se produit si les triggers ne sont pas à jour.
      throw updateError;
    }
    console.log("🎉 Livraison mise à jour avec succès:", updatedDelivery);

    // 9. Renvoyer une réponse de succès
    return new Response(JSON.stringify(updatedDelivery), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('💥 Erreur inattendue dans la fonction claim-delivery:', error);
    return new Response(JSON.stringify({ error: 'Erreur interne du serveur.', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
