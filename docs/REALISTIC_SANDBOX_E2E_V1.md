# NEXORA AI — Realistic Sandbox E2E V1

## Status
12/12 automated tests passed.

## Coverage
- Sale -> ledger -> simulated payout -> notification
- Refund reverses ledger and blocks payout
- Chargeback reverses ledger
- Duplicate payout blocked
- Payment idempotency required
- Signed webhook required
- Duplicate webhook does not duplicate sale
- Failed payment cannot payout
- Autonomous product threshold remains enforced
- Prohibited money transfer remains blocked

## Important limitation
This is still a sandbox. No real gateway, bank account, settlement, or real push provider is connected.

## Next production-readiness gate
1. Persistent D1 storage
2. Real gateway sandbox credentials
3. Provider webhook signature verification
4. Reconciliation job
5. Remote push/VAPID endpoint
6. Full browser/mobile acceptance test
7. Controlled pilot with one product and strict financial limits
