
-- ============================================
-- GESTION DES ADMINISTRATEURS - AviprodApp
-- ============================================

-- 1. CRÉER UN ADMINISTRATEUR
-- Remplacez 'admin@example.com' par l'email de l'utilisateur

-- Méthode 1 : Par email
UPDATE profiles 
SET role = 'admin' 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'admin@example.com'
);

-- Méthode 2 : Par user_id (si vous connaissez l'ID)
UPDATE profiles 
SET role = 'admin' 
WHERE user_id = 'uuid-de-l-utilisateur';

-- ============================================

-- 2. RETIRER LES DROITS D'ADMINISTRATEUR
UPDATE profiles 
SET role = 'user' 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'ancien-admin@example.com'
);

-- ============================================

-- 3. LISTER TOUS LES ADMINISTRATEURS
SELECT 
  p.user_id,
  p.full_name,
  u.email,
  p.role,
  p.created_at
FROM profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE p.role = 'admin'
ORDER BY p.created_at DESC;

-- ============================================

-- 4. STATISTIQUES DES VÉRIFICATIONS KYC

-- Nombre total de vérifications par statut
SELECT 
  verification_status,
  COUNT(*) as total,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM seller_verifications
GROUP BY verification_status
ORDER BY total DESC;

-- Vérifications en attente
SELECT 
  sv.id,
  p.full_name,
  u.email,
  sv.submitted_at,
  EXTRACT(EPOCH FROM (NOW() - sv.submitted_at))/3600 as hours_waiting
FROM seller_verifications sv
JOIN profiles p ON sv.user_id = p.user_id
JOIN auth.users u ON sv.user_id = u.id
WHERE sv.verification_status = 'pending'
ORDER BY sv.submitted_at ASC;

-- Vérifications traitées aujourd'hui
SELECT 
  sv.verification_status,
  COUNT(*) as count,
  p.full_name as reviewed_by
FROM seller_verifications sv
LEFT JOIN profiles p ON sv.reviewed_by = p.user_id
WHERE DATE(sv.reviewed_at) = CURRENT_DATE
GROUP BY sv.verification_status, p.full_name;

-- ============================================

-- 5. PERFORMANCE DES ADMINISTRATEURS

-- Nombre de vérifications traitées par admin
SELECT 
  p.full_name as admin_name,
  u.email as admin_email,
  COUNT(*) as total_processed,
  SUM(CASE WHEN sv.verification_status = 'approved' THEN 1 ELSE 0 END) as approved,
  SUM(CASE WHEN sv.verification_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
  ROUND(AVG(EXTRACT(EPOCH FROM (sv.reviewed_at - sv.submitted_at))/3600), 2) as avg_processing_hours
FROM seller_verifications sv
JOIN profiles p ON sv.reviewed_by = p.user_id
JOIN auth.users u ON sv.reviewed_by = u.id
WHERE sv.reviewed_at IS NOT NULL
GROUP BY p.full_name, u.email
ORDER BY total_processed DESC;

-- ============================================

-- 6. VÉRIFICATIONS REJETÉES AVEC RAISONS

SELECT 
  p.full_name as seller_name,
  u.email as seller_email,
  sv.rejection_reason,
  sv.reviewed_at,
  admin_p.full_name as reviewed_by
FROM seller_verifications sv
JOIN profiles p ON sv.user_id = p.user_id
JOIN auth.users u ON sv.user_id = u.id
LEFT JOIN profiles admin_p ON sv.reviewed_by = admin_p.user_id
WHERE sv.verification_status = 'rejected'
ORDER BY sv.reviewed_at DESC
LIMIT 20;

-- ============================================

-- 7. TEMPS MOYEN DE TRAITEMENT

-- Par jour de la semaine
SELECT 
  TO_CHAR(reviewed_at, 'Day') as day_of_week,
  COUNT(*) as verifications_processed,
  ROUND(AVG(EXTRACT(EPOCH FROM (reviewed_at - submitted_at))/3600), 2) as avg_hours
FROM seller_verifications
WHERE reviewed_at IS NOT NULL
GROUP BY TO_CHAR(reviewed_at, 'Day'), EXTRACT(DOW FROM reviewed_at)
ORDER BY EXTRACT(DOW FROM reviewed_at);

-- Par heure de la journée
SELECT 
  EXTRACT(HOUR FROM reviewed_at) as hour,
  COUNT(*) as verifications_processed,
  ROUND(AVG(EXTRACT(EPOCH FROM (reviewed_at - submitted_at))/3600), 2) as avg_hours
FROM seller_verifications
WHERE reviewed_at IS NOT NULL
GROUP BY EXTRACT(HOUR FROM reviewed_at)
ORDER BY hour;

-- ============================================

-- 8. VENDEURS VÉRIFIÉS ACTIFS

SELECT 
  p.full_name,
  u.email,
  p.seller_verified,
  sv.verification_status,
  sv.reviewed_at,
  COUNT(mp.id) as products_count
FROM profiles p
JOIN auth.users u ON p.user_id = u.id
LEFT JOIN seller_verifications sv ON p.user_id = sv.user_id
LEFT JOIN marketplace_products mp ON p.user_id = mp.seller_id
WHERE p.seller_verified = true
GROUP BY p.full_name, u.email, p.seller_verified, sv.verification_status, sv.reviewed_at
ORDER BY products_count DESC;

-- ============================================

-- 9. RÉINITIALISER UNE VÉRIFICATION (EN CAS D'ERREUR)

-- Remettre une vérification en attente
UPDATE seller_verifications
SET 
  verification_status = 'pending',
  reviewed_at = NULL,
  reviewed_by = NULL,
  rejection_reason = NULL
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'utilisateur@example.com'
);

-- ============================================

-- 10. SUPPRIMER UNE VÉRIFICATION (ATTENTION!)

-- Supprimer une vérification spécifique
DELETE FROM seller_verifications
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'utilisateur@example.com'
);

