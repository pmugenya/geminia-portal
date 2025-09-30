# Travel Quote Backend Integration

## Summary

The travel quote journey now uses the **same backend APIs** as the marine cargo quote journey for a unified experience. Quotes are saved to the database and appear on the dashboard under "Saved Quotes" (pending payment).

---

## ✅ Key Changes Implemented

### 1. **Backend API Integration**

The travel quote now uses the same `QuoteService` that powers marine quotes:

```typescript
// Same API endpoint as marine
POST /api/v1/quote
```

**Metadata Structure Sent to Backend:**
```json
{
  "prodName": "Travel Insurance",
  "planName": "Worldwide Plus",
  "coverPeriod": "Up to 7 days",
  "numTravelers": 2,
  "winterSports": false,
  "email": "user@example.com",
  "phoneNo": "+254712345678",
  "travelers": [
    {"fullName": "John Doe", "dob": "1990-01-15"},
    {"fullName": "Jane Doe", "dob": "1992-05-20"}
  ],
  "subtotal": 58.06,
  "subtotalKES": 7547.80,
  "groupDiscount": 0,
  "ageSurcharge": 0,
  "winterSportsSurcharge": 0,
  "phcf": 18.87,
  "trainingLevy": 15.10,
  "stampDuty": 40,
  "netprem": 7621.77,
  "description": "Worldwide Plus - Up to 7 days"
}
```

### 2. **Quote Saving Flow**

**Step 2 → Step 3 Transition:**
1. User fills in traveler details (Step 2)
2. Clicks "Review & Save Quote"
3. Quote is **automatically saved to backend** via API
4. Backend returns quote with `id` and `refno`
5. User proceeds to Step 3 (Review & Pay)
6. Quote appears on dashboard as "Pending Quote"

### 3. **Payment Integration**

Uses the **same M-Pesa STK Push** as marine quotes:

```typescript
// M-Pesa Payment Flow
this.quoteService.stkPush(phone, amount, refNo)
  .subscribe(...)
```

**Payment Modal Data:**
- Amount: Total payable in KES
- Phone: User's phone number
- Reference: Backend-generated `refno` (e.g., `TRV-123456`)
- Description: Plan name + "Travel Insurance Cover"

### 4. **Dashboard Integration**

Travel quotes now appear in the dashboard's **"Saved Quotes"** section alongside marine quotes:

**Quote Display Information:**
- Product Name: "Travel Insurance"
- Plan: e.g., "Worldwide Plus"
- Cover Period: e.g., "Up to 7 days"
- Premium: KES amount
- Status: "DRAFT" (before payment) or "PAID" (after payment)
- Created Date: Actual timestamp from backend

### 5. **Download Functionality**

Uses the same download API as marine quotes:

```typescript
// Download endpoint
GET /api/v1/quote/download/{quoteId}
```

Returns PDF with:
- Quote reference number
- Plan details
- Traveler information
- Premium breakdown
- Payment status

---

## 🔄 API Endpoints Used

### Authentication (Shared)
- `POST /api/v1/login` - User login
- `POST /api/v1/login/validate` - OTP validation

### Quote Management (Shared)
- `POST /api/v1/quote` - Create new quote (travel or marine)
- `PUT /api/v1/quote/{quoteId}` - Update existing quote
- `GET /api/v1/quote/{quoteId}` - Fetch single quote
- `GET /api/v1/quote/clientquotes` - Fetch user's quotes (dashboard)
- `GET /api/v1/quote/download/{quoteId}` - Download quote PDF

### Payment (Shared)
- `GET /api/v1/payments/stkpush` - Initiate M-Pesa STK Push
- `GET /api/v1/payments/validate` - Validate payment status

---

## 📊 Data Flow Diagram

```
User fills form → Calculate premium → Save to Backend
                                           ↓
                            Backend generates ID & refno
                                           ↓
                                  Store in database
                                           ↓
                            Return quote data to frontend
                                           ↓
                         Display in Step 3 (Review & Pay)
                                           ↓
                            Show in dashboard (Pending)
                                           ↓
                        User initiates M-Pesa payment
                                           ↓
                            Backend updates status → PAID
                                           ↓
                         Dashboard shows as paid quote
```

---

## 🎨 User Experience

