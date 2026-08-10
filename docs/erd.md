# Entity Relationship Diagram (ERD)

This document contains the foundational entity schema for the Mini ERP + CRM Operations Portal database managed via Prisma ORM on PostgreSQL.

```mermaid
erDiagram
    ROLE {
        string name PK "ADMIN | SALES | WAREHOUSE | ACCOUNTS"
    }

    USER {
        string id PK "uuid"
        string email UK
        string passwordHash
        string firstName
        string lastName
        Role role
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    REFRESH_TOKEN {
        string id PK "uuid"
        string userId FK
        string token UK
        datetime expiresAt
        boolean isRevoked
        datetime createdAt
    }

    AUDIT_LOG {
        string id PK "uuid"
        string userId FK
        string action
        string entity
        string entityId
        json details
        datetime createdAt
    }

    USER ||--o{ REFRESH_TOKEN : "owns"
    USER ||--o{ AUDIT_LOG : "triggers"
```

## Schema Entities Summary

1. **User**: Represents platform users associated with explicit access roles (`ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`).
2. **RefreshToken**: Secure persistence for rotation and revocation of JWT auth sessions.
3. **AuditLog**: Central tracking for administrative and critical ERP/CRM data mutations.
