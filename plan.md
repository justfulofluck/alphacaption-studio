# Credit and Payment System Implementation Plan

## Overview
Implementation of a comprehensive credit and payment system with the following components working together:
- Payments system (who paid, how much, plan)
- Usage system (how much API they used)  
- Credit system (remaining balance)

Flow: Payment → Adds credits → Usage → Deduct credits → Track balance

## Core Tables Required

### 1. Users Table (Modified)
- id (PK)
- email
- name
- created_at
- [REMOVED] credits column (will calculate from credit_ledger)
- plan (keep for quick reference, optional)

### 2. Plans Table
- id (PK)
- name (Starter, Pro, etc.)
- price
- credits_included
- validity_days
- created_at
- updated_at

### 3. Subscriptions Table
- id (PK)
- user_id (FK to users)
- plan_id (FK to plans)
- start_date
- end_date
- status (active, expired, cancelled)
- created_at
- updated_at

### 4. Payments Table
- id (PK)
- user_id (FK to users)
- amount
- payment_gateway (razorpay/stripe)
- status
- transaction_id
- created_at

### 5. Credit Ledger Table (Most Important)
- id (PK)
- user_id (FK to users)
- type (credit/debit)
- amount
- source (subscription/usage/bonus/topup)
- reference_id (payment_id or usage_id)
- created_at

### 6. Usage Table
- id (PK)
- user_id (FK to users)
- file_name
- duration_minutes
- credits_used
- created_at

## How the Flow Works

### When User Buys Plan
1. Payment success (via Razorpay/Stripe)
2. Create entry in payments table
3. Create subscription record
4. Add credits in credit_ledger (type = credit)

### When User Uses API
1. Calculate minutes (or tokens) used
2. Convert to credits
3. Insert record in usage table
4. Add entry in credit_ledger (type = debit)

### Getting Remaining Credits
NEVER store directly - always calculate:
```sql
SELECT SUM(
  CASE 
    WHEN type = 'credit' THEN amount 
    ELSE -amount 
  END
) as remaining_credits
FROM credit_ledger
WHERE user_id = ?
```

## Payment Integration (India Focused)
Use Razorpay (recommended) or Stripe

### Payment Flow:
1. User clicks "Buy Plan"
2. Razorpay Checkout opens
3. On success → webhook hits backend
4. Backend updates:
   - payments table
   - subscriptions table  
   - credit_ledger (adds credits)
5. Always use webhooks, never frontend confirmation

## Backend Logic (Python/SQLAlchemy)

### Credit Ledger Service Functions:
```python
def add_credits(user_id, amount, source, reference_id=None):
    db.insert("credit_ledger", {
        "user_id": user_id,
        "type": "credit",
        "amount": amount,
        "source": source,  # subscription/usage/bonus/topup
        "reference_id": reference_id
    })

def deduct_credits(user_id, amount, source, reference_id=None):
    db.insert("credit_ledger", {
        "user_id": user_id,
        "type": "debit", 
        "amount": amount,
        "source": source,  # subscription/usage/bonus/topup
        "reference_id": reference_id
    })

def get_remaining_credits(user_id):
    result = db.execute("""
        SELECT SUM(
          CASE 
            WHEN type = 'credit' THEN amount 
            ELSE -amount 
          END
        ) as remaining_credits
        FROM credit_ledger
        WHERE user_id = ?
    """, (user_id,))
    return result[0]['remaining_credits'] or 0
```

## Dashboard Requirements (What User Should See)
- Current plan details
- Remaining credits (calculated)
- Usage history
- Payment history
- Upgrade/downgrade buttons
- Subscription management

## Important Implementation Tips

### 1. Always Log Everything
Never delete:
- payments records
- usage records  
- credit_ledger entries
→ Helps in disputes & debugging

### 2. Add Expiry Logic
Credits should:
- Expire monthly (for subscription-based credits)
- Never expire (for top-up packs, if implemented later)

