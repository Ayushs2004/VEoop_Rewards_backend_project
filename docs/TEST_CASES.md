# Automated Test Matrix — VELoop Rewards

The backend includes a comprehensive Jest + Supertest automated test suite operating on an isolated in-memory MongoDB runner.

## Test Summary
- **Total Test Suites:** 6 passed (`admin.test.js`, `auth.test.js`, `wallet.test.js`, `withdrawal.test.js`, `security.test.js`, `concurrency.test.js`)
- **Total Test Cases:** 35 passed (100% success rate in ~10.9s)
- **Code Execution:** Deterministic, zero mock dependencies, verified on actual Mongoose models and queries.

---

## Required Specification Test Matrix

| Test ID | Test Name | Scenario / Operation | Expected Result | Verified In |
|---|---|---|---|---|
| **TEST 1** | Normal Credit | Credit 500 VEs to a wallet having 1000 VEs | Balance becomes 1500 VEs. Ledger record created: `balanceBefore=1000`, `balanceAfter=1500`, `type=CREDIT`, `amount=500`. | `tests/wallet.test.js` |
| **TEST 2** | Normal Withdrawal | User with 1500 VEs withdraws 1000 VEs | Balance becomes 500 VEs. Withdrawal state becomes `PENDING`. Ledger record created: `balanceBefore=1500`, `balanceAfter=500`, `type=DEBIT`, `amount=1000`. | `tests/withdrawal.test.js` |
| **TEST 3** | Insufficient Balance | User with 500 VEs attempts to withdraw 1000 VEs | Request rejected with `400 Bad Request` and code `INSUFFICIENT_BALANCE`. Balance remains untouched at 500 VEs. No withdrawal created. | `tests/withdrawal.test.js` |
| **TEST 4** | Double-Click / Duplicate | User sends two identical withdrawal requests with same `Idempotency-Key` | First request creates withdrawal (201). Second request returns existing withdrawal with `200 OK` and header `X-Idempotent-Replay: true`. Balance is only deducted ONCE. | `tests/withdrawal.test.js` |
| **TEST 5** | Concurrent Withdrawals | User has 10,000 VEs. Two requests A & B fire concurrently via `Promise.all`, each requesting 8,000 VEs | Exactly ONE request succeeds (201) and ONE request fails (400 `INSUFFICIENT_BALANCE`). Final wallet balance is exactly 2,000 VEs (never negative). | `tests/concurrency.test.js` |
| **TEST 6** | Invalid Payout Option | Request specifies fake option ID `fake_non_existent_option_id` | Rejected with `400 Bad Request` and code `INVALID_PAYOUT_OPTION`. Balance is untouched. | `tests/withdrawal.test.js` |
| **TEST 7** | Cross-Tenant User Isolation | User A attempts to read User B's withdrawal ID; User A passes `?userId=UserB` to wallet | Rejected with `403 Forbidden` (`FORBIDDEN`). Wallet API strictly ignores query parameter and derives identity from JWT. | `tests/security.test.js` |
| **TEST 8** | Rejected Withdrawal & Reversal | User requests withdrawal (10k -> 7.6k). Admin calls `/reject` | Status becomes `REJECTED`. Safe refund `CREDIT` ledger entry created (`balanceBefore=7600`, `balanceAfter=10000`). Original `DEBIT` ledger entry is preserved. | `tests/withdrawal.test.js` |
| **TEST 9** | API Manipulation | Client sends `{ amount: 1 }` or `{ requiredAmount: 1 }` in body | Backend ignores client-supplied amount and calculates the true configured required VEs (2,400) from MongoDB. Wallet is debited by exactly 2,400 VEs. | `tests/withdrawal.test.js` |

---

## Admin Panel & Operational Control Test Matrix

| Test Scenario | Input / Trigger | Expected Outcome | Verified In |
|---|---|---|---|
| **Admin Stats & Circulation** | `GET /api/admin/stats` | Returns total/active users, circulation across all 5 currencies, pending withdrawals, recent transactions, and audit logs. | `tests/admin.test.js` |
| **User Directory & Search** | `GET /api/admin/users?search=...` | Returns paginated user records with attached live wallet balances across all 5 currencies. | `tests/admin.test.js` |
| **User Profile & Ledger** | `GET /api/admin/users/:id` | Returns complete user profile, wallet details, and aggregated financial metrics. | `tests/admin.test.js` |
| **User Paginated Ledger** | `GET /api/admin/users/:id/transactions` | Returns paginated double-entry ledger history for target user. | `tests/admin.test.js` |
| **Withdrawal Queue & Masking** | `GET /api/admin/withdrawals?status=PENDING` | Returns filtered queue with sensitive beneficiary details masked (`maskedUpiId`, `maskedEmail`). | `tests/admin.test.js` |
| **Withdrawal Audit Detail** | `GET /api/admin/withdrawals/:id` | Returns full withdrawal details, linked ledger transaction, and associated audit timeline. | `tests/admin.test.js` |
| **RBAC Security Guard** | Regular user calling `/api/admin/*` | All administrative endpoints return `403 Forbidden` (`FORBIDDEN`). | `tests/admin.test.js` |
| **Mandatory Adjustment Reason** | Admin omitting reason in `/api/wallet/credit` | Request fails with `400 Bad Request`. When provided, returns `balanceBefore` and `balanceAfter`. | `tests/admin.test.js` |

---

## Additional Security & Edge Case Tests

| Test Scenario | Input / Trigger | Expected Outcome |
|---|---|---|
| **Inactive Payout Option** | Option marked `active: false` in MongoDB | `400 Bad Request` (`INACTIVE_PAYOUT_OPTION`) |
| **Malformed UPI Format** | `upiId: "not_a_valid_upi"` | `400 Bad Request` (`INVALID_PAYOUT_DETAILS`) |
| **Missing Authentication** | Request without `Authorization` header | `401 Unauthorized` (`UNAUTHORIZED`) |
| **Tampered / Malformed JWT** | `Authorization: Bearer invalid.token` | `401 Unauthorized` (`INVALID_TOKEN`) |
| **Privilege Escalation** | Regular user calling `POST /api/wallet/credit` | `403 Forbidden` (`FORBIDDEN`) |
| **Admin Payout Approval** | Admin calls `PATCH /api/withdrawals/:id/approve` | Status changes to `APPROVED`, review note attached. |

---

## How to Run the Automated Test Suite

```bash
cd backend
npm test
```
