-- =================================================================
-- MIGRATION FINALE: Répare TOUS les triggers Realtime sur la table 'deliveries'.
--
-- Problème: L'erreur "function realtime.send(...) does not exist" persiste car,
-- en plus des triggers automatiques de Supabase, un trigger personnalisé
-- (ex: pour notifier les changements de statut) appelle également la fonction
-- `realtime.send` avec des arguments dans le mauvais ordre.
--
-- Solution:
-- 1. Réparer la fonction personnalisée `notify_delivery_status_change` pour qu'elle
--    appelle `realtime.send` avec les arguments dans le bon ordre (payload, event, topic).
-- 2. Réinitialiser la publication Realtime de Supabase pour la table `deliveries`
--    afin de corriger également les triggers automatiques.
-- =================================================================

-- Étape 1: Supprimer l'ancien trigger qui cause des problèmes
DROP TRIGGER IF EXISTS notify_delivery_status_change_trigger ON public.deliveries;

-- Étape 2: Créer une fonction RPC pour créer les notifications avec les droits appropriés
CREATE OR REPLACE FUNCTION public.create_delivery_notifications(
  p_delivery_id UUID,
  p_order_id UUID,
  p_buyer_id UUID,
  p_seller_id UUID,
  p_status TEXT
)
RETURNS VOID AS $$
DECLARE
  buyer_notification_id UUID;
  seller_notification_id UUID;
BEGIN
  -- Créer notification pour l'acheteur
  IF p_buyer_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      data,
      read
    ) VALUES (
      p_buyer_id,
      CASE
        WHEN p_status = 'accepted' THEN 'delivery_started'
        WHEN p_status = 'picked_up' THEN 'delivery_started'
        WHEN p_status = 'in_transit' THEN 'delivery_started'
        WHEN p_status = 'delivered' THEN 'delivery_completed'
        ELSE 'delivery_started'
      END,
      CASE
        WHEN p_status = 'accepted' THEN 'Livraison acceptée'
        WHEN p_status = 'picked_up' THEN 'Colis récupéré'
        WHEN p_status = 'in_transit' THEN 'Livraison en cours'
        WHEN p_status = 'delivered' THEN 'Livraison terminée'
        ELSE 'Mise à jour livraison'
      END,
      CASE
        WHEN p_status = 'accepted' THEN 'Votre commande a été acceptée par un livreur.'
        WHEN p_status = 'picked_up' THEN 'Le livreur a récupéré votre commande.'
        WHEN p_status = 'in_transit' THEN 'Votre commande est en cours de livraison.'
        WHEN p_status = 'delivered' THEN 'Votre commande a été livrée avec succès.'
        ELSE 'Statut de votre livraison mis à jour.'
      END,
      jsonb_build_object(
        'order_id', p_order_id,
        'delivery_id', p_delivery_id,
        'action', 'view_order_tracking'
      ),
      false
    ) RETURNING id INTO buyer_notification_id;
  END IF;

  -- Créer notification pour le vendeur
  IF p_seller_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      data,
      read
    ) VALUES (
      p_seller_id,
      CASE
        WHEN p_status = 'accepted' THEN 'delivery_started'
        WHEN p_status = 'picked_up' THEN 'delivery_started'
        WHEN p_status = 'delivered' THEN 'delivery_completed'
        ELSE 'delivery_started'
      END,
      CASE
        WHEN p_status = 'accepted' THEN 'Commande prise en charge'
        WHEN p_status = 'picked_up' THEN 'Colis récupéré'
        WHEN p_status = 'delivered' THEN 'Livraison terminée'
        ELSE 'Mise à jour livraison'
      END,
      CASE
        WHEN p_status = 'accepted' THEN 'Un livreur a accepté la livraison de votre commande.'
        WHEN p_status = 'picked_up' THEN 'Le livreur a récupéré le colis.'
        WHEN p_status = 'delivered' THEN 'La livraison de votre commande est terminée.'
        ELSE 'Statut de livraison mis à jour.'
      END,
      jsonb_build_object(
        'order_id', p_order_id,
        'delivery_id', p_delivery_id,
        'action', 'view_seller_orders'
      ),
      false
    ) RETURNING id INTO seller_notification_id;
  END IF;

  -- Log des notifications créées
  RAISE NOTICE 'Notifications créées - Acheteur: %, Vendeur: %', buyer_notification_id, seller_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Étape 3: Créer une fonction simplifiée qui ne fait que les notifications realtime
CREATE OR REPLACE FUNCTION public.notify_delivery_status_change()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  topic TEXT;
  buyer_id UUID;
BEGIN
  -- Construire le payload de la notification pour realtime
  payload := jsonb_build_object(
    'type', 'DELIVERY_STATUS_UPDATE',
    'delivery_id', NEW.id,
    'order_id', NEW.order_id,
    'new_status', NEW.status
  );

  -- Récupérer le buyer_id pour les notifications realtime
  SELECT o.buyer_id INTO buyer_id
  FROM public.orders o
  WHERE o.id = NEW.order_id;

  -- Envoyer seulement la notification realtime si buyer_id existe
  IF buyer_id IS NOT NULL THEN
    topic := 'user:' || buyer_id;
    -- Appeler realtime.send avec les arguments dans le bon ordre: (payload, event, topic)
    PERFORM realtime.send(payload, 'delivery_update'::text, topic);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Étape 4: Recréer le trigger seulement pour les notifications realtime
CREATE TRIGGER notify_delivery_status_change_trigger
  AFTER UPDATE OF status ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_delivery_status_change();

-- Étape 5: Réinitialiser les triggers automatiques de Supabase (action de sécurité).
-- Correction de la syntaxe : IF EXISTS n'est pas supporté ici.
ALTER PUBLICATION supabase_realtime DROP TABLE public.deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;