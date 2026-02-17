import { createHash } from "https://deno.land/std@0.177.0/node/crypto.ts";

// Helper function to parse form-urlencoded data with nested objects
function unflatten(obj: { [key: string]: any }): { [key: string]: any } {
  const result: { [key: string]: any } = {};
  for (const path in obj) {
    const value = obj[path];
    // Split keys like 'data[invoice][token]' into an array ['data', 'invoice', 'token']
    const keys = path.split(/[\[\]]/).filter(Boolean);
    if (keys.length === 0) continue;

    let current = result;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      const nextKeyIsNumber = /^\d+$/.test(keys[i + 1]);
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = nextKeyIsNumber ? [] : {};
      }
      current = current[key];
    }
    current[keys[keys.length - 1]] = value;
  }
  return result;
}

Deno.serve(async (req) => {
  console.log('====== WEBHOOK PAYDUNYA ======');
  console.log('✅ VERSION: 1.3.0 (Forced Redeploy)'); // Log de version pour forcer le déploiement
  console.log('Timestamp:', new Date().toISOString());
  console.log('Method:', req.method);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    const flatBody = Object.fromEntries(params.entries());

    // The unflattened object will have a single 'data' key.
    const webhookData = unflatten(flatBody).data;

    if (!webhookData) {
      console.error('❌ Failed to parse webhook data or "data" key is missing.');
      return new Response(JSON.stringify({ error: 'Invalid payload structure' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('✅ Payload parsé:', JSON.stringify(webhookData, null, 2));

    const PAYDUNYA_MASTER_KEY = Deno.env.get('PAYDUNYA_MASTER_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!PAYDUNYA_MASTER_KEY || !supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Configuration manquante');
      return new Response(JSON.stringify({ error: 'Configuration error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (webhookData.hash) {
      const expectedHash = createHash('sha512').update(PAYDUNYA_MASTER_KEY).digest('hex');
      if (webhookData.hash !== expectedHash) {
        console.error('❌ Hash invalide');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      console.log('✅ Hash vérifié');
    }

    const { status, invoice, custom_data } = webhookData;
    const invoice_token = invoice?.token;

    if (!status || !invoice_token || !custom_data?.payment_id) {
      console.error('❌ Données invalides: status, invoice.token, or custom_data.payment_id manquant.');
      return new Response(JSON.stringify({ error: 'Invalid payload: Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { payment_id } = custom_data;
    console.log('🔍 Recherche du paiement avec ID:', payment_id);

    const paymentsRes = await fetch(
      `${supabaseUrl}/rest/v1/payments?id=eq.${payment_id}&select=*`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
        },
      }
    );

    if (!paymentsRes.ok) {
      console.error('❌ Erreur DB:', await paymentsRes.text());
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payments = await paymentsRes.json();
    if (payments.length === 0) {
      console.error('❌ Paiement introuvable:', payment_id);
      return new Response(
        JSON.stringify({ error: 'Payment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payment = payments[0];
    console.log('✅ Paiement trouvé:', payment.id);

    let newStatus = 'pending';
    if (status === 'completed' || status === 'paid') newStatus = 'completed';
    else if (status === 'cancelled' || status === 'expired') newStatus = 'cancelled';
    else if (status === 'failed') newStatus = 'failed';

    if (payment.status === newStatus) {
      console.log(`⚠️ Statut déjà sur '${newStatus}'. Pas de mise à jour nécessaire.`);
      return new Response(JSON.stringify({ success: true, message: 'Status already up to date.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`💾 Mise à jour du statut de '${payment.status}' vers '${newStatus}'`);
    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/payments?id=eq.${payment.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}`, 'apikey': supabaseServiceKey },
        body: JSON.stringify({
          status: newStatus,
          invoice_token: invoice_token,
          updated_at: new Date().toISOString(),
          metadata: { ...payment.metadata, webhook_received_at: new Date().toISOString(), paydunya_status: status, paydunya_response: webhookData },
        }),
      }
    );

    if (!updateRes.ok) {
      console.error('❌ Échec mise à jour paiement:', await updateRes.text());
      return new Response(JSON.stringify({ error: 'Payment update failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('✅ Paiement mis à jour');

    if (newStatus === 'completed') {
      // Vérifier d'abord si c'est un achat d'Avicoins en regardant le plan
      const planRes = await fetch(`${supabaseUrl}/rest/v1/subscription_plans?id=eq.${payment.reference_id}&select=*`, { headers: { 'Authorization': `Bearer ${supabaseServiceKey}`, 'apikey': supabaseServiceKey } });

      if (planRes.ok) {
        const plans = await planRes.json();
        if (plans.length > 0) {
          const plan = plans[0];

          // Vérifier si c'est un plan Avicoins (qui a avicoins_amount dans features)
          if (plan.features && plan.features.avicoins_amount) {
            console.log("🪙 Traitement de l'achat d'Avicoins...");
            const avicoinsAmount = plan.features.avicoins_amount;
            console.log(`✅ Plan Avicoins trouvé. Crédit de ${avicoinsAmount} Avicoins.`);

            // Créditer les Avicoins à l'utilisateur
            console.log(`🪙 Créditant ${avicoinsAmount} Avicoins à l'utilisateur ${payment.user_id}`);
            const avicoinsRes = await fetch(`${supabaseUrl}/rest/v1/avicoins_transactions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}`, 'apikey': supabaseServiceKey, 'Prefer': 'return=minimal' },
              body: JSON.stringify({
                user_id: payment.user_id,
                amount: avicoinsAmount,
                transaction_type: 'purchase',
                description: `Achat de ${avicoinsAmount} Avicoins`
              }),
            });

            if (!avicoinsRes.ok) {
              const errorText = await avicoinsRes.text();
              console.error('❌ Erreur lors du crédit Avicoins:', errorText);
            } else {
              console.log('✅ Avicoins crédités avec succès');
            }
          } else {
            // C'est un abonnement normal
            console.log("📦 Traitement de l'abonnement...");
            const durationDays = 30; // Logique mensuelle par défaut
            const now = new Date();
            const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
            console.log(`✅ Plan d'abonnement trouvé. Activation pour ${durationDays} jours (mensuel).`);

            // Créer ou mettre à jour l'abonnement
            // 1. Vérifier si un abonnement existe déjà pour cet utilisateur
            const existingSubRes = await fetch(`${supabaseUrl}/rest/v1/user_subscriptions?user_id=eq.${payment.user_id}&select=id`, {
              headers: { 'Authorization': `Bearer ${supabaseServiceKey}`, 'apikey': supabaseServiceKey },
            });

            if (!existingSubRes.ok) {
              console.error('❌ Erreur lors de la vérification de l\'abonnement existant:', await existingSubRes.text());
              // Ne pas bloquer le processus, mais logger l'erreur. On tentera une création.
            }

            const existingSubs = await existingSubRes.json();
            const existingSubId = existingSubs.length > 0 ? existingSubs[0].id : null;

            let subRes;
            // 2. Préparer le corps de la requête pour l'abonnement
            const subscriptionBody = {
              user_id: payment.user_id,
              plan_id: plan.id, // Correction: Utiliser l'ID du plan récupéré
              status: 'active',
              payment_id: payment.id,
              subscription_type: 'paid', // Type d'abonnement payant
              current_period_start: now.toISOString(),
              current_period_end: endDate.toISOString(),
              expires_at: endDate.toISOString(),
              last_payment_date: now.toISOString(),
              next_payment_date: endDate.toISOString(),
              auto_renew: false, // Désactivé par défaut pour les paiements manuels
              features: plan.features
            };

            if (existingSubId) {
              // 3a. Si un abonnement existe, le mettre à jour (PATCH)
              console.log(`🔄 Mise à jour de l'abonnement existant pour l'utilisateur ${payment.user_id}`);
              subRes = await fetch(`${supabaseUrl}/rest/v1/user_subscriptions?id=eq.${existingSubId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}`, 'apikey': supabaseServiceKey, 'Prefer': 'return=minimal' },
                body: JSON.stringify(subscriptionBody),
              });
            } else {
              // 3b. Sinon, créer un nouvel abonnement (POST)
              console.log(`➕ Création d'un nouvel abonnement pour l'utilisateur ${payment.user_id}`);
              subRes = await fetch(`${supabaseUrl}/rest/v1/user_subscriptions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}`, 'apikey': supabaseServiceKey, 'Prefer': 'return=minimal' },
                body: JSON.stringify(subscriptionBody),
              });
            }

            // 4. Gérer le résultat de l'opération
            if (!subRes.ok) {
              const errorText = await subRes.text();
              console.error("❌ CRITICAL: Échec de l'activation de l'abonnement:", errorText);
              // Throw an error to stop further processing if subscription activation fails
              throw new Error(`Failed to activate subscription: ${errorText}`);
            } else {
              console.log('✅ Abonnement activé/mis à jour');
            }
          }
        } else {
          console.error(`❌ Plan avec ID ${payment.reference_id} introuvable.`);
        }
      } else {
        console.error('❌ Erreur récupération du plan:', await planRes.text());
      }
    }

    if (newStatus === 'completed' || newStatus === 'failed') {
      console.log("📧 Envoi de la notification...");
      await fetch(`${supabaseUrl}/rest/v1/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}`, 'apikey': supabaseServiceKey, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          user_id: payment.user_id,
          type: newStatus === 'completed' ? 'payment_success' : 'payment_failed',
          title: newStatus === 'completed' ? 'Paiement réussi' : 'Échec du paiement',
          message: newStatus === 'completed' ? `Votre paiement de ${payment.amount} CFA a été traité avec succès.` : `Votre paiement de ${payment.amount} CFA n'a pas pu être traité.`,
          data: { payment_id: payment.id, amount: payment.amount, payment_type: payment.payment_type },
        }),
      });
      console.log('✅ Notification envoyée.');
    }

    return new Response(JSON.stringify({ success: true, status: newStatus, payment_id: payment.id }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('❌ ERREUR GLOBALE:', error.message, error.stack);
    return new Response(JSON.stringify({ error: 'Internal server error', message: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});