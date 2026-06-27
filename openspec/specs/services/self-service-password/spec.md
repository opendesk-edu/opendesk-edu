<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Self-Service Password (LTB SSP)

## Purpose

LDAP password reset tool (LTB Self-Service Password) allowing users to change
their OpenLDAP directory password without helpdesk intervention. Users
authenticate with their current LDAP credentials and set a new password meeting
LDAP policy requirements.

## Scope

This spec defines:
- ✅ **In scope**: LTB Self-Service Password deployment, LDAP password reset via current credential authentication, LDAP policy enforcement, OpenLDAP directory integration, web-based password change interface
- ❌ **Out of scope**: Keycloak password reset (SSP changes LDAP password only), multi-factor authentication for password resets, password synchronization between LDAP and Keycloak

## Non-Goals

- Keycloak password reset (SSP changes LDAP password only — Keycloak
  credentials are NOT synced)
- Multi-factor authentication for password resets

## Requirements

### Requirement: Password reset via LDAP bind

Users SHALL reset their password by authenticating with the current password
(DIRECT LDAP bind to OpenLDAP) and providing a new password meeting LDAP
password policy.

#### Scenario: Successful password change
- GIVEN a user who knows their current LDAP password
- WHEN the user navigates to `ssp.opendesk.hrz.uni-marburg.de`
- AND enters the current password
- AND enters a new valid password (meets policy: 12+ chars, mixed case, number)
- THEN SSP performs an LDAP bind to verify the current password
- AND updates the LDAP password via LDAP modify operation (`userPassword`)
- AND the user can immediately authenticate with the new password via LDAP

#### Scenario: Password policy enforcement
- GIVEN a user attempting to set a weak password (e.g., "password123")
- WHEN the user submits the password change form
- THEN SSP applies LDAP password policy checks
- AND the change is rejected with an error message (e.g., "Password must be 12+ characters")
- AND the LDAP password is NOT updated

#### Scenario: Failed authentication (wrong current password)
- GIVEN a user entering an incorrect current password
- WHEN the bind attempt fails
- THEN the password change is denied
- AND no information about whether the account exists is revealed (username enumeration prevention)

### Requirement: LDAP integration

SSP SHALL directly bind to OpenLDAP at
`ldap://opendesk-ldap.opendesk.hrz.uni-marburg.de` and modify user entries
under `ou=users,dc=opendesk,dc=opendesk-hrz,dc=uni-marburg,dc=de`.

#### Scenario: LDAP bind for authentication
- GIVEN a user entering their username `student123` and current password
- WHEN SSP attempts a bind
- THEN the bind DN is `uid=student123,ou=users,dc=opendesk,dc=opendesk-hrz,dc=uni-marburg,dc=de`
- AND the password is the current password
- AND if the bind succeeds, authentication is verified

#### Scenario: LDAP modify for password update
- GIVEN a successfully authenticated user with a new password
- WHEN SSP performs an LDAP modify operation
- THEN the `userPassword` attribute is updated with the new password (hashed)
- AND the change is applied to the OpenLDAP directory

### Requirement: Keycloak credential independence

SSP changes the LDAP password ONLY. Keycloak credentials are NOT automatically
updated. Users must re-authenticate with the new password at next Keycloak login
(Keycloak validates credentials against OpenLDAP).

#### Scenario: LDAP password changed, Keycloak still works
- GIVEN a user changes their LDAP password via SSP
- AND the user next logs into a service using Keycloak SSO
- THEN Keycloak validates credentials against OpenLDAP (bind as user)
- AND the new password is accepted
- AND the user is logged in (-keycloak shares the same LDAP directory)

## Component Reference

| Component | Purpose | Replicas | Storage |
|-----------|---------|----------|---------|
| SSP Web | PHP-FPM backend (Apache) | 1 | None (stateless) |

## Security Context

| Component | RunAsUser | Capabilities | Seccomp |
|-----------|-----------|--------------|---------|
| SSP Web | 33 (www-data) | drop: ALL | RuntimeDefault |

## Configuration Reference

| Property | Value |
|----------|-------|
| LDAP server | `ldap://opendesk-ldap.opendesk.hrz.uni-marburg.de` |
| LDAP bind DN pattern | `uid={username},ou=users,dc=opendesk,dc=opendesk-hrz,dc=uni-marburg,dc=de` |
| Password policy | 12+ chars, mixed case, number, special character |
| Ingress host | `ssp.opendesk.hrz.uni-marburg.de` |
| Chart | `helmfile/charts/self-service-password/` (custom) |

## Known Quirks

- **No LDAP password sync to Keycloak**: SSP updates the LDAP password, but
  Keycloak validates credentials against LDAP on each login. No sync is required
  — the new password works immediately in Keycloak.
- **Direct LDAP integration**: SSP does NOT use Keycloak OIDC. It directly
  binds to OpenLDAP. This is intentional for password security (direct to source).

## Depends On

OpenLDAP (direct bind), HAProxy Ingress

## Integrates With

Nubus Portal (tile), Keycloak (validates against LDAP on each login)

## SLO

**Tier**: Standard (password reset tool, not critical for operations)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Availability** | 99.0% (7.2 hours downtime/month max) | Uptime over 30-day window |
| **Latency (P95)** | <300ms (page load) | Apache access log analysis |
| **Latency (P95)** | <500ms (password reset operation) | LDAP bind metrics |
| **Error Rate** | <1% (HTTP 5xx) | Apache access log analysis |
| **LDAP Bind Success** | >99% (current password validation) | LDAP access log |

**Alerts**:
- SSP 5xx error rate >2% for 10 minutes → P3 alert
- LDAP bind failures >5% for 5 minutes → P2 alert
- LDAP connection failures >3 in 5 minutes → P2 alert

**Capacity**:
- 500 concurrent users (password resets)
- 1,000 password resets per day (peak: start of semester)

## Disaster Recovery

**Tier**: Standard (RPO: N/A - stateless, RTO: 30 min)

**Backup Strategy**:
- **Configuration**: GitOps-managed
- **User data**: NONE (stateless service, all data in LDAP)

**Recovery Order**:
1. SSP application deployment - 5 min
2. LDAP bind configuration verification - 3 min
3. Smoke tests (password reset flow) - 5 min
4. User access restoration - 5 min

**Critical Data**:
- LDAP bind DN and password
- LDAP server configuration
- Password policy settings

**Failure Scenarios**:
- **LDAP misconfiguration**: Re-verify bind DN/password, test connectivity
- **Complete failure**: Redeploy from GitOps, verify LDAP integration (no data to restore)
