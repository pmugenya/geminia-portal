# Backend Fix Required: Quote Creation Timestamp Issue

## Problem Description
When users create quotes in the marine cargo quotation system, the quotes are being saved with `createDate` set to `12:00 AM` (midnight) instead of the actual time when the quote was created.

## Root Cause
The backend API endpoint `/api/v1/quote` (POST method for creating quotes) is setting the `createDate` field without including the time component, or is explicitly setting it to midnight (00:00:00).

## Expected Behavior
- When a quote is created, the `createDate` field should contain both the date **and** the exact time of creation
- Example: If a quote is created on January 15, 2025 at 3:45 PM, the `createDate` should be `2025-01-15T15:45:00` (or similar timestamp format)

## Current Behavior
- All quotes show `createDate` with time set to `12:00 AM` regardless of when they were actually created
- Example: Quote created at 3:45 PM shows as `2025-01-15T00:00:00`

## Frontend Display
The dashboard displays the quote creation time using Angular's date pipe:
```html
Created: {{ quote.createDate | date: 'M/d/yy, h:mm a' }}
```

This correctly formats the timestamp, but since the backend sends `00:00:00`, it always displays as `12:00 AM`.

## Required Backend Fix

### Location
The fix should be implemented in the backend controller/service that handles:
- **Endpoint**: `POST /marineportal/api/v1/quote`
- **Update Endpoint**: `PUT /marineportal/api/v1/quote/{quoteId}`

### Solution (Java/Spring Boot Example)
When creating or updating a quote entity, ensure the `createDate` field is set to the current timestamp:

```java
// For new quotes - use current timestamp
quote.setCreateDate(LocalDateTime.now());
// or
quote.setCreateDate(new Timestamp(System.currentTimeMillis()));

// For updates - preserve the original createDate
// Do NOT update createDate on quote updates
```

### Database Consideration
If using a database like PostgreSQL, MySQL, or similar:
- Ensure the `createDate` column is of type `TIMESTAMP` or `DATETIME` (not just `DATE`)
- Consider using database-level defaults: `DEFAULT CURRENT_TIMESTAMP` for the createDate column

### JSON Serialization
Ensure the backend serializes the timestamp with full date and time information:
```json
{
  "id": "12345",
  "createDate": "2025-01-15T15:45:30.000Z",
  "status": "DRAFT",
  ...
}
```

## Testing the Fix
After implementing the fix:

1. Create a new marine cargo quote at a specific time (e.g., 3:30 PM)
2. Navigate to the dashboard
3. Verify that the quote shows the correct creation time (e.g., "Created: 1/15/25, 3:30 PM")
4. Create another quote at a different time (e.g., 9:15 AM)
5. Verify both quotes show their respective creation times accurately

## Additional Notes
- The same issue may affect travel quotes if they use a similar backend structure
- Check the `updateDate` or `modifiedDate` fields if they exist to ensure they also capture accurate timestamps
- Consider adding timezone support if the application serves users in multiple time zones

## API Endpoints Affected
1. `POST /marineportal/api/v1/quote` - Create new quote
2. `PUT /marineportal/api/v1/quote/{quoteId}` - Update existing quote
3. `GET /marineportal/api/v1/quote/clientquotes` - Fetch client quotes (should return correct timestamps)

## Frontend Code Reference
- **Interface Definition**: `src/app/modules/auth/shared/services/auth.service.ts:25-40`
- **Dashboard Display**: `src/app/modules/auth/dashboard/dashboard.component.html:152`
- **Date Filtering Logic**: `src/app/modules/auth/dashboard/dashboard.component.ts:737-761`

## Priority
**HIGH** - This affects user experience and the accuracy of quote expiration calculations

## Contact
If you need any clarification on this issue, please reach out to the frontend development team.
