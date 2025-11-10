import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

interface PaymentRequest {
  amount: number
  paymentMethod: string
  paymentType: string
  referenceType: string
  referenceId: string
  description: string
  userId: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, paymentMethod, paymentType, referenceType, referenceId, description, userId }: PaymentRequest = await req.json()

    // Validate required fields
    if (!amount || !paymentMethod || !paymentType || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get PayDunya configuration from environment
    const PAYDUNYA_MASTER_KEY = Deno.env.get('PAYDUNYA_MASTER_KEY')
    const PAYDUNYA_PRIVATE_KEY = Deno.env.get('PAYDUNYA_PRIVATE_KEY')
    const PAYDUNYA_PUBLIC_KEY = Deno.env.get('PAYDUNYA_PUBLIC_KEY')
    const PAYDUNYA_TOKEN = Deno.env.get('PAYDUNYA_TOKEN')
    const PAYDUNYA_BASE_URL = Deno.env.get('PAYDUNYA_BASE_URL') || 'https://app.paydunya.com/sandbox-api/v1'

    if (!PAYDUNYA_MASTER_KEY || !PAYDUNYA_PRIVATE_KEY || !PAYDUNYA_PUBLIC_KEY || !PAYDUNYA_TOKEN) {
      console.error('PayDunya configuration missing - required: MASTER_KEY, PRIVATE_KEY, PUBLIC_KEY, TOKEN')
      return new Response(
        JSON.stringify({ error: 'Payment service configuration incomplete' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create payment record in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    let paymentData;
    try {
      const paymentResponse = await fetch(`${supabaseUrl}/rest/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          user_id: userId,
          amount: amount,
          payment_method: paymentMethod,
          payment_type: paymentType,
          reference_type: referenceType,
          reference_id: referenceId,
          description: description,
          status: 'pending'
        })
      })

      if (!paymentResponse.ok) {
        const errorText = await paymentResponse.text()
        console.error('Failed to create payment record:', errorText)
        return new Response(
          JSON.stringify({ error: 'Failed to create payment record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      paymentData = await paymentResponse.json()
      console.log('Payment record created:', paymentData)
    } catch (error) {
      console.error('Error creating payment record:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to create payment record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const paymentId = paymentData?.[0]?.id || paymentData?.id
    if (!paymentId) {
      console.error('No payment ID returned:', paymentData)
      return new Response(
        JSON.stringify({ error: 'Invalid payment record response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare PayDunya invoice data according to documentation
    const invoiceData = {
      invoice: {
        total_amount: amount,
        description: description
      },
      store: {
        name: "Aviprod",
        tagline: "Plateforme d'élevage intelligent",
        phone_number: "+226 25 30 40 50",
        postal_address: "Ouagadougou, Burkina Faso"
      },
      custom_data: {
        payment_id: paymentId,
        user_id: userId,
        payment_type: paymentType
      },
      actions: {
        callback_url: `${supabaseUrl}/functions/v1/payment-webhook`,
        return_url: `aviprodapp://payment/success?payment_id=${paymentId}`,
        cancel_url: `aviprodapp://payment/cancel?payment_id=${paymentId}`
      }
    }

    console.log('Final invoice data being sent to PayDunya:', JSON.stringify(invoiceData, null, 2))

    // Create invoice with PayDunya
    console.log('Calling PayDunya API with data:', JSON.stringify(invoiceData, null, 2))
    const paydunyaResponse = await fetch(`${PAYDUNYA_BASE_URL}/checkout-invoice/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PAYDUNYA-MASTER-KEY': PAYDUNYA_MASTER_KEY,
        'PAYDUNYA-PRIVATE-KEY': PAYDUNYA_PRIVATE_KEY,
        'PAYDUNYA-TOKEN': PAYDUNYA_TOKEN
      },
      body: JSON.stringify(invoiceData)
    })

    console.log('PayDunya response status:', paydunyaResponse.status)
    console.log('PayDunya response headers:', Object.fromEntries(paydunyaResponse.headers.entries()))

    let paydunyaData;
    try {
      paydunyaData = await paydunyaResponse.json()
    } catch (parseError) {
      console.error('Failed to parse PayDunya response:', parseError)
      const responseText = await paydunyaResponse.text()
      console.error('PayDunya response text:', responseText)

      // Update payment status to failed
      await fetch(`${supabaseUrl}/rest/v1/payments?id=eq.${paymentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({ status: 'failed' })
      })

      return new Response(
        JSON.stringify({ error: 'Invalid response from payment service' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!paydunyaResponse.ok) {
      console.error('PayDunya API error - Status:', paydunyaResponse.status)
      console.error('PayDunya API error - Response:', paydunyaData)

      // Update payment status to failed
      await fetch(`${supabaseUrl}/rest/v1/payments?id=eq.${paymentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({ status: 'failed' })
      })

      return new Response(
        JSON.stringify({ error: 'Failed to create payment invoice' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if response has expected structure
    if (!paydunyaData.response_code || paydunyaData.response_code !== '00') {
      console.error('PayDunya API returned error code:', paydunyaData)

      // Update payment status to failed
      await fetch(`${supabaseUrl}/rest/v1/payments?id=eq.${paymentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({ status: 'failed' })
      })

      return new Response(
        JSON.stringify({ error: 'Payment service returned error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update payment record with PayDunya data
    const invoiceToken = paydunyaData.token
    await fetch(`${supabaseUrl}/rest/v1/payments?id=eq.${paymentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        transaction_id: invoiceToken,
        invoice_token: invoiceToken
      })
    })

    // Extract payment URL from response
    const paymentUrl = paydunyaData.response_text

    console.log('Payment URL:', paymentUrl)
    console.log('Invoice Token:', invoiceToken)

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: paymentId,
        invoice_token: invoiceToken,
        payment_url: paymentUrl,
        response_text: paydunyaData.response_text
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})