# Authentication & Access Control Architecture Design

This document details the architectural decisions, security choices, and audit traceability design implemented in the Mini ERP + CRM Operations Portal.

## 1. Dual-Token Architecture (Access vs. Refresh Tokens)

### Implementation
- **Access Token**: Short-lived (15 minutes), signed with `JWT_SECRET`, transmitted in the `Authorization: Bearer <token>` header.
- **Refresh Token**: Long-lived (7 days), signed with `JWT_REFRESH_SECRET`, stored in the database (`RefreshToken` table) and set as an `httpOnly`, `SameSite=Lax` cookie.

### Rationale
- **Mitigating XSS Risks**: By storing the 7-day refresh token in an `httpOnly` cookie, malicious JavaScript injected via XSS cannot extract long-term session credentials.
- **Token Rotation**: On calling `POST /api/v1/auth/refresh`, the server revokes the old refresh token (`isRevoked = true`) and issues a new pair. If a stolen refresh token is replayed after rotation, the server detects the revoked status and invalidates all session tokens.

---

## 2. Automated Account Lockout Policy

### Implementation
- On `POST /api/v1/auth/login`, invalid password attempts increment `user.failedLoginAttempts`.
- Upon reaching **5 consecutive failed attempts**, `lockedUntil` is set to `now + 15 minutes` (`423 Locked`).
- On successful password verification, `failedLoginAttempts` resets to `0` and `lockedUntil` is cleared.

### Rationale
- **Brute-Force & Credential Stuffing Prevention**: Rate-limiting combined with a 15-minute lock window throttles automated dictionary attacks against user passwords.
- **Auditable Security Triggers**: Every failed attempt logs a `LOGIN_FAILED` entry to `AuditLog` capturing the client's IP address.

---

## 3. Declarative RBAC Middleware (`authorize(...roles)`)

### Implementation
- Endpoint routes are protected using declarative guards:
  ```typescript
  router.get('/audit-logs', authenticate, authorize('ADMIN'), getAuditLogs);
  ```
- Frontend routes use matching `<ProtectedRoute allowedRoles={['ADMIN']} />` boundaries and role-filtered navigation menus.

### Rationale
- **Avoids Controller Pollution**: Eliminates repeated `if (user.role !== 'ADMIN')` conditionals inside business controller logic, maintaining Single Responsibility Principle across modules.

---

## 4. Automated Audit Traceability (`auditLog` Wrapper)

### Implementation
- `auditLog(action, entityType)` middleware intercepts HTTP responses:
  - Captures `beforeState` for existing entity records prior to mutation.
  - Intercepts response output for post-mutation `afterState`.
  - Asynchronously inserts a structured entry into `AuditLog` (`userId`, `action`, `entityType`, `entityId`, `beforeState`, `afterState`, `ipAddress`).

### Rationale
- **Complete Traceability & Compliance**: Enterprise ERP systems require a tamper-evident audit trail for financial, inventory, and access mutations.
- **Zero-Boilerplate Integration**: Developers wrap route declarations with `auditLog('CUSTOMER_UPDATED', 'CUSTOMER')` without polluting domain controllers.
