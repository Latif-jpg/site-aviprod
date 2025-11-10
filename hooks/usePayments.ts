import { useState, useEffect, useCallback } from 'react';
import { ensureSupabaseInitialized } from '../app/integrations/supabase/client';

export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  transaction_id?: string;
  invoice_token?: string;
  payment_type: string;
  reference_type: string;
  reference_id?: string;
  description?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  provider: string;
  is_active: boolean;
  config?: any;
}

export interface PaymentResult {
  success: boolean;
  payment_id?: string;
  invoice_token?: string;
  payment_url?: string;
  error?: string;
}

export const usePayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load user's payment history
  const loadPayments = useCallback(async () => {
    try {
      setIsLoading(true);
      const supabase = await ensureSupabaseInitialized();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      console.error('Error loading payments:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load available payment methods
  const loadPaymentMethods = useCallback(async () => {
    try {
      const supabase = await ensureSupabaseInitialized();
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error: any) {
      console.error('Error loading payment methods:', error);
    }
  }, []);

  // Create a payment
  const createPayment = useCallback(async (
    amount: number,
    paymentMethod: string,
    paymentType: string,
    referenceType: string,
    referenceId: string,
    description: string
  ): Promise<PaymentResult> => {
    try {
      setIsProcessing(true);
      const supabase = await ensureSupabaseInitialized();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: 'Utilisateur non connecté' };
      }

      // Call the create-payment edge function
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          amount,
          paymentMethod,
          paymentType,
          referenceType,
          referenceId,
          description,
          userId: user.id
        }
      });

      if (error) {
        console.error('Payment creation error:', error);
        return { success: false, error: 'Erreur lors de la création du paiement' };
      }

      if (!data.success) {
        return { success: false, error: data.error || 'Erreur inconnue' };
      }

      // Reload payments to get the updated list
      await loadPayments();

      return {
        success: true,
        payment_id: data.payment_id,
        invoice_token: data.invoice_token,
        payment_url: data.payment_url
      };

    } catch (error: any) {
      console.error('Payment creation error:', error);
      return { success: false, error: error.message || 'Erreur lors du paiement' };
    } finally {
      setIsProcessing(false);
    }
  }, [loadPayments]);

  // Process subscription payment
  const processSubscriptionPayment = useCallback(async (
    planId: string,
    paymentMethod: string
  ): Promise<PaymentResult> => {
    try {
      const supabase = await ensureSupabaseInitialized();

      // Get plan details
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError || !plan) {
        return { success: false, error: 'Plan d\'abonnement non trouvé' };
      }

      const description = `Abonnement ${plan.display_name} - ${plan.price_monthly} CFA/mois`;

      return await createPayment(
        plan.price_monthly,
        paymentMethod,
        'subscription',
        'subscription_plan',
        planId,
        description
      );

    } catch (error: any) {
      console.error('Subscription payment error:', error);
      return { success: false, error: error.message || 'Erreur lors du paiement de l\'abonnement' };
    }
  }, [createPayment]);

  // Get payment status
  const getPaymentStatus = useCallback(async (paymentId: string): Promise<Payment | null> => {
    try {
      const supabase = await ensureSupabaseInitialized();
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error getting payment status:', error);
      return null;
    }
  }, []);

  // Cancel payment (if still pending)
  const cancelPayment = useCallback(async (paymentId: string): Promise<boolean> => {
    try {
      const supabase = await ensureSupabaseInitialized();
      const { error } = await supabase
        .from('payments')
        .update({ status: 'cancelled' })
        .eq('id', paymentId)
        .eq('status', 'pending');

      if (error) throw error;

      // Reload payments
      await loadPayments();
      return true;
    } catch (error: any) {
      console.error('Error cancelling payment:', error);
      return false;
    }
  }, [loadPayments]);

  // Initialize
  useEffect(() => {
    loadPaymentMethods();
    loadPayments();
  }, [loadPaymentMethods, loadPayments]);

  return {
    payments,
    paymentMethods,
    isLoading,
    isProcessing,
    loadPayments,
    loadPaymentMethods,
    createPayment,
    processSubscriptionPayment,
    getPaymentStatus,
    cancelPayment
  };
};