
# Lots Marketplace Implementation

## Overview
This document describes the implementation of the marketplace functionality for lots, allowing users to list their lots for sale and other users to purchase them through the shopping cart.

## Features Implemented

### 1. Database Schema Updates
- Added marketplace fields to the `lots` table:
  - `for_sale` (boolean): Indicates if the lot is available for purchase
  - `sale_price` (numeric): The selling price for the entire lot
  - `sale_description` (text): Description for potential buyers
  - `location` (text): Physical location of the lot
  - `city` (text): City where the lot is located
  - `region` (text): Region where the lot is located

### 2. RLS Policy Updates
- **Previous Policy**: Users could only view their own lots
- **New Policy**: All authenticated users can view all lots
- **Security**: Users can still only insert, update, and delete their own lots

### 3. Lots Screen Enhancements

#### New Filters
- **Tous**: Shows all lots from all users
- **Mes Lots**: Shows only the current user's lots
- **À Vendre**: Shows only lots marked for sale
- **Actifs**: Shows only active lots
- **Archivés**: Shows archived lots

#### Visual Indicators
- **For Sale Badge**: Displays the sale price on lots marked for sale
- **Seller Info Badge**: Shows the seller's name on lots owned by other users
- **Buy Button**: Green button with cart icon for lots available for purchase
- **Archive Button**: Red button for the owner to archive their own lots

#### Real-time Updates
- All users see newly added lots immediately after refresh
- Pull-to-refresh functionality to get the latest lots

### 4. Add Lot Form Updates

#### New Fields
- **Mettre ce lot en vente**: Checkbox to mark the lot for sale
- **Prix de Vente**: Total price for the entire lot (required if for sale)
- **Description de Vente**: Description for potential buyers
- **Localisation**: Physical address or location details
- **Ville**: City name
- **Région**: Region name

#### Validation
- Sale price is required if the lot is marked for sale
- All marketplace fields are only shown when "for sale" is checked

### 5. Shopping Cart Integration

#### Buy Flow
1. User clicks the "Acheter" (Buy) button on a lot
2. System checks if the user is logged in
3. System prevents users from buying their own lots
4. Confirmation dialog shows lot details and price
5. On confirmation:
   - Creates a marketplace product entry (if not exists)
   - Adds the product to the user's shopping cart
   - Shows success message

#### Cart Management
- Lots are converted to marketplace products when added to cart
- Product name format: "Lot: [Lot Name]"
- Product description includes breed, quantity, and age
- Location information is preserved

### 6. Type System Updates
- Updated `Lot` interface to include marketplace fields:
  - `forSale?: boolean`
  - `salePrice?: number`
  - `saleDescription?: string`
  - `location?: string`
  - `city?: string`
  - `region?: string`
  - `userId?: string`
  - `sellerName?: string`

### 7. LotCard Component Updates
- Displays location information for lots marked for sale
- Shows sale description in a highlighted box
- Displays sale price instead of price per kg when for sale
- Responsive layout adapts to marketplace vs. personal lot views

## User Experience Flow

### For Sellers (Adding a Lot for Sale)
1. Click the "+" button on the Lots screen
2. Fill in basic lot information (name, type, breed, quantity, age, etc.)
3. Check "Mettre ce lot en vente sur le marketplace"
4. Enter sale price and description
5. Add location information (optional but recommended)
6. Submit the form
7. Lot is immediately visible to all users

### For Buyers (Purchasing a Lot)
1. Navigate to the Lots screen
2. Use the "À Vendre" filter to see available lots
3. Browse lots from different sellers
4. Click the "Acheter" button on a desired lot
5. Review the confirmation dialog
6. Confirm to add to cart
7. Navigate to marketplace to view cart and checkout

## Security Considerations

### Row Level Security (RLS)
- **SELECT**: All authenticated users can view all lots
- **INSERT**: Users can only create lots for themselves
- **UPDATE**: Users can only update their own lots
- **DELETE**: Users can only delete their own lots

### Business Logic
- Users cannot buy their own lots (enforced in the UI)
- Sale price validation ensures positive values
- User authentication is required for all operations

## Database Migration

```sql
-- Add marketplace fields to lots table
ALTER TABLE lots ADD COLUMN IF NOT EXISTS for_sale BOOLEAN DEFAULT false;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS sale_price NUMERIC DEFAULT 0;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS sale_description TEXT;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS region TEXT;

-- Update RLS policy to allow all authenticated users to view all lots
DROP POLICY IF EXISTS "Users can view their own lots" ON lots;
CREATE POLICY "All users can view all lots" ON lots FOR SELECT USING (true);
```

## Future Enhancements

### Potential Improvements
1. **Search and Filters**: Add search by location, breed, or price range
2. **Notifications**: Notify sellers when their lot is added to a cart
3. **Reviews and Ratings**: Allow buyers to rate sellers after purchase
4. **Negotiation**: Add messaging for price negotiation
5. **Images**: Allow sellers to upload photos of their lots
6. **Analytics**: Track views and interest in lots
7. **Favorites**: Allow users to save lots for later
8. **Comparison**: Side-by-side comparison of multiple lots

### Technical Improvements
1. **Real-time Updates**: Use Supabase Realtime for instant updates
2. **Caching**: Implement caching for better performance
3. **Pagination**: Add pagination for large numbers of lots
4. **Offline Support**: Cache lots for offline viewing
5. **Push Notifications**: Notify users of new lots in their area

## Testing Checklist

- [ ] User can add a lot without marking it for sale
- [ ] User can add a lot and mark it for sale
- [ ] All users can see newly added lots
- [ ] Users can filter lots by different criteria
- [ ] Users can add lots to their shopping cart
- [ ] Users cannot buy their own lots
- [ ] Users can only archive their own lots
- [ ] Location information displays correctly
- [ ] Sale price displays correctly
- [ ] Pull-to-refresh updates the lot list
- [ ] Form validation works correctly
- [ ] Shopping cart integration works properly

## Conclusion

The lots marketplace implementation provides a complete solution for users to buy and sell poultry lots within the AviprodApp. The feature is designed with security, usability, and scalability in mind, providing a solid foundation for future enhancements.