-- ============================================

-- 11. RAPPORT MENSUEL

SELECT 
  DATE_TRUNC('month', submitted_at) as month,
  COUNT(*) as total_submissions,
  SUM(CASE WHEN verification_status = 'approved' THEN 1 ELSE 0 END) as approved,
  SUM(CASE WHEN verification_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
  SUM(CASE WHEN verification_status = 'pending' THEN 1 ELSE 0 END) as pending,
  ROUND(AVG(EXTRACT(EPOCH FROM (reviewed_at - submitted_at))/3600), 2) as avg_processing_hours
FROM seller_verifications
WHERE submitted_at >= DATE_TRUNC('year', CURRENT_DATE)
GROUP BY DATE_TRUNC('month', submitted_at)
ORDER BY month DESC;

-- ============================================

-- 12. ALERTES - VÉRIFICATIONS EN ATTENTE DEPUIS PLUS DE 24H

SELECT 
  p.full_name,
  u.email,
  sv.submitted_at,
  ROUND(EXTRACT(EPOCH FROM (NOW() - sv.submitted_at))/3600, 1) as hours_waiting
FROM seller_verifications sv
JOIN profiles p ON sv.user_id = p.user_id
JOIN auth.users u ON sv.user_id = u.id
WHERE sv.verification_status = 'pending'
  AND sv.submitted_at < NOW() - INTERVAL '24 hours'
ORDER BY sv.submitted_at ASC;

-- ============================================

-- 13. VÉRIFIER L'INTÉGRITÉ DES DONNÉES

-- Profils avec seller_verified = true mais pas de vérification approuvée
SELECT 
  p.user_id,
  p.full_name,
  u.email,
  p.seller_verified,
  sv.verification_status
FROM profiles p
JOIN auth.users u ON p.user_id = u.id
LEFT JOIN seller_verifications sv ON p.user_id = sv.user_id
WHERE p.seller_verified = true
  AND (sv.verification_status IS NULL OR sv.verification_status != 'approved');

-- Profils avec vérification approuvée mais seller_verified = false
SELECT 
  p.user_id,
  p.full_name,
  u.email,
  p.seller_verified,
  sv.verification_status
FROM profiles p
JOIN auth.users u ON p.user_id = u.id
JOIN seller_verifications sv ON p.user_id = sv.user_id
WHERE sv.verification_status = 'approved'
  AND p.seller_verified = false;

-- ============================================

-- 14. CORRIGER LES INCOHÉRENCES

-- Synchroniser seller_verified avec verification_status
UPDATE profiles p
SET seller_verified = true
FROM seller_verifications sv
WHERE p.user_id = sv.user_id
  AND sv.verification_status = 'approved'
  AND p.seller_verified = false;

UPDATE profiles p
SET seller_verified = false
FROM seller_verifications sv
WHERE p.user_id = sv.user_id
  AND sv.verification_status IN ('rejected', 'pending')
  AND p.seller_verified = true;

-- ============================================

-- 15. BACKUP DES VÉRIFICATIONS (AVANT MODIFICATIONS IMPORTANTES)

-- Créer une table de backup
CREATE TABLE seller_verifications_backup AS
SELECT * FROM seller_verifications;

-- Restaurer depuis le backup
-- ATTENTION: Cela écrasera toutes les données actuelles!
-- TRUNCATE seller_verifications;
-- INSERT INTO seller_verifications SELECT * FROM seller_verifications_backup;
