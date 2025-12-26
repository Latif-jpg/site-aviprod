// supabase/functions/send-push-notification/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Log pour confirmer que la fonction a démarré
console.log("🚀 Fonction send-push-notification démarrée");

// --- CORRECTION : Initialiser le client Supabase une seule fois ---
// Cela évite la latence de l'importation dynamique à chaque requête.
const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? '',
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ''
);

// --- CORRECTION : En-têtes CORS pour autoriser les requêtes depuis votre application ---
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};


// Fonction pour envoyer une notification via Expo
async function sendNotification(pushToken: string, title: string, message: string, data: any) {
    const body = {
        to: pushToken,
        title: title,
        body: message,
        data: data,
        sound: 'default',
        priority: 'high',
    };

    console.log("✉️ Envoi de la notification avec le corps :", JSON.stringify(body));

    // --- CORRECTION : Ajouter un timeout à la requête fetch ---
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // Timeout de 10 secondes

    try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal: controller.signal, // Appliquer le signal d'annulation
        });

        clearTimeout(timeoutId); // Annuler le timeout si la requête se termine

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Erreur lors de l'envoi de la notification Expo:", errorText);
            throw new Error(`Erreur Expo: ${errorText}`);
        }

        console.log("✅ Notification envoyée avec succès via Expo.");
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId); // S'assurer que le timeout est annulé même en cas d'erreur
        if (error instanceof DOMException && error.name === 'AbortError') {
            console.error("❌ L'envoi de la notification Expo a expiré (timeout de 10s).");
            throw new Error("L'envoi de la notification a expiré.");
        }
        throw error; // Relancer les autres erreurs
    }
}

const handleRequest = async (req: Request) => {
    // --- CORRECTION : Gérer les requêtes OPTIONS (pré-vérification CORS) ---
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Extraire les données du corps de la requête
        const { user_id, title, message, data } = await req.json();
        console.log(`📨 Requête reçue pour l'utilisateur: ${user_id}`);

        // --- CORRECTION : Utiliser le client Supabase déjà initialisé ---

        // Récupérer le token de notification de l'utilisateur depuis la table 'profiles'
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('push_token')
            .eq('user_id', user_id)
            .single();

        if (profileError || !profile?.push_token) {
            console.error(`❌ Token non trouvé pour l'utilisateur ${user_id}:`, profileError?.message);
            throw new Error("Token de notification non trouvé pour cet utilisateur.");
        }

        // --- CORRECTION : Exécuter l'envoi en arrière-plan sans bloquer la réponse principale ---
        const sendPromise = sendNotification(profile.push_token, title, message, data);
        // Ne pas `await` la promesse ici. Elle s'exécutera en arrière-plan.
        // Gérer les erreurs de la promesse en arrière-plan pour éviter les "unhandled promise rejections".
        sendPromise.catch(e => console.error("❌ Erreur d'envoi de notification en arrière-plan:", e));

        // Retourner une réponse de succès
        return new Response(
            JSON.stringify({ success: true, message: "La tâche de notification a été lancée." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err) {
        // En cas d'erreur, retourner une réponse d'erreur claire
        console.error("🔥 Erreur dans la fonction Edge:", err.message);
        return new Response(
            JSON.stringify({ error: `Erreur interne de la fonction: ${err.message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
};

serve(handleRequest);
