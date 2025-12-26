// supabase/functions/check-critical-alerts/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // Gérer les requêtes préliminaires (CORS)
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!supabaseUrl || !serviceKey) throw new Error("Config manquante.");

        const supabase = createClient(supabaseUrl, serviceKey);

        // 1. Scan des données
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowISO = tomorrow.toISOString().split('T')[0];

        const [vaccinationsResult, stocksResult] = await Promise.all([
            supabase.from("vaccinations").select(`user_id, vaccine_name, due_date, lot:lots(id, name)`).eq("due_date", tomorrowISO).eq("status", "pending"),
            // On récupère les stocks pour filtrer dynamiquement selon le seuil de chaque produit (min_threshold)
            supabase.from("stock").select("user_id, name, quantity, min_threshold")
        ]);

        const upcomingVaccinations = vaccinationsResult.data || [];
        const allStocks = stocksResult.data || [];

        // Filtrage JS pour utiliser le min_threshold spécifique à chaque produit (ou 5 par défaut)
        const stockShortages = allStocks.filter((stock: any) => {
            const threshold = stock.min_threshold !== null ? stock.min_threshold : 5;
            return stock.quantity <= threshold;
        });

        // 2. Préparation des notifications
        const notificationsToInsert = [];

        for (const vacc of upcomingVaccinations) {
            const lotData = vacc.lot as any;
            notificationsToInsert.push({
                user_id: vacc.user_id,
                type: "vaccine_reminder",
                title: "💉 Rappel Vaccin",
                message: `Vaccin '${vacc.vaccine_name}' prévu demain pour le lot '${lotData?.name || 'Inconnu'}'.`,
                data: { lot_id: lotData?.id, action: 'view_vaccine_schedule' }
            });
        }

        for (const stock of stockShortages) {
            notificationsToInsert.push({
                user_id: stock.user_id,
                type: "stock_alert",
                title: "⚠️ Stock Faible",
                message: `Stock bas pour '${stock.name}' (${stock.quantity}). Pensez à réapprovisionner.`,
                data: { stock_name: stock.name, action: 'view_stock' }
            });
        }

        if (notificationsToInsert.length === 0) {
            return new Response(JSON.stringify({ success: true, message: "Rien à signaler." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // 3. Insertion en base
        const { error: insertError } = await supabase.from("notifications").insert(notificationsToInsert);
        if (insertError) throw insertError;

        // 4. Envoi Push (Expo)
        const userIds = [...new Set(notificationsToInsert.map(n => n.user_id))];
        const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, push_token')
            .in('user_id', userIds)
            .not('push_token', 'is', null);

        const tokenMap = new Map();
        profiles?.forEach(p => {
            if (p.push_token && p.push_token.startsWith('ExponentPushToken')) {
                tokenMap.set(p.user_id, p.push_token);
            }
        });

        // Regroupement des notifications par utilisateur pour éviter le spam et les délais
        const userNotificationsMap = new Map();

        notificationsToInsert.forEach(n => {
            if (!tokenMap.has(n.user_id)) return;

            if (!userNotificationsMap.has(n.user_id)) {
                userNotificationsMap.set(n.user_id, {
                    to: tokenMap.get(n.user_id),
                    vaccines: 0,
                    stocks: 0,
                    details: []
                });
            }

            const summary = userNotificationsMap.get(n.user_id);
            if (n.type === 'vaccine_reminder') summary.vaccines++;
            if (n.type === 'stock_alert') summary.stocks++;
            // On garde le message du premier élément comme détail principal si besoin
            if (summary.details.length < 2) summary.details.push(n.message);
        });

        const pushMessages = Array.from(userNotificationsMap.values()).map((summary: any) => {
            const total = summary.vaccines + summary.stocks;
            const title = `🚨 ${total} Alerte${total > 1 ? 's' : ''} Critique${total > 1 ? 's' : ''}`;
            const body = summary.details.length === 1
                ? summary.details[0]
                : `${summary.vaccines} vaccin(s) à faire, ${summary.stocks} stock(s) bas. Consultez l'app.`;

            return {
                to: summary.to,
                title: title,
                body: body,
                data: { type: 'critical_summary' },
                sound: 'default',
                badge: 1, // Ajoute un petit "1" sur l'icône de l'app
                priority: 'high', // Important pour Android
                channelId: 'critical_alerts_v4', // Doit correspondre au nouveau canal créé dans l'app
            };
        });

        let expoResult = null;
        if (pushMessages.length > 0) {
            console.log(`📨 Envoi de ${pushMessages.length} pushs...`);
            const resp = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify(pushMessages),
            });
            expoResult = await resp.json();
            console.log("✅ Expo Result:", JSON.stringify(expoResult));
        }

        return new Response(
            JSON.stringify({ success: true, alerts: notificationsToInsert.length, push_sent: pushMessages.length, expo_response: expoResult }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        console.error("❌ Error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
});
