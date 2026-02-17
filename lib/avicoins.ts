import { supabase } from '../config';

interface ConsumeAvicoinsParams {
  task_type: string;
  cost: number;
  metadata?: Record<string, any>;
}

interface ConsumeAvicoinsResult {
  success: boolean;
  balance: number | null;
  message?: string;
}

/**
 * Appelle la fonction Edge Supabase pour déduire des avicoins pour une tâche spécifique.
 * @param {ConsumeAvicoinsParams} params - Les paramètres pour la consommation d'avicoins.
 * @returns {Promise<ConsumeAvicoinsResult>} - Le résultat de l'opération.
 * @throws {Error} Si la session utilisateur n'est pas trouvée ou si l'API retourne une erreur inattendue.
 */
export const consumeAvicoins = async ({
  task_type,
  cost,
  metadata = {},
}: ConsumeAvicoinsParams): Promise<ConsumeAvicoinsResult> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Session utilisateur non trouvée. L'utilisateur doit être connecté.");
  }

  const { data, error } = await supabase.functions.invoke('consume-avicoins', {
    body: { task_type, cost, metadata },
  });

  if (error) {
    // Si l'erreur est une erreur de fonction, elle peut contenir un message spécifique
    // comme "Insufficient balance".
    const errorMessage = error.context?.errorMessage || error.message;
    if (errorMessage.includes('Insufficient balance')) {
      return { success: false, balance: null, message: 'Solde en avicoins insuffisant.' };
    }
    throw new Error(`Erreur lors de l'appel à la fonction consume-avicoins: ${errorMessage}`);
  }

  // La fonction Edge devrait retourner { success: true, balance: ... }
  if (data.success) {
    return { success: true, balance: data.balance };
  } else {
    // Gérer le cas où la fonction s'exécute mais retourne un échec (ex: solde insuffisant géré côté RPC)
    return { success: false, balance: null, message: data.message || 'Une erreur est survenue.' };
  }
};