### 3. Prevent Abuse
Before processing any API request:
```python
if get_remaining_credits(user_id) <= 0:
    reject_request()  # Return 402 Payment Required
```

### 4. Margin Control (Future Enhancement)
Track:
- Cost per minute (Vertex AI usage cost)
- Revenue per user
→ This determines pricing profitability

## Implementation Phases

### Phase 1: Database Schema Changes
- Create new tables: plans, subscriptions, payments, credit_ledger, usage
- Modify users table: remove credits column
- Add appropriate indexes and foreign key constraints
- Create migration scripts

### Phase 2: Core Services Layer
- CreditLedgerService: add/deduct/get_remaining_credits/get_history
- SubscriptionService: create/get_active/expire/calculate_credits
- UsageService: record/get_history
- PaymentService: Razorpay integration, webhook handling

### Phase 3: Payment Integration (Razorpay)
- Configure Razorpay API keys
- Create order endpoint (/api/payment/create-order)
- Create verification endpoint (/api/payment/verify)
- Create webhook endpoint (/api/payment/webhook)
- Handle payment.captured, payment.failed events

### Phase 4: API Endpoints
- Payment routes: create-order, verify, history
- Subscription routes: current, plans, upgrade, cancel
- Credit routes: balance, history
- Usage routes: record (internal), history

### Phase 5: Middleware & Security
- Credit check middleware for API endpoints
- Expiry cron job (daily)
- Webhook signature verification
- Input validation and sanitization
- Rate limiting on sensitive endpoints

### Phase 6: Testing
- Unit tests for credit calculations
- Integration tests for payment flow (Razorpay test mode)
- End-to-end test scenarios:
  - Purchase → credit addition → API usage → credit deduction → balance check
  - Subscription expiry handling
  - Insufficient credits blocking
  - Concurrent access safety

### Phase 7: Deployment
- Update environment variables with Razorpay keys
- Run database migrations
- Set up cron job for expiry processing
- Monitor logs for payment webhooks

## Technical Considerations

### Database Indexes
- credit_ledger(user_id, created_at, type)
- payments(user_id, status, created_at)
- subscriptions(user_id, status, end_date)
- usage(user_id, created_at)

### Concurrency Handling
- Use database transactions for credit operations
- Consider row-level locking for high-concurrency scenarios
- Idempotency keys for payment processing to prevent duplicate credits

### Security
- Validate Razorpay webhook signatures
- Never trust frontend for payment validation
- Sanitize all user inputs
- Use parameterized queries to prevent SQL injection
- Store API keys securely (environment variables)

## Estimated Timeline
- Database changes: 2-3 hours
- Core services: 4-6 hours  
- Payment integration: 3-4 hours
- API endpoints: 4-5 hours
- Middleware & security: 2-3 hours
- Testing: 3-4 hours
- **Total: ~18-25 hours**

## Files to Create/Modify
1. `server/models/plan.py` - Plans model
2. `server/models/subscription.py` - Subscriptions model  
3. `server/models/payment.py` - Payments model
4. `server/models/credit_ledger.py` - Credit ledger model
5. `server/models/usage.py` - Usage model
6. `server/models/user.py` - Remove credits column
7. `server/services/credit_service.py` - Credit ledger service
8. `server/services/subscription_service.py` - Subscription service
9. `server/services/usage_service.py` - Usage service
10. `server/services/payment_service.py` - Razorpay integration
11. `server/routes/payment.py` - Payment routes
12. `server/routes/subscription.py` - Subscription routes
13. `server/routes/credit.py` - Credit routes
14. `server/routes/usage.py` - Usage routes
15. `server/middleware/credit_check.py` - Credit validation middleware
16. `server/cron/expiry_job.py` - Daily expiry cron job
17. `server/config.py` - Add Razorpay configuration
18. `.env` - Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
19. `requirements.txt` - Add razorpay package
20. `plan.md` - This document

This implementation plan provides a robust, scalable foundation for the credit and payment system that follows all specified requirements including proper credit tracking via ledger, webhook-based payment verification, and abuse prevention.