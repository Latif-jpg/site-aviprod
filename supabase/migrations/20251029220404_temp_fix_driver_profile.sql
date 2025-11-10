-- Temporary script to create an active driver profile for the test user
-- by forcing the trigger to run.

-- Step 1: Set status to pending
UPDATE public.livreur_verifications
SET verification_status = 'pending'
WHERE user_id = '5918f51a-ffd2-4647-8f3d-a6427e93b6eb';

-- Step 2: Set status back to approved, which will fire the trigger
UPDATE public.livreur_verifications
SET verification_status = 'approved'
WHERE user_id = '5918f51a-ffd2-4647-8f3d-a6427e93b6eb';
