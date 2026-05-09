# Bug Report: Credit and Payment System Implementation Issues

## Summary
After reviewing the current implementation against the planned credit and payment system, I've identified several issues that need to be addressed to fully comply with the requirements.

## Critical Issues

### 1. Violation of Core Requirement: Storing Credits Directly
**Location:** `/server/models/user.py` line 15
**Issue:** The User model still contains a `credits` column that stores the credit balance directly.
```python
credits = db.Column(db.Integer, default=10)
```
**Problem:** This violates the fundamental requirement stated in the plan: "👉 NEVER store directly" and "👉 Always calculate" remaining credits from the credit_ledger.
**Impact:** 
- Data inconsistency risk between the `credits` column and actual ledger entries
- Defeats the purpose of having a transactional ledger for auditability
- Goes against the explicit requirement to never store remaining credits directly

### 2. Missing Subscription Creation Logic
**Location:** Payment processing flow
**Issue:** While the mock payment endpoint adds credits to the ledger, it does not create a corresponding subscription record.
**Problem:** The plan requires creating subscriptions when users buy plans: "Create subscription" and "Add credits in credit_ledger (type = credit)"
**Impact:** 
- Cannot implement subscription expiry logic
- Missing ability to show current plan details in dashboard
- No relationship between payments and plans for reporting

### 3. Missing Subscription Expiry Logic
**Location:** No implementation found
**Issue:** The plan requires adding expiry logic: "Credits should: expire monthly (subscription)"
**Problem:** No cron job or scheduled task to expire subscriptions and handle credit expiration
**Impact:**
- Credits never expire, which may not align with business model
- No way to handle plan renewals
- Missing functionality mentioned in "Pro Tips" section

### 4. Incomplete Payment Gateway Integration
**Location:** `/server/routes/payment.py`
**Issue:** Only mock payment implementation exists; Razorpay integration is missing
**Problem:** The plan specifies: "Use: Razorpay (BEST for you) or Stripe" with webhook-based verification
**Impact:**
- Production system would not work with real payments
- Missing webhook endpoint for payment verification
- No signature verification for security

### 5. Missing Usage Table Recording for Credit Deduction
**Location:** While usage is recorded, the credit deduction references usage ID correctly, but let's verify completeness
**Observation:** The captions route does create Usage records and references them in credit ledger, which is correct.

## Medium Priority Issue

### 6. Missing Dashboard Endpoints
**Location:** No dedicated endpoints for dashboard data
**Issue:** The plan specifies dashboard should show: "Current plan, Remaining credits, Usage history, Payment history, Upgrade button"
**Problem:** While some data can be obtained from existing endpoints, there's no consolidated dashboard API
**Impact:** Frontend would need to make multiple calls to gather dashboard data

### 7. Missing Credit History Endpoints
**Location:** No dedicated endpoints for viewing credit ledger history
**Issue:** The plan implies users should be able to see their credit transaction history
**Problem:** While CreditService.get_history exists, there's no route exposing it
**Impact:** Users cannot view their credit transaction history for transparency/audit purposes

### 8. Missing Plan Management Endpoints
**Location:** Only GET /plans exists in payment routes
**Issue:** Missing endpoints for creating/editing plans (admin functionality)
**Problem:** The plan mentions admin should be able to manage plans
**Impact:** Cannot dynamically add/modify pricing plans without code changes

## Low Priority Issues

### 9. Missing Margin Control Tracking
**Location:** No implementation found
**Issue:** The plan suggests tracking: "cost per minute (Vertex AI) revenue per user"
**Problem:** No mechanism to track actual costs vs revenue for profitability analysis
**Impact:** Cannot optimize pricing based on actual usage costs

### 10. Missing Top-Up Pack Support
**Location:** No implementation found
**Issue:** The plan mentions: "OR never expire (top-up packs)"
**Problem:** Only subscription-based credits are implemented
**Impact:** Limited flexibility in credit purchasing options

## Recommendations

### Immediate Fixes Required:
1. **Remove `credits` column from User model** and ensure all credit balance calculations come from CreditLedger
2. **Implement subscription creation** in payment flow when processing successful payments
3. **Add Razorpay payment integration** with proper webhook handling and signature verification
4. **Implement subscription expiry cron job** to handle monthly credit expiration
5. **Add dashboard endpoint** that returns consolidated user data (plan, credits, history)

### Additional Improvements:
6. Add credit history endpoints for transparency
7. Implement plan management endpoints for admins
8. Add margin tracking capabilities for cost analysis
9. Implement top-up pack functionality with non-expiring credits

## Files That Need Modification:
1. `/server/models/user.py` - Remove credits column
2. `/server/models/subscription.py` - Ensure proper relationships
3. `/server/routes/payment.py` - Implement real Razorpay integration
4. `/server/routes/subscription.py` - Create new file for subscription management
5. `/server/routes/dashboard.py` - Create new file for dashboard endpoints
6. `/server/cron/expiry_job.py` - Create new file for subscription expiry logic
7. `/server/services/payment_service.py` - Create new file for Razorpay integration

## Verification Steps After Fixes:
1. Confirm User model no longer has credits column
2. Verify payment processing creates both payment record AND subscription record
3. Check that credit balance is calculated solely from credit_ledger entries
4. Test that insufficient credits properly block API usage (returns 402)
5. Verify subscription expiry logic works correctly
6. Confirm webhook endpoint properly verifies Razorpay signatures