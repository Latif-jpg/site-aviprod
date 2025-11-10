// Importez les dépendances nécessaires
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // 1. Authentifier l'utilisateur
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentification requise: token manquant' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token invalide ou expiré' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // 2. Valider les paramètres
    const { deliveryId } = await req.json();
    if (!deliveryId) {
      return new Response(JSON.stringify({ error: "L'ID de la livraison (deliveryId) est manquant" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 3. Récupérer la livraison
    const { data: delivery, error: deliveryError } = await supabaseAdmin
      .from('deliveries')
      .select('id, status, driver_id, pickup_city')
      .eq('id', deliveryId)
      .single();

    if (deliveryError) {
      if (deliveryError.code === 'PGRST116') {
        return new Response(JSON.stringify({ error: `Livraison avec l'ID ${deliveryId} non trouvée.` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        });
      }
      throw deliveryError;
    }

    // 4. Vérifier la disponibilité de la livraison
    if (delivery.status !== 'pending' || delivery.driver_id !== null) {
      return new Response(JSON.stringify({ error: "Cette livraison n'est plus disponible" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 409,
      });
    }

    // 5. Récupérer le profil du chauffeur depuis la table des chauffeurs actifs
    const { data: driverProfile, error: driverError } = await supabaseAdmin
      .from('delivery_drivers') // <--- TABLE CORRECTE
      .select('id, is_online, city')
      .eq('user_id', user.id)
      .single();

    // Gérer l'erreur où le profil de chauffeur actif n'est pas trouvé
    if (driverError) {
      if (driverError.code === 'PGRST116') {
        return new Response(JSON.stringify({ error: 'Profil de chauffeur actif non trouvé pour cet utilisateur. Contactez un administrateur.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        });
      }
      throw driverError;
    }

    // 6. Vérifier les conditions (statut en ligne et ville)
    if (!driverProfile.is_online) {
      return new Response(JSON.stringify({ error: 'Vous devez être "En ligne" pour accepter une livraison' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const normalizeString = (str) => str?.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '') ?? '';
    const driverCity = normalizeString(driverProfile.city);
    const deliveryCity = normalizeString(delivery.pickup_city);

    if (driverCity !== deliveryCity) {
      return new Response(JSON.stringify({ error: `Vous n'êtes pas dans la bonne ville pour cette livraison (${delivery.pickup_city})` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // 7. Mettre à jour la livraison
    const { data: updatedDelivery, error: updateError } = await supabaseAdmin
      .from('deliveries')
      .update({
        status: 'assigned',
        driver_id: driverProfile.id, // Utiliser l'ID de la table delivery_drivers
        estimated_delivery_time: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      })
      .eq('id', deliveryId)
      .select()
      .single();

    if (updateError) throw updateError;

    return new Response(JSON.stringify(updatedDelivery), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Erreur dans la fonction claim-delivery:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});