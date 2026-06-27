<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SP-License-Identifier: Apache-2.0
-->

# Secret Derivation and Password Management

## Purpose

This spec defines how secrets SHALL be derived and managed across the openDesk Edu
platform, ensuring security, reproducibility, and auditability of credentials.

## Non-Goals

- Key rotation strategies (covered in Operations/Security specs)
- Secrets storage mechanism (vault, k8s secrets, env vars)
- Third-party credential management (external IdPs, SaaS services)

## Requirements

### Requirement: MASTER_PASSWORD Derivation Pattern

All service-specific passwords SHALL be derived from a single `MASTER_PASSWORD`
using a deterministic derivation function (`derivePassword`).

#### Scenario: PostgreSQL password derivation
- GIVEN a MASTER_PASSWORD base value (32+ characters, generated offline)
- WHEN `derivePassword("postgresql", MASTER_PASSWORD)` is called
- THEN the function returns a unique password for PostgreSQL
- AND the same input produces the same output (deterministic)
- AND different input salts produce different outputs (prevents reuse)

#### Scenario: Multiple service password derivation
- GIVEN a MASTER_PASSWORD base value
- WHEN passwords are derived for PostgreSQL, Redis, MinIO, LDAP with unique salts
- THEN each derived password is cryptographically unique
- AND no two services share the same password
- AND reversing the derivation is infeasible (one-way function)

### Requirement: Derivation Function Specification

The `derivePassword` function SHALL use PBKDF2-HMAC-SHA256 with at least 100,000
iterations and a service-specific salt.

#### Scenario: derivePassword implementation
- GIVEN a service name (salt) and MASTER_PASSWORD
- WHEN `derivePassword(service, MASTER_PASSWORD)` is executed
- THEN PBKDF2-HMAC-SHA256 with 100,000 iterations is used
- AND the service name is the salt (e.g., "postgresql", "redis", "minio")
- AND the output is base64-encoded
- AND the output length is at least 32 characters
- AND the output includes at least: lowercase, uppercase, digits, special chars

#### Scenario: Per-service salt uniqueness
- GIVEN `derivePassword("postgresql", MASTER_PASSWORD)` returns P1
- WHEN `derivePassword("redis", MASTER_PASSWORD)` returns R1
- THEN P1 ≠ R1 (cryptographically distinct)
- AND `derivePassword("postgresql", MASTER_PASSWORD)` still returns P1 (deterministic)

### Requirement: Service Credential Naming Convention

All derived passwords SHALL follow a consistent naming pattern in Kubernetes
secrets and Helm values.

#### Scenario: Kubernetes secret key naming
- GIVEN a service named "postgresql" with derived password
- WHEN a Kubernetes secret is created for PostgreSQL
- THEN the secret key follows `service_credential_type` pattern
- AND common key names include: `psql_password`, `mysql_password`, `redis_password`, `ldap_password`, `api_key`, `client_secret`

#### Scenario: Helm values reference pattern
- GIVEN a service requiring a password
- WHEN Helm values reference the password
- THEN values follow `service.credentialType.passwordRef` pattern
- OR values follow `service.credentialType.secretKeyRef` pattern for secret references

### Requirement: MASTER_PASSWORD Security

The `MASTER_PASSWORD` SHALL never be stored in plaintext in the repository,
configuration files, or logs.

#### Scenario: MASTER_PASSWORD offline generation
- GIVEN a secure environment (air-gapped machine or offline CI)
- WHEN MASTER_PASSWORD is generated using `openssl rand -base64 48`
- THEN the output is a 64-character base64 string
- AND the output is stored in an encrypted file or password manager
- AND the output is NEVER committed to git

#### Scenario: MASTER_PASSWORD injection at deploy time
- GIVEN a deployment pipeline with access to MASTER_PASSWORD
- WHEN the pipeline deploys openDesk Edu
- THEN MASTER_PASSWORD is injected via environment variable
- OR MASTER_PASSWORD is injected via CI secret
- AND MASTER_PASSWORD is NEVER written to disk unencrypted

### Requirement: Salt Strategy for Derivation

Each service SHALL use a unique, descriptive salt for password derivation
that identifies the service and credential type.

#### Scenario: Single-service single-credential
- GIVEN a service with one credential (e.g., PostgreSQL database password)
- WHEN deriving the password
- THEN the salt is the service name (e.g., "postgresql")

#### Scenario: Multi-service single-credential
- GIVEN multiple services sharing a credential (e.g., ILIAS and Moodle both using MariaDB)
- WHEN deriving the shared password
- THEN the salt includes both services (e.g., "ilias-moodle-mariadb")
- AND the same derived password is referenced by both services

#### Scenario: Single-service multi-credential
- GIVEN a service with multiple credentials (e.g., Redis password + port)
- WHEN deriving each credential
- THEN each derivation uses a unique salt (e.g., "redis-password", "redis-port")
- AND each credential is cryptographically distinct

### Requirement: Credential Rotation Planning

While credential rotation is outside the scope of this spec, derived passwords
SHALL support rotation without downtime.

#### Scenario: Rotation via new MASTER_PASSWORD
- GIVEN a new MASTER_PASSWORD2 replaces MASTER_PASSWORD1
- WHEN all derived passwords are re-derived with MASTER_PASSWORD2
- THEN services update their credentials in place
- AND graceful credential rotation is supported via rolling update
- AND零 downtime credential handoff is possible

#### Scenario: Per-service derivation context
- GIVEN a deployment script that derives passwords for all services
- WHEN the script is re-run with a new MASTER_PASSWORD
- THEN all service passwords update in one operation
- AND the script logs which services received new passwords
- AND the script allows selective service rotation (subset of services)

## Depends On

- Security spec (privilege separation, access controls)
- Operations spec (credential rotation, secret management)
- Deployment spec (helmfile configuration, CI/CD pipelines)

## Integrates With

**Platform Specs**:
- Security/Compliance Checklists (pre-deployment password verification)
- Operations (credential rotation runbooks, secret management)
- Deployment (helmfile configuration patterns)

**Service Specs**:
- All service specs reference derived passwords via `secret` references
- Nubus IAM (Keycloak, OpenLDAP password derivation)
- Database services (PostgreSQL, MariaDB password derivation)
- Storage services (MinIO S3, Redis password derivation)
- Mail services (Dovecot Postfix authentication credentials)

## Component Reference

| Property | Value |
|---------|-------|
| Derivation Function | PBKDF2-HMAC-SHA256 (100,000 iterations) |
| Salt Format | Service name or `service-credential-type` pattern |
| Output Encoding | Base64, 32+ characters |
| Output Character Set | lowercase + uppercase + digits + special chars |
| MASTER_PASSWORD Length | 48+ bytes (64 chars base64) |
| MASTER_PASSWORD Storage | Encrypted file CI secrets (spanner means) |
| Secret Key Pattern | `service_credential_type` (e.g., `psql_password`) |
| Helm Reference Pattern | `service.credentialType.passwordRef` or `secretKeyRef` |
| License | Apache-2.0 |
| Config | `scripts/derive-password.sh`, `helmfile/environments/*/secrets.yaml.gotmpl` |
| Chart | N/A (this is a methodology spec) |
| Health | N/A (deployment-time verification) |