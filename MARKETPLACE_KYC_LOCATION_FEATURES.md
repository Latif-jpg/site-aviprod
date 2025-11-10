
# Marketplace KYC & Location Features

## Overview
This document describes the new KYC verification and location-based features added to the AviprodApp marketplace.

## Features Implemented

### 1. KYC Verification for Sellers

#### Database Schema
- **seller_verifications table**: Stores KYC verification data
  - `user_id`: Reference to the user
  - `real_photo_url`: URL to the seller's real photo (selfie)
  - `id_photo_url`: URL to the seller's ID document photo
  - `verification_status`: Status of verification (pending, approved, rejected)
  - `rejection_reason`: Reason if rejected
  - `submitted_at`: Timestamp of submission
  - `reviewed_at`: Timestamp of review
  - `reviewed_by`: Admin who reviewed

- **profiles.seller_verified**: Boolean flag for quick verification checks
  - Automatically updated via trigger when verification status changes

#### Verification Flow
1. **New Seller Attempts to Add Product**
   - System checks if seller has verification record
   - If not verified, shows KYC verification prompt

2. **KYC Verification Process**
   - Seller must agree to anti-fraud guarantee
   - Seller provides:
     - Real photo (selfie)
     - ID document photo (national ID, passport, or driver's license)
   - Submission creates record with "pending" status

3. **Admin Review** (Manual Process)
   - Admin team reviews submissions
   - Updates verification_status to "approved" or "rejected"
   - Trigger automatically updates seller_verified flag in profiles

4. **Seller Status**
   - **No verification**: Cannot add products, prompted to verify
   - **Pending**: Cannot add products, informed verification is in progress
   - **Approved**: Can add and manage products
   - **Rejected**: Cannot add products, advised to contact support

#### Anti-Fraud Guarantee
Sellers must agree to:
- Not being a scammer or fraudster
- Providing accurate information
- Respecting marketplace rules
- Providing quality products

### 2. Location-Based Features

#### Database Schema
Added to **marketplace_products table**:
- `location`: Specific location/neighborhood (e.g., "Ouaga 2000, Secteur 15")
- `city`: City name (e.g., "Ouagadougou")
- `region`: Region name (e.g., "Centre", "Hauts-Bassins")

Indexes created for efficient location-based searches.

#### Location Features

**Product Creation**
- Sellers must specify:
  - Locality/Neighborhood
  - City
  - Region (from predefined list of Burkina Faso regions)

**Search & Filter**
- **Location Search**: Text input to search by city or neighborhood
- **Region Filter**: Horizontal scrollable list of regions
- Combined with existing category and text search filters

**Product Display**
- Location badge on product cards showing city
- Detailed location info in product detail view
- Orange location icon for visual identification

#### Supported Regions
- Boucle du Mouhoun
- Cascades
- Centre
- Centre-Est
- Centre-Nord
- Centre-Ouest
- Centre-Sud
- Est
- Hauts-Bassins
- Nord
- Plateau-Central
- Sahel
- Sud-Ouest

## Components

### SellerKYCVerification.tsx
New component for KYC verification process:
- Displays anti-fraud guarantee
- Handles photo capture/selection
- Submits verification request
- Shows verification status

### AddProductForm.tsx (Updated)
- Added location fields (locality, city, region)
- Checks seller verification before allowing submission
- Validates all location fields are filled

### Marketplace.tsx (Updated)
- Added KYC verification flow
- Added location filter UI
- Added region filter UI
- Updated product cards to show location
- Updated product detail to show full location info

## Security & Privacy

### Row Level Security (RLS)
- Users can only view/edit their own verification records
- Only pending verifications can be updated by users
- Approved/rejected verifications are read-only for users

### Data Protection
- KYC documents are private and not shared publicly
- Only admin team can access verification documents
- Security note displayed to users about data protection

## User Experience

### Visual Indicators
- **Verification Badge**: Shows on own products
- **Location Badge**: Orange location icon with city name
- **Status Messages**: Clear feedback for each verification state

### Error Handling
- Graceful handling of missing verification
- Clear error messages for validation failures
- Informative alerts for each verification state

## Admin Tasks

### Manual Verification Process
Admins need to:
1. Review submitted KYC documents
2. Verify identity matches
3. Update verification_status in seller_verifications table
4. Optionally add rejection_reason if rejecting

### SQL for Admin Review
```sql
-- View pending verifications
SELECT 
  sv.*,
  p.full_name,
  p.phone
FROM seller_verifications sv
JOIN profiles p ON sv.user_id = p.user_id
WHERE sv.verification_status = 'pending'
ORDER BY sv.submitted_at DESC;

-- Approve a verification
UPDATE seller_verifications
SET 
  verification_status = 'approved',
  reviewed_at = now(),
  reviewed_by = 'admin_user_id'
WHERE user_id = 'seller_user_id';

-- Reject a verification
UPDATE seller_verifications
SET 
  verification_status = 'rejected',
  rejection_reason = 'Reason for rejection',
  reviewed_at = now(),
  reviewed_by = 'admin_user_id'
WHERE user_id = 'seller_user_id';
```

## Future Enhancements

### Potential Improvements
1. **Automated Verification**: AI-based ID verification
2. **Document Storage**: Integrate with Supabase Storage for secure photo storage
3. **Admin Dashboard**: Web interface for reviewing verifications
4. **Notifications**: Push notifications for verification status changes
5. **Geolocation**: GPS-based location detection
6. **Map View**: Display products on a map
7. **Distance Calculation**: Show distance from user's location
8. **Delivery Zones**: Define delivery areas for products

## Testing Checklist

### KYC Verification
- [ ] New user cannot add product without verification
- [ ] KYC form displays correctly
- [ ] Photo capture/selection works
- [ ] Agreement checkbox required
- [ ] Submission creates pending record
- [ ] Pending status prevents product addition
- [ ] Approved status allows product addition
- [ ] Rejected status shows appropriate message

### Location Features
- [ ] Location fields required in product form
- [ ] Region selector works correctly
- [ ] Location filter searches correctly
- [ ] Region filter works correctly
- [ ] Combined filters work together
- [ ] Location displays on product cards
- [ ] Location displays in product detail
- [ ] Empty location handled gracefully

## Notes

- KYC photos are currently stored as URIs (local paths)
- In production, implement proper file upload to Supabase Storage
- Admin verification is manual - consider automation for scale
- Location data is text-based - consider geocoding for advanced features
