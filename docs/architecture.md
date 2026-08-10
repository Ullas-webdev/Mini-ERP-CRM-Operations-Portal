# Mini ERP + CRM Operations Portal — Architecture Overview

## Overview

The Mini ERP + CRM Operations Portal is built as a strict full-stack TypeScript monorepo with high standard security, validation, observability, and modular component design.

```
                  +-----------------------+
                  |  React Frontend App   |
                  |  (Vite + Tailwind)    |
                  +-----------+-----------+
                              |
                              | REST / JSON
                              v
                  +-----------------------+
                  | Express Backend API   |
                  | (TypeScript + Pino)   |
                  +-----------+-----------+
                              |
                              | Prisma ORM
                              v
                  +-----------------------+
                  | PostgreSQL Database   |
                  +-----------------------+
```

## Core Backend Principles

1. **Strict TypeScript & Fail-Fast Configuration**:
   - `tsconfig.json` enforces `"strict": true`.
   - `src/config/env.ts` uses Zod to validate all environment variables on boot. Missing or invalid variables immediately halt process startup.

2. **Middleware Pipeline**:
   - `Helmet`: Sets HTTP security headers.
   - `Cors`: Restricts cross-origin requests to an explicit allowlist (no wildcard `*`).
   - `Pino Logger`: Logs request ID (`x-request-id`), user ID (if auth context exists), path, status, and execution latency (`latencyMs`).
   - `Rate Limiter`: `express-rate-limit` enforces global limits (100 req/15 min) and stricter limits on authentication routes (10 req/15 min).
   - `Zod Validation`: `validateRequest` parses and validates incoming `body`, `query`, and `params` schemas BEFORE route handlers run.
   - `Centralized Error Handler`: Formats all uncaught errors, standard AppErrors, and Zod errors into a unified shape:
     ```json
     {
       "success": false,
       "error": {
         "code": "VALIDATION_ERROR",
         "message": "Invalid request parameters",
         "details": [...]
       }
     }
     ```

3. **Prisma ORM & PostgreSQL**:
   - Database schemas defined in `backend/prisma/schema.prisma`.
   - Client managed via singleton pattern (`src/utils/prisma.ts`).

## Core Frontend Principles

1. **Role-Aware Security**:
   - `ProtectedRoute` verifies user authentication and matches active user roles (`ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`) against required view permissions.

2. **Server State & Networking**:
   - **TanStack Query (v5)** manages async server state with caching, background revalidation, and retry strategies.
   - **Axios Client**: Intercepts requests to inject JWT tokens and handles automatic 401 token refresh flow.

3. **Shared Design System**:
   - Consistent typography, dark slate design system, badges, standard inputs, cards, tables, and modal dialogs.
