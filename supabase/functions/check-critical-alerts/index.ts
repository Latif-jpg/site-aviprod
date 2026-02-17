// supabase/functions/check-critical-alerts/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- AJOUT : Interfaces pour la clarté du code et la robustesse ---
interface Lot {
    user_id: string;
    start_date: string;
    quantity: number;
}

interface FeedGuideEntry {
    age_in_weeks: number;
    daily_feed_g: number;
}

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

        const [vaccinationsResult, stocksResult, lotsResult, guideResult] = await Promise.all([
            supabase.from("vaccinations").select(`user_id, vaccine_name, due_date, lot:lots(id, name)`).eq("due_date", tomorrowISO).eq("status", "pending"),
            // On récupère les stocks pour filtrer dynamiquement selon le seuil de chaque produit (min_threshold)
            supabase.from("stock").select("user_id, name, quantity, min_threshold"),
            // On récupère les lots actifs pour le calcul de la consommation
            supabase.from('lots').select('user_id, start_date, quantity').eq('status', 'actif'),
            // On récupère le guide d'alimentation, trié par âge pour faciliter la recherche
            supabase.from('feed_guide').select('age_in_weeks, daily_feed_g').order('age_in_weeks', { ascending: true })
        ]);

        if (vaccinationsResult.error) throw vaccinationsResult.error;
        if (stocksResult.error) throw stocksResult.error;
        if (lotsResult.error) throw lotsResult.error;
        if (guideResult.error) throw guideResult.error;

        const upcomingVaccinations = vaccinationsResult.data || [];
        const allStocks = stocksResult.data || [];
        const activeLots: Lot[] = lotsResult.data || [];
        const feedGuide: FeedGuideEntry[] = guideResult.data || [];

        // Filtrage JS pour utiliser le min_threshold spécifique à chaque produit (ou 5 par défaut)
        const stockShortages = allStocks.filter((stock: any) => {
            const threshold = stock.min_threshold !== null ? stock.min_threshold : 5;
            return stock.quantity <= threshold;
        });

        // 2. Préparation des notifications
        const notificationsToInsert: any[] = [];

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

        // --- NOUVEAU : Calcul de la consommation journalière pour notification de rappel (8h/16h) ---
        const userConsumptions = new Map<string, { totalConsumptionGrams: number, birdCount: number }>();

        if (activeLots.length > 0 && feedGuide.length > 0) {
            const today = new Date();
            for (const lot of activeLots) {
                if (!lot.start_date || !lot.quantity) continue;

                const startDate = new Date(lot.start_date);
                if (isNaN(startDate.getTime())) continue;

                const ageInDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
                const ageInWeeks = Math.floor(ageInDays / 7);

                // Trouve l'entrée du guide correspondante.
                let guideEntry = feedGuide.find(g => g.age_in_weeks === ageInWeeks);
                if (!guideEntry) {
                    // Si pas de correspondance exacte, on prend l'entrée la plus proche (inférieure).
                    guideEntry = [...feedGuide].reverse().find(g => g.age_in_weeks < ageInWeeks);
                }
                if (!guideEntry) continue;

                const lotConsumption = lot.quantity * guideEntry.daily_feed_g;
                const currentUserConsumption = userConsumptions.get(lot.user_id) || { totalConsumptionGrams: 0, birdCount: 0 };

                userConsumptions.set(lot.user_id, {
                    totalConsumptionGrams: currentUserConsumption.totalConsumptionGrams + lotConsumption,
                    birdCount: currentUserConsumption.birdCount + lot.quantity
                });
            }
        }

        for (const [userId, consumptionData] of userConsumptions.entries()) {
            if (consumptionData.totalConsumptionGrams > 0) {
                const totalKg = consumptionData.totalConsumptionGrams / 1000;
                // On divise par 2 pour donner la ration du repas (Matin/Soir)
                const halfRation = totalKg / 2;
                notificationsToInsert.push({
                    user_id: userId,
                    type: "feeding_reminder",
                    title: "🍽️ Ration du repas",
                    message: `Préparez environ ${halfRation.toFixed(1)} kg pour vos ${consumptionData.birdCount} sujets (Total jour: ${totalKg.toFixed(1)} kg).`,
                    data: { action: 'view_feed_guide', daily_quantity: totalKg, meal_quantity: halfRation, bird_count: consumptionData.birdCount }
                });
            }
        }
        // --- FIN DE LA NOUVELLE LOGIQUE ---

        if (notificationsToInsert.length === 0) {
            return new Response(JSON.stringify({ success: true, message: "Rien à signaler." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // 3. Insertion en base
        const { error: insertError } = await supabase.from("notifications").insert(notificationsToInsert);
        if (insertError) throw insertError;

        // 4. Envoi Push (Expo)
        const userIds = [...new Set(notificationsToInsert.map(n => n.user_id))];
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, push_token')
            .in('user_id', userIds)
            .not('push_token', 'is', null);

        if (profilesError) throw profilesError;

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
            // On compte aussi les rappels d'alimentation comme une info importante
            if (n.type === 'feeding_reminder') summary.stocks++; // On incrémente le compteur générique ou on crée une catégorie
            // On garde le message du premier élément comme détail principal si besoin
            if (summary.details.length < 2) summary.details.push(n.message);
        });

        const pushMessages = Array.from(userNotificationsMap.values()).map((summary: any) => {
            const total = summary.vaccines + summary.stocks;
            // Titre adapté : si c'est juste un rappel d'alimentation, on évite "Alerte Critique"
            const isOnlyFeeding = summary.vaccines === 0 && summary.stocks > 0 && summary.details[0]?.includes('Ration');
            const finalTitle = isOnlyFeeding ? "🐔 Suivi d'élevage" : `🚨 ${total} Notification${total > 1 ? 's' : ''}`;

            const body = summary.details.length === 1
                ? summary.details[0]
                : `${summary.vaccines} vaccin(s) à faire, ${summary.stocks} stock(s) bas. Consultez l'app.`;

            return {
                to: summary.to,
                title: finalTitle,
                body: body,
                data: { type: 'critical_summary' },
                sound: 'default',
                badge: total, // Ajoute le nombre total d'alertes sur l'icône de l'app
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
