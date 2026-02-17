import { createClient } from "npm:@supabase/supabase-js@2";
import { decode } from "npm:jsonwebtoken@9.0.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing SUPABASE_URL or SERVICE_ROLE_KEY env vars');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const authHeader = req.headers.get('Authorization') || '';
        const token = authHeader.replace('Bearer ', '').trim();
        if (!token) throw new Error('Missing Authorization token');

        // Decode token to get user id (sub)
        const decoded: any = decode(token);
        const userId = decoded?.sub;
        if (!userId) throw new Error('Invalid token');

        const body = await req.json();
        const task_type = body?.task_type;
        const cost = Number(body?.cost ?? 10);
        const metadata = body?.metadata ?? {};

        if (!task_type) throw new Error('task_type is required');
        if (isNaN(cost) || cost <= 0) throw new Error('cost must be a positive number');

        // Call RPC
        const { data, error } = await supabase.rpc('pay_with_avicoins', {
            p_user_id: userId,
            p_task_type: task_type,
            p_cost: cost,
            p_task_metadata: metadata
        });

        if (error) throw error;

        const success = data === true || (Array.isArray(data) && data[0] === true);

        if (!success) {
            return new Response(JSON.stringify({ success: false, message: 'Insufficient balance' }), {
                status: 402,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Fetch new balance
        const { data: balData, error: balErr } = await supabase
            .from('user_avicoins')
            .select('balance')
            .eq('user_id', userId)
            .single();

        if (balErr) throw balErr;

        return new Response(JSON.stringify({ success: true, balance: balData?.balance ?? null }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});