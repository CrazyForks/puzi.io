# Error Code Reference

To reduce contract size, error messages have been shortened to codes. Here's the mapping:

| Code | Original Message | Description |
|------|-----------------|-------------|
| E1   | Listing has no tokens available | The listing has amount = 0 |
| E2   | Unauthorized | User is not authorized for this action |
| E3   | Invalid amount | Amount is 0 or invalid |
| E4   | Invalid price | Price per token is 0 or invalid |
| E5   | Insufficient stock | Trying to buy more than available |
| E6   | Overflow | Math overflow in calculations |
| E7   | Invalid mint | Token mint address doesn't match |
| E8   | Invalid owner | Token account owner doesn't match |
| E9   | Invalid seller | Seller doesn't match listing seller |

## Frontend Error Handling

```typescript
// Example error handling in frontend
const ERROR_MESSAGES = {
  'E1': 'This listing is no longer active',
  'E2': 'You are not authorized to perform this action',
  'E3': 'Please enter a valid amount',
  'E4': 'Invalid price',
  'E5': 'Not enough tokens available',
  'E6': 'Calculation error, amount too large',
  'E7': 'Invalid token',
  'E8': 'Invalid token account owner',
  'E9': 'You are not the seller of this listing'
};

function getErrorMessage(error: any): string {
  const errorCode = error.toString().match(/E\d/)?.[0];
  return ERROR_MESSAGES[errorCode] || 'Transaction failed';
}
```