# Credit and Payment System Roadmap

## Milestone: Credit and Payment System Implementation

### Phase 1: Database Schema Changes
- Create new tables: plans, subscriptions, payments, credit_ledger, usage
- Modify users table: remove credits column
- Add appropriate indexes and foreign key constraints
- Create migration scripts
- **Depends on**: None

### Phase 2: Core Services Layer
- CreditLedgerService: add/deduct/get_remaining_credits/get_history
- SubscriptionService: create/get_active/expire/calculate_credits
- UsageService: record/get_history
- PaymentService: Razorpay integration, webhook handling
- **Depends on**: Phase 1 (database models required for services)

### Phase 3: Payment Integration (Razorpay)
- Configure Razorpay API keys
- Create order endpoint (/api/payment/create-order)
- Create verification endpoint (/api/payment/verify)
- Create webhook endpoint (/api/payment/webhook)
- Handle payment.captured, payment.failed events
- **Depends on**: Phase 2 (PaymentService required)

### Phase 4: API Endpoints
- Payment routes: create-order, verify, history
- Subscription routes: current, plans, upgrade, cancel
- Credit routes: balance, history
- Usage routes: record (internal), history
- **Depends on**: Phase 2 (services), Phase 3 (payment integration)

### Phase 5: Middleware & Security
- Credit check middleware for API endpoints
- Expiry cron job (daily)
- Webhook signature verification
- Input validation and sanitization
- Rate limiting on sensitive endpoints
- **Depends on**: Phase 4 (API endpoints to protect)

### Phase 6: Testing
- Unit tests for credit calculations
- Integration tests for payment flow (Razorpay test mode)
- End-to-end test scenarios
- **Depends on**: Phase 1 (database), Phase 2 (services), Phase 3 (payment), Phase 4 (endpoints)

### Phase 7: Deployment
- Update environment variables with Razorpay keys
- Run database migrations
- Set up cron job for expiry processing
- Monitor logs for payment webhooks
- **Depends on**: Phase 1 (migrations), Phase 5 (cron job)