### Before Payment
1. **Step 1**: Select plan and cover period
2. **Step 2**: Enter traveler details
3. **Click "Review & Save Quote"**: 
   - Shows loading spinner
   - Saves to backend
   - Toast: "Quote saved successfully!"
4. **Step 3**: Review details
   - Download button (enabled)
   - Share button (enabled)
   - "Proceed to Payment" button

### After Payment
- Quote status changes to "PAID"
- Certificate becomes available
- Policy appears in "Active Policies" section

---

## 🔐 Authentication Flow

The travel quote uses the **same authentication** as marine quote:

1. User must be **logged in** to proceed to payment
2. Session is validated via `AuthService.check()`
3. If not authenticated, redirected to sign-in page
4. User data stored in session storage

---

## 💾 Data Persistence

### Backend Database
- Primary storage for all quotes
- Generates unique `id` and `refno`
- Tracks payment status
- Stores traveler information
- Records timestamps (createDate)

### Local Storage (Backup)
- Stores quote temporarily for offline access
- Used as fallback if backend is unavailable
- Synced with backend on next save

---

## 🧪 Testing Checklist

### Quote Creation
- [ ] Fill travel details and submit
- [ ] Verify loading spinner appears
- [ ] Check toast message "Quote saved successfully!"
- [ ] Confirm quote appears in Step 3
- [ ] Verify quote ID is generated

### Dashboard Display
- [ ] Navigate to dashboard
- [ ] Check quote appears under "Saved Quotes"
- [ ] Verify status shows "DRAFT"
- [ ] Confirm premium amount is correct
- [ ] Check creation timestamp is accurate

### Payment Flow
- [ ] Click "Proceed to Payment"
- [ ] Verify M-Pesa modal opens
- [ ] Confirm amount and reference are correct
- [ ] Test STK push on phone
- [ ] Verify payment validation
- [ ] Check status updates to "PAID"

### Download Feature
- [ ] Click "Download Quote" button
- [ ] Verify PDF downloads successfully
- [ ] Check PDF contains all quote details
- [ ] Confirm filename format is correct

### Share Feature
- [ ] Click "Share Quote" button
- [ ] Verify modal opens with preview
- [ ] Test WhatsApp sharing
- [ ] Test Email sharing (Gmail, Outlook, Yahoo)
- [ ] Check shareable text format

---

## 🚨 Error Handling

### Backend Unavailable
- Shows toast: "An error occurred while saving the quote"
- Quote still saved to localStorage
- User can retry later

### Payment Failed
- M-Pesa modal shows error message
- Quote remains in "DRAFT" status
- User can attempt payment again

### Invalid Data
- Form validation prevents submission
- Field-level error messages shown
- Required fields highlighted

---

## 📝 Backend Requirements

For full functionality, the backend must:

1. **Accept Travel Quote Metadata** in the same format as marine quotes
2. **Generate Unique IDs** (id, refno) for each quote
3. **Store Travel-Specific Fields**:
   - planName, coverPeriod, numTravelers
   - travelers array (fullName, dob)
   - winterSports flag
4. **Support PDF Generation** for travel quotes
5. **Track Payment Status** (DRAFT → PAID)
6. **Return Correct timestamps** for createDate

---

## 🎯 Benefits

### For Users
✅ Consistent experience across marine and travel insurance  
✅ Quotes saved automatically before payment  
✅ Can download and share quotes easily  
✅ All quotes accessible from one dashboard  
✅ Secure M-Pesa payment integration  

### For Developers
✅ Reusable API endpoints  
✅ Single payment service for all products  
✅ Unified quote management system  
✅ Shared authentication flow  
✅ Less code duplication  

### For Business
✅ Centralized quote database  
✅ Better tracking of quote-to-policy conversion  
✅ Unified payment reconciliation  
✅ Consistent reporting across products  

---

## 🔮 Future Enhancements

1. **Quote Expiration**: Auto-expire quotes after 15 days
2. **Email Notifications**: Send quote details via email
3. **Quote Comparison**: Compare multiple travel plans
4. **Bulk Travelers**: Import travelers from CSV
5. **Policy Documents**: Generate travel certificates automatically
6. **SMS Notifications**: Send payment confirmations via SMS

---

**Status**: ✅ Fully Integrated with Backend APIs  
**Last Updated**: 2025-09-30  
**Version**: 1.0
