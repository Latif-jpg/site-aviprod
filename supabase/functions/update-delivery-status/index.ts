// c:\Users\tifla\Downloads\elevage\supabase\functions\update-delivery-status\index.ts

// Importez les dépendances nécessaires
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("🚀 Fonction update-delivery-status initialisée");

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
    const { deliveryId, status, estimatedDeliveryTime } = await req.json();
    if (!deliveryId || !status) {
      console.error("Paramètres manquants:", { deliveryId, status });
      return new Response(JSON.stringify({ error: "L'ID de la livraison (deliveryId) et le statut sont requis" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    console.log(`📄 Paramètres reçus:`, { deliveryId, status, estimatedDeliveryTime });

    // 3. Vérifier que l'utilisateur est bien le driver de cette livraison
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

    // 4. Récupérer le profil driver de l'utilisateur
    const { data: driverProfile, error: driverProfileError } = await supabaseAdmin
      .from('delivery_drivers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (driverProfileError) {
      console.error(`Erreur lors de la récupération du profil driver:`, driverProfileError);
      return new Response(JSON.stringify({ error: 'Profil driver non trouvé.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // 5. Vérifier que l'utilisateur est bien le driver de cette livraison
    if (delivery.driver_id !== driverProfile.id) {
      console.error(`Utilisateur ${user.id} n'est pas le driver de la livraison ${deliveryId}`);
      return new Response(JSON.stringify({ error: 'Vous n\'êtes pas autorisé à modifier cette livraison.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }
    console.log("✅ Autorisation vérifiée - utilisateur est le driver");

    // 6. Préparer les données de mise à jour
    const updateData: any = { status };

    if (status === 'in_transit' && estimatedDeliveryTime) {
      updateData.estimated_delivery_time = estimatedDeliveryTime;
    }

    if (status === 'delivered') {
      updateData.actual_delivery_time = new Date().toISOString();
      updateData.driver_confirmed = true;
      updateData.driver_confirmation_time = new Date().toISOString();
    }

    console.log("📝 Données de mise à jour:", updateData);

    // 7. Mettre à jour la livraison
    const { data: updatedDelivery, error: updateError } = await supabaseAdmin
      .from('deliveries')
      .update(updateData)
      .eq('id', deliveryId)
      .select()
      .single();

    if (updateError) {
      console.error(`❌ Erreur lors de la mise à jour de la livraison ${deliveryId}:`, updateError);
      throw updateError;
    }
    console.log("🎉 Livraison mise à jour avec succès:", updatedDelivery);

    // 8. Créer les notifications manuellement si la mise à jour a réussi
    if (updatedDelivery) {
      try {
        // Récupérer les informations de la commande
        const { data: orderData, error: orderError } = await supabaseAdmin
          .from('orders')
          .select('buyer_id, seller_id')
          .eq('id', updatedDelivery.order_id)
          .single();

        if (orderError) {
          console.error("Erreur lors de la récupération des données de commande:", orderError);
        } else if (orderData) {
          // Créer les notifications directement avec le client admin (qui peut outrepasser RLS)
          const notifications = [];

          // Notification pour l'acheteur
          if (orderData.buyer_id) {
            notifications.push({
              user_id: orderData.buyer_id,
              type: status === 'delivered' ? 'delivery_completed' : 'delivery_started',
              title: status === 'delivered' ? 'Livraison terminée' : 'Livraison en cours',
              message: status === 'delivered'
                ? 'Votre commande a été livrée avec succès.'
                : 'Le statut de votre livraison a été mis à jour.',
              data: {
                order_id: updatedDelivery.order_id,
                delivery_id: deliveryId,
                action: 'view_order_tracking'
              },
              read: false
            });
          }

          // Notification pour le vendeur
          if (orderData.seller_id) {
            notifications.push({
              user_id: orderData.seller_id,
              type: status === 'delivered' ? 'delivery_completed' : 'delivery_started',
              title: status === 'delivered' ? 'Livraison terminée' : 'Mise à jour livraison',
              message: status === 'delivered'
                ? 'La livraison de votre commande est terminée.'
                : 'Le statut de livraison de votre commande a été mis à jour.',
              data: {
                order_id: updatedDelivery.order_id,
                delivery_id: deliveryId,
                action: 'view_seller_orders'
              },
              read: false
            });
          }

          // Insérer les notifications avec le client admin
          if (notifications.length > 0) {
            const { error: notifError } = await supabaseAdmin
              .from('notifications')
              .insert(notifications);

            if (notifError) {
              console.error("Erreur lors de la création des notifications:", notifError);
              // Ne pas throw ici car la mise à jour de livraison a réussi
            } else {
              console.log(`✅ ${notifications.length} notification(s) créée(s)`);
            }
          }
        }
      } catch (notifError) {
        console.error("Erreur lors de la gestion des notifications:", notifError);
        // Ne pas throw ici car la mise à jour de livraison a réussi
      }
    }

    // 8. Renvoyer une réponse de succès
    return new Response(JSON.stringify(updatedDelivery), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('💥 Erreur inattendue dans la fonction update-delivery-status:', error);
    return new Response(JSON.stringify({ error: 'Erreur interne du serveur.', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});