# VELoop Rewards — API Documentation

This document provides a complete specification for all REST APIs in the **VELoop Rewards Wallet & Withdrawal Backend System**.

---

## 1. Global Standards & Conventions

### Base URL
- Local Development: `http://localhost:5000/api`
- Health Check: `http://localhost:5000/health`

### Authentication Header
Protected endpoints require a valid JSON Web Token (JWT) in the `Authorization` header:
```http
Authorization: Bearer <jwt_token>
```

### Idempotency Header
Withdrawal creation endpoints accept an optional/recommended `Idempotency-Key` or `X-Idempotency-Key` header to prevent double-click or network retry duplicate charges:
```http
Idempotency-Key: req_c19a4b3d8f
```

### Response Formats

#### Standard Success Response
```json
{
  "success": true,
  "message": "Human readable confirmation message.",
  "data": { ... },
  "meta": { ... } // Optional pagination or extra metadata
}
```

#### Standard Error Response
```json
{
  "success": false,
  "message": "Human readable error description.",
  "code": "ERROR_CODE_STRING",
  "errors": [ ... ] // Optional field validation errors
}
```

---

## 2. Authentication APIs

### 2.1 Register User
- **Endpoint:** `POST /api/auth/register`
- **Authentication:** None
- **Rate Limit:** 50 requests / 15 minutes

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "name": "Alex Doe"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User account registered successfully.",
  "data": {
    "user": {
      "_id": "67245a90184b29c9ef310111",
      "email": "user@example.com",
      "name": "Alex Doe",
      "role": "USER",
      "accountStatus": "ACTIVE",
      "createdAt": "2026-10-03T09:00:00.000Z",
      "updatedAt": "2026-10-03T09:00:00.000Z"
    },
    "wallet": {
      "_id": "67245a90184b29c9ef310112",
      "userId": "67245a90184b29c9ef310111",
      "ves": 0,
      "sves": 0,
      "gems": 0,
      "tokens": 0,
      "spins": 0
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 2.2 Login User
- **Endpoint:** `POST /api/auth/login`
- **Authentication:** None
- **Rate Limit:** 50 requests / 15 minutes

**Request Body:**
```json
{
  "email": "demo@veloop.test",
  "password": "Password123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "_id": "67245a90184b29c9ef310111",
      "email": "demo@veloop.test",
      "name": "Demo User (VELoop)",
      "role": "USER",
      "accountStatus": "ACTIVE"
    },
    "wallet": {
      "ves": 25000,
      "sves": 5000,
      "gems": 100,
      "tokens": 500,
      "spins": 3
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 2.3 Get Current User Profile (Me)
- **Endpoint:** `GET /api/auth/me`
- **Authentication:** Bearer JWT required

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User profile fetched successfully.",
  "data": {
    "user": {
      "_id": "67245a90184b29c9ef310111",
      "email": "demo@veloop.test",
      "name": "Demo User (VELoop)",
      "role": "USER",
      "accountStatus": "ACTIVE"
    },
    "wallet": {
      "ves": 25000,
      "sves": 5000,
      "gems": 100,
      "tokens": 500,
      "spins": 3
    }
  }
}
```

---

## 3. Wallet APIs

### 3.1 Get User Wallet
- **Endpoint:** `GET /api/wallet`
- **Authentication:** Bearer JWT required
- **Security Rule:** Always extracts identity strictly from JWT. Query parameters like `?userId=someoneElse` are strictly ignored.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Wallet fetched successfully.",
  "data": {
    "_id": "67245a90184b29c9ef310112",
    "userId": "67245a90184b29c9ef310111",
    "ves": 25000,
    "sves": 5000,
    "gems": 100,
    "tokens": 500,
    "spins": 3,
    "createdAt": "2026-10-03T09:00:00.000Z",
    "updatedAt": "2026-10-03T09:00:00.000Z"
  }
}
```

---

### 3.2 Get Wallet Summary & Aggregates
- **Endpoint:** `GET /api/wallet/summary`
- **Authentication:** Bearer JWT required

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Wallet summary fetched successfully.",
  "data": {
    "wallet": {
      "ves": 25000,
      "sves": 5000,
      "gems": 100,
      "tokens": 500,
      "spins": 3
    },
    "metrics": {
      "totalCreditedVEs": 25000,
      "totalDebitedVEs": 0,
      "netVEsBalance": 25000
    }
  }
}
```

---

### 3.3 Get Transactions Ledger
- **Endpoint:** `GET /api/wallet/transactions`
- **Authentication:** Bearer JWT required
- **Query Params:**
  - `page`: default `1`
  - `limit`: default `20` (max 100)
  - `currency`: optional filter (`VEs`, `SVEs`, etc.)
  - `type`: optional filter (`CREDIT`, `DEBIT`)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Transactions fetched successfully.",
  "data": [
    {
      "transactionId": "TXN_M48K2_F92B",
      "userId": "67245a90184b29c9ef310111",
      "currency": "VEs",
      "type": "DEBIT",
      "amount": 2400,
      "balanceBefore": 25000,
      "balanceAfter": 22600,
      "source": "WITHDRAWAL",
      "referenceId": "WTH_M48K2_E18A",
      "status": "SUCCESS",
      "description": "Redemption for ₹10 Instant UPI Transfer",
      "createdAt": "2026-10-03T09:15:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 6,
    "totalPages": 1
  }
}
```

---

## 4. Internal / Admin Wallet Operations

### 4.1 Admin Credit Wallet
- **Endpoint:** `POST /api/wallet/credit`
- **Authentication:** Bearer JWT (Role: `ADMIN` required)

**Request Body:**
```json
{
  "userId": "67245a90184b29c9ef310111",
  "currency": "VEs",
  "amount": 500,
  "source": "ADMIN_CREDIT",
  "description": "Compensation bonus"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Wallet credited successfully.",
  "data": {
    "wallet": {
      "ves": 25500
    },
    "transaction": {
      "transactionId": "TXN_M48KX_A901",
      "type": "CREDIT",
      "amount": 500,
      "balanceBefore": 25000,
      "balanceAfter": 25500
    }
  }
}
```

---

### 4.2 Admin Debit Wallet
- **Endpoint:** `POST /api/wallet/debit`
- **Authentication:** Bearer JWT (Role: `ADMIN` required)

**Request Body:**
```json
{
  "userId": "67245a90184b29c9ef310111",
  "currency": "VEs",
  "amount": 200,
  "source": "ADMIN_DEBIT",
  "description": "Administrative correction"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Wallet debited successfully.",
  "data": {
    "wallet": {
      "ves": 25300
    },
    "transaction": {
      "transactionId": "TXN_M48KY_C302",
      "type": "DEBIT",
      "amount": 200,
      "balanceBefore": 25500,
      "balanceAfter": 25300
    }
  }
}
```

---

## 5. Payout Catalogue APIs

### 5.1 Get Supported Payout Methods
- **Endpoint:** `GET /api/payout/methods`
- **Authentication:** Bearer JWT required

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Payout methods fetched successfully.",
  "data": [
    {
      "method": "UPI",
      "name": "UPI (Unified Payments Interface)",
      "description": "Instant transfer to any VPA / UPI ID",
      "icon": "upi",
      "currency": "INR",
      "minimumPayout": 10,
      "active": true
    },
    {
      "method": "PAYPAL",
      "name": "PayPal International",
      "description": "Direct transfer to your verified PayPal email address",
      "icon": "paypal",
      "currency": "USD",
      "minimumPayout": 1,
      "active": true
    },
    {
      "method": "AMAZON_GIFT_CARD",
      "name": "Amazon India Gift Card",
      "currency": "INR",
      "minimumPayout": 50,
      "active": true
    },
    {
      "method": "GOOGLE_PLAY_GIFT_CARD",
      "name": "Google Play Gift Card",
      "currency": "INR",
      "minimumPayout": 10,
      "active": true
    }
  ]
}
```

---

### 5.2 Get Payout Options by Method
- **Endpoint:** `GET /api/payout/options/:method`
- **Authentication:** Bearer JWT required
- **Params:** `:method` (e.g. `UPI`, `PAYPAL`, `AMAZON_GIFT_CARD`, `GOOGLE_PLAY_GIFT_CARD`)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Payout options for UPI fetched successfully.",
  "data": [
    {
      "optionId": "upi_10",
      "method": "UPI",
      "name": "₹10 Instant UPI Transfer",
      "payoutValue": 10,
      "payoutCurrency": "INR",
      "requiredAmount": 2400,
      "currency": "VEs",
      "active": true
    },
    {
      "optionId": "upi_25",
      "method": "UPI",
      "name": "₹25 Instant UPI Transfer",
      "payoutValue": 25,
      "payoutCurrency": "INR",
      "requiredAmount": 5800,
      "currency": "VEs",
      "active": true
    },
    {
      "optionId": "upi_50",
      "method": "UPI",
      "name": "₹50 Instant UPI Transfer",
      "payoutValue": 50,
      "payoutCurrency": "INR",
      "requiredAmount": 10000,
      "currency": "VEs",
      "active": true
    },
    {
      "optionId": "upi_100",
      "method": "UPI",
      "name": "₹100 Instant UPI Transfer",
      "payoutValue": 100,
      "payoutCurrency": "INR",
      "requiredAmount": 19500,
      "currency": "VEs",
      "active": true
    }
  ]
}
```

---

## 6. Withdrawal APIs

### 6.1 Submit Withdrawal Request
- **Endpoint:** `POST /api/withdrawals`
- **Authentication:** Bearer JWT required
- **Headers:** `Idempotency-Key` (Optional, Recommended)
- **Security Rule:** The backend calculates `requiredAmount`, `currencyAmount`, and `payoutAmount` from MongoDB using `optionId`. Any amount parameter sent by the client is discarded.

**Request Body:**
```json
{
  "method": "UPI",
  "optionId": "upi_10",
  "payoutDetails": {
    "upiId": "demo@okhdfcbank"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Withdrawal request created successfully and is pending review.",
  "data": {
    "withdrawalId": "WTH_M48K2_E18A",
    "userId": "67245a90184b29c9ef310111",
    "method": "UPI",
    "optionId": "upi_10",
    "currency": "VEs",
    "currencyAmount": 2400,
    "payoutAmount": 10,
    "payoutCurrency": "INR",
    "payoutDetails": {
      "upiId": "demo@okhdfcbank",
      "maskedUpiId": "de***@okhdfcbank"
    },
    "status": "PENDING",
    "transactionId": "TXN_M48K2_F92B",
    "requestedAt": "2026-10-03T09:15:00.000Z"
  },
  "meta": {
    "transactionId": "TXN_M48K2_F92B",
    "remainingBalance": 22600
  }
}
```

**Idempotent Replay (200 OK):**
```json
{
  "success": true,
  "message": "This withdrawal request has already been submitted.",
  "data": {
    "withdrawalId": "WTH_M48K2_E18A",
    "status": "PENDING",
    "currencyAmount": 2400
  },
  "meta": {
    "isIdempotentReplay": true
  }
}
```

---

### 6.2 Get User Withdrawals
- **Endpoint:** `GET /api/withdrawals`
- **Authentication:** Bearer JWT required
- **Query Params:**
  - `page`: default `1`
  - `limit`: default `20`
  - `status`: optional filter (`PENDING`, `APPROVED`, `REJECTED`)

---

### 6.3 Get Withdrawal by ID
- **Endpoint:** `GET /api/withdrawals/:id`
- **Authentication:** Bearer JWT required
- **Security Rule:** Non-admin users cannot access other users' withdrawals. Attempting to view another user's withdrawal returns `403 FORBIDDEN`.

---

### 6.4 Admin Approve Withdrawal
- **Endpoint:** `PATCH /api/withdrawals/:id/approve`
- **Authentication:** Bearer JWT (Role: `ADMIN` required)

**Request Body:**
```json
{
  "reviewNote": "Dispatched via banking payment gateway (UTR: 90218491)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Withdrawal approved successfully.",
  "data": {
    "withdrawalId": "WTH_M48K2_E18A",
    "status": "APPROVED",
    "reviewNote": "Dispatched via banking payment gateway (UTR: 90218491)",
    "processedAt": "2026-10-03T09:20:00.000Z"
  }
}
```

---

### 6.5 Admin Reject Withdrawal & Trigger Safe Ledger Refund
- **Endpoint:** `PATCH /api/withdrawals/:id/reject`
- **Authentication:** Bearer JWT (Role: `ADMIN` required)
- **Financial Architecture:** Follows Option A strategy. Deduces VEs immediately upon withdrawal creation. When rejected, creates a new `CREDIT` ledger entry with source `WITHDRAWAL_REFUND` and refunds the exact amount back to the user's wallet. The original debit ledger entry is never mutated or deleted.

**Request Body:**
```json
{
  "reason": "Beneficiary UPI address belongs to closed bank account"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Withdrawal rejected and balance safely refunded to user.",
  "data": {
    "withdrawal": {
      "withdrawalId": "WTH_M48K2_E18A",
      "status": "REJECTED",
      "rejectionReason": "Beneficiary UPI address belongs to closed bank account"
    },
    "wallet": {
      "ves": 25000
    },
    "reversalTransaction": {
      "transactionId": "TXN_M48KZ_R990",
      "type": "CREDIT",
      "source": "WITHDRAWAL_REFUND",
      "amount": 2400,
      "balanceBefore": 22600,
      "balanceAfter": 25000,
      "referenceId": "WTH_M48K2_E18A"
    }
  }
}
```

---

## 7. Admin & Operations APIs (Protected: Role ADMIN)

All administrative endpoints are strictly guarded by JWT authentication and role-based access control (`Role: ADMIN`). Non-admin users are rejected with `403 FORBIDDEN`.

---

### 7.1 Dashboard Statistics & Circulation Overview
- **Endpoint:** `GET /api/admin/stats`
- **Authentication:** Bearer JWT (Role: `ADMIN`)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Admin overview stats fetched successfully.",
  "data": {
    "users": {
      "total": 120,
      "active": 118
    },
    "withdrawals": {
      "pending": 3,
      "approved": 42,
      "rejected": 5,
      "totalPendingVEs": 7200,
      "totalPendingPayoutINR": 150,
      "totalPendingPayoutUSD": 0,
      "totalApprovedVEs": 98400,
      "totalApprovedPayoutINR": 2100,
      "totalApprovedPayoutUSD": 25
    },
    "circulation": {
      "totalVEs": 2450000,
      "totalSVEs": 450000,
      "totalGems": 12500,
      "totalTokens": 62000,
      "totalSpins": 350,
      "avgVEs": 20416
    },
    "recentTransactions": [ ... ],
    "recentAuditLogs": [ ... ]
  }
}
```

---

### 7.2 User Management: List & Search Users
- **Endpoint:** `GET /api/admin/users`
- **Authentication:** Bearer JWT (Role: `ADMIN`)
- **Query Parameters:**
  - `page` (integer, default: 1)
  - `limit` (integer, default: 10, max: 100)
  - `search` (string: searches name, email, or user ID)
  - `status` (string: `ACTIVE`, `SUSPENDED`, `FLAGGED`)
  - `role` (string: `USER`, `ADMIN`)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Users fetched successfully.",
  "data": [
    {
      "_id": "67245a90184b29c9ef310111",
      "name": "Demo User",
      "email": "demo@veloop.test",
      "role": "USER",
      "accountStatus": "ACTIVE",
      "createdAt": "2026-10-03T09:00:00.000Z",
      "wallet": {
        "ves": 25000,
        "sves": 5000,
        "gems": 100,
        "tokens": 500,
        "spins": 3
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 120,
    "totalPages": 12
  }
}
```

---

### 7.3 User Management: View Individual User Profile & Wallet Details
- **Endpoint:** `GET /api/admin/users/:id`
- **Authentication:** Bearer JWT (Role: `ADMIN`)
- **URL Parameters:** `:id` (MongoDB ObjectId, email address, or name)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User details fetched successfully.",
  "data": {
    "user": {
      "_id": "67245a90184b29c9ef310111",
      "name": "Demo User",
      "email": "demo@veloop.test",
      "role": "USER",
      "accountStatus": "ACTIVE",
      "createdAt": "2026-10-03T09:00:00.000Z"
    },
    "wallet": {
      "ves": 25000,
      "sves": 5000,
      "gems": 100,
      "tokens": 500,
      "spins": 3
    },
    "metrics": {
      "totalTransactions": 14,
      "totalWithdrawals": 3,
      "totalCreditedVEs": 32000,
      "totalDebitedVEs": 7000,
      "withdrawalBreakdown": [
        { "_id": "APPROVED", "count": 2, "totalCurrencyAmount": 4800 },
        { "_id": "PENDING", "count": 1, "totalCurrencyAmount": 2400 }
      ]
    }
  }
}
```

---

### 7.4 User Management: View Paginated User Transaction Ledger
- **Endpoint:** `GET /api/admin/users/:id/transactions`
- **Authentication:** Bearer JWT (Role: `ADMIN`)
- **Query Parameters:** `page`, `limit`, `currency`, `type`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User transactions fetched successfully.",
  "data": [
    {
      "transactionId": "TXN_M48K2_B109",
      "userId": "67245a90184b29c9ef310111",
      "currency": "VEs",
      "type": "CREDIT",
      "amount": 500,
      "balanceBefore": 24500,
      "balanceAfter": 25000,
      "source": "AD_REWARD",
      "description": "Rewarded video ad view",
      "createdAt": "2026-10-03T10:15:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 14,
    "totalPages": 2
  }
}
```

---

### 7.5 User Management: View User Withdrawal Requests
- **Endpoint:** `GET /api/admin/users/:id/withdrawals`
- **Authentication:** Bearer JWT (Role: `ADMIN`)
- **Query Parameters:** `page`, `limit`, `status`

---

### 7.6 Withdrawal Management: Filtered Withdrawal Queue
- **Endpoint:** `GET /api/admin/withdrawals`
- **Authentication:** Bearer JWT (Role: `ADMIN`)
- **Query Parameters:**
  - `page` (default: 1)
  - `limit` (default: 10, max: 100)
  - `status` (`ALL`, `PENDING`, `PROCESSING`, `APPROVED`, `REJECTED`, `CANCELLED`)
  - `method` (`ALL`, `UPI`, `PAYPAL`, `AMAZON_GIFT_CARD`, `GOOGLE_PLAY_GIFT_CARD`)
  - `search` (withdrawalId, user name, or email)
  - `startDate` (YYYY-MM-DD)
  - `endDate` (YYYY-MM-DD)

Sensitive payout details are automatically masked for privacy (`maskedUpiId`, `maskedEmail`).

---

### 7.7 Withdrawal Management: Detailed Withdrawal View
- **Endpoint:** `GET /api/admin/withdrawals/:id`
- **Authentication:** Bearer JWT (Role: `ADMIN`)

Returns the withdrawal record, populated user details, linked `WalletTransaction` ledger record, and complete `AuditLog` timeline.

---

### 7.8 Security & Audit Logs
- **Endpoint:** `GET /api/admin/audit-logs`
- **Authentication:** Bearer JWT (Role: `ADMIN`)
- **Query Parameters:** `page`, `limit`, `action`, `targetType`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Audit logs fetched successfully.",
  "data": [
    {
      "auditId": "AUD_M48K2_9011",
      "action": "WITHDRAWAL_REJECTED",
      "targetType": "WITHDRAWAL",
      "referenceId": "WTH_M48K2_E18A",
      "actorId": { "name": "System Administrator", "email": "admin@veloop.test" },
      "targetUserId": { "name": "Demo User", "email": "demo@veloop.test" },
      "metadata": {
        "reason": "Invalid beneficiary UPI address",
        "refundedAmount": 2400,
        "currency": "VEs"
      },
      "createdAt": "2026-10-03T09:21:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 35,
    "totalPages": 2
  }
}
```

