
# Profile Update & Admin KYC Interface Fix

## Issues Fixed

### 1. Profile Update Failure ❌ → ✅

**Problem:**
- Users were unable to update their profile information
- The RLS (Row Level Security) policy on the `profiles` table was missing the `WITH CHECK` clause for UPDATE operations
- This caused profile updates to fail silently or with permission errors

**Solution:**
Applied a database migration that:
- Updated the RLS policy to include `WITH CHECK (user_id = auth.uid())` for UPDATE operations
- This ensures users can only update their own profiles
- Added proper error handling and logging in the profile screen

**Migration Applied:**
```sql
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
TO public
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

### 2. Admin KYC Interface Not Displaying ❌ → ✅

**Problem:**
- Admin users couldn't see the KYC verification interface
- The `admin_kyc_verifications` view was being queried directly, but RLS policies were blocking access
- The view joins multiple tables (seller_verifications, profiles, auth.users) which complicated RLS

**Solution:**
Created a security definer function that:
- Bypasses RLS for authorized admin users
- Checks if the current user has admin role before returning data
- Returns all KYC verifications with profile and email information
- Provides better error messages when access is denied

**Migration Applied:**
```sql
-- Add policy to allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

-- Create security definer function for admin KYC access
CREATE OR REPLACE FUNCTION get_admin_kyc_verifications()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  real_photo_url text,
  id_photo_url text,
  verification_status text,
  rejection_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  full_name text,
  phone text,
  location text,
  email text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Return the KYC verifications with profile data
  RETURN QUERY
  SELECT 
    sv.id,
    sv.user_id,
    sv.real_photo_url,
    sv.id_photo_url,
    sv.verification_status,
    sv.rejection_reason,
    sv.submitted_at,
    sv.reviewed_at,
    sv.reviewed_by,
    p.full_name,
    p.phone,
    p.location,
    au.email
  FROM seller_verifications sv
  LEFT JOIN profiles p ON sv.user_id = p.user_id
  LEFT JOIN auth.users au ON sv.user_id = au.id
  ORDER BY sv.submitted_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_kyc_verifications() TO authenticated;
```

### 3. Dashboard Profile Display ❌ → ✅

**Problem:**
- Dashboard was querying profiles by `id` instead of `user_id`
- User's name and farm name were not displaying correctly

**Solution:**
- Updated the dashboard query to use `user_id` instead of `id`
- Added proper error handling and logging
- Display farm name only if it exists

## Code Changes

### Files Modified:

1. **app/profile.tsx**
   - Improved error handling with detailed console logs
   - Better user feedback with French error messages
   - Proper handling of profile creation when it doesn't exist

2. **app/admin-kyc.tsx**
   - Changed from querying `admin_kyc_verifications` view to using `get_admin_kyc_verifications()` function
   - Improved access denied screen with clear instructions
   - Better error messages and logging

3. **app/dashboard.tsx**
   - Fixed profile query to use `user_id` instead of `id`
   - Added conditional display of farm name
   - Improved logging for debugging

## Testing

### Test Profile Updates:
1. Log in to the app
2. Go to Profile screen
3. Click "Modifier le Profil"
4. Update your name, phone, farm name, or location
5. Click "Enregistrer"
6. You should see "Succès: Profil mis à jour avec succès"

### Test Admin KYC Interface:
1. Make sure your user has admin role (see MAKE_ADMIN_GUIDE.md)
2. Go to Profile screen
3. You should see "Administration" section with "Validation KYC" button
4. Click "Validation KYC"
5. You should see the list of KYC verifications

### Test Dashboard Display:
1. Update your profile with name and farm name
2. Go to Dashboard
3. You should see "Bonjour [Your Name] 👨‍🌾"
4. Below that, you should see "Ferme: [Your Farm Name]" (if farm name is set)

## How to Make a User Admin

If you need to grant admin access to a user, run this SQL query in Supabase SQL Editor:

```sql
UPDATE profiles
SET role = 'admin'
WHERE user_id = (
  SELECT id FROM auth.users
  WHERE email = 'your-email@example.com'
);
```

Replace `'your-email@example.com'` with the actual email address.

## Troubleshooting

### Profile Update Still Failing?

1. Check the browser/app console for detailed error logs
2. Verify the user is authenticated: `supabase.auth.getUser()`
3. Check if profile exists: `SELECT * FROM profiles WHERE user_id = 'your-user-id'`
4. Verify RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'profiles'`

### Admin KYC Interface Not Showing?

1. Verify user has admin role:
   ```sql
   SELECT role FROM profiles WHERE user_id = (
     SELECT id FROM auth.users WHERE email = 'your-email@example.com'
   );
   ```
2. Check if the function exists:
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'get_admin_kyc_verifications';
   ```
3. Test the function directly:
   ```sql
   SELECT * FROM get_admin_kyc_verifications();
   ```

### Dashboard Not Showing Name/Farm?

1. Check if profile has data:
   ```sql
   SELECT full_name, farm_name FROM profiles WHERE user_id = 'your-user-id';
   ```
2. Update profile if needed:
   ```sql
   UPDATE profiles
   SET full_name = 'Your Name', farm_name = 'Your Farm'
   WHERE user_id = 'your-user-id';
   ```

## Summary

All issues have been resolved:

✅ Profile updates now work correctly with proper RLS policies
✅ Admin KYC interface displays for admin users
✅ Dashboard shows user name and farm name correctly
✅ Better error handling and user feedback throughout
✅ Comprehensive logging for debugging

The app should now function as expected for both regular users and administrators.
