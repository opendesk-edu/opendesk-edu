<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Nubus (IAM + Portal)

## Purpose

Identity and access management platform providing:
- **OpenLDAP** user directory (LDAP bind, synchronization, OU structure)
- **Keycloak** OIDC/SAML identity provider, OAuth2 token issuance
- **Portal** web frontend with application tiles, single-sign-on navigation
- **UMC** (Univention Management Console) administration interface (stripped-down)
- **UMS REST API** machine-readable user provisioning API
- **Provisioning service** OX Connector integration for OX AppSuite accounts

The Nubus stack is the foundation for all service authentication in openDesk Edu.

## Scope

This spec defines:
- ✅ **In scope**: Nubus IAM + Portal deployment, OpenLDAP user directory, Keycloak OIDC/SAML IdP, Portal web frontend with application tiles, UMC administration interface, UMS REST API for provisioning, OX Connector integration, SSO navigation hub
- ❌ **Out of scope**: Keycloak internal realm configuration (managed by Nubus upstream), OpenLDAP schema design (managed by Nubus upstream), SCIM provisioning (future, currently UMS REST), full UMC (only stripped-down admin interface)

## Non-Goals

- Keycloak internal realm configuration (managed via Nubus upstream)
- OpenLDAP schema design (managed by Nubus upstream)
- SCIM provisioning (planned future, currently via UMS REST API)
- Full UMC (only stripped-down admin interface for IAM admins)

## Requirements

### Requirement: Single portal sign-on

The platform SHALL provide a single web portal (`portal.opendesk.hrz.uni-marburg.de`)
displaying all authorized applications as clickable tiles after one Keycloak
authentication.

#### Scenario: Authorized applications displayed
- GIVEN a user with Keycloak roles: `opendesk-nextcloud`, `opendesk-openproject`, `opendesk-xwiki`
- WHEN the user accesses `https://portal.opendesk.hrz.uni-marburg.de`
- THEN the user is redirected to Keycloak OIDC login
- AND upon successful authentication, the portal displays tiles for:
  - Nextcloud (tile 1)
  - OpenProject (tile 2)
  - XWiki (tile 3)
- AND tiles for unauthorized applications are NOT displayed (>=role check per tile)

#### Scenario: Tile click navigates with silent login
- GIVEN a viewing the portal with all authorized tiles
- WHEN the user clicks the Nextcloud tile
- THEN the portal performs a redirect to `https://nextcloud.opendesk.hrz.uni-marburg.de`
- AND Nextcloud performs OIDC SAML SP-initiated SSO via Intercom Service
- AND the user lands in Nextcloud without re-authentication (silent login)

### Requirement: OpenLDAP directory structure

The OpenLDAP user directory SHALL be organized with the following OU
structure:

```
dc=opendesk,dc=opendesk-hrz,dc=uni-marburg,dc=de
├─ ou=users          (user accounts)
├─ ou=groups         (application authorization groups)
├─ ou=computers      (university devices, read-only for Nubus)
└─ cn=dns            (DNS zones, read-only for Nubus)
```

#### Scenario: User entry creation
- GIVEN a new user `alice` created via UMC or CMS integration
- WHEN the user entry is created in OpenLDAP
- THEN the DN is `uid=alice,ou=users,dc=opendesk,dc=opendesk-hrz,dc=uni-marburg,dc=de`
- AND the user has object classes: `inetOrgPerson`, `posixAccount`, `shadowAccount`
- AND the user has POSIX attributes: `uidNumber`, `gidNumber`, `homeDirectory`

#### Scenario: Group entry for app authorization
- GIVEN a service requiring LDAP group-based authorization (e.g., SOGo)
- WHEN the service is deployed
- THEN a group `cn=sogo-authorized,cn=groups,dc=opendesk,...` exists
- AND users with SOGo access are members of this group

### Requirement: Keycloak realm and client configuration

Keycloak SHALL run with realm `opendesk` and be pre-configured with all
service OIDC clients and Shibboleth SAML SP entities.

#### Scenario: OIDC client configuration
- GIVEN Keycloak realm `opendesk`
- THEN all OIDC clients are pre-configured (19 OIDC clients total):
  - `sogo` (client secret in `sogo-sogo-secrets:oidc-client-secret`)
  - `opendesk-opencloud`, `opendesk-matrix`, `opendesk-jitsi`, `opendesk-xwiki`, etc.
  - Each client has redirect URIs matching the service's callback URL

#### Scenario: SAML SP configuration
- GIVEN Keycloak realm `opendesk`
- THEN SAML SP entities are pre-configured for all SAML-using services:
  - Nextcloud (entity ID: `https://nextcloud.opendesk.hrz.uni-marburg.de`)
  - BigBlueButton, ILIAS, Moodle, BookStack, Zammad, OpenProject
  - All SPs trust the Keycloak SAML IdP (Shibboleth protocol)

### Requirement: UMS REST API for machine provisioning

The Nubus IAM stack SHALL expose the UMS REST API for machine-readable user
provisioning (used by OX Connector,.cms systems, etc.).

The UMS REST API path is `/univention/udm` and requires HTTP BASIC authentication.

#### Scenario: UMS endpoint for user creation
- GIVEN the UMS REST API at `https://portal.opendesk.hrz.uni-marburg.de/univention/udm`
- WHEN a provisioning service creates a user
- THEN it calls `POST /univention/udm/users/user/` with BASIC auth (UMS admin credentials)
- AND the request contains user attributes (uid, mail, displayName, password)
- AND OpenLDAP creates the user entry

#### Scenario: UMS endpoint for group modification
- GIVEN a provisioning service adding a user to a group
- THEN it calls `PUT /univention/udm/groups/group/$dn/members` with user DN
- AND the group membership is added/removed in OpenLDAP

## Component Reference

| Component | Purpose | Replicas | Storage |
|-----------|---------|----------|---------|
| Keycloak | OIDC/SAML IdP, user session management | 1 (StatefulSet) | RWO PVC PostgreSQL |
| OpenLDAP | User directory, LDAP bind | 1 (StatefulSet) | RWO PVC (10Gi) |
| PostgreSQL | Keycloak data, UMS REST DB | 1 (StatefulSet) | RWO PVC (10Gi) |
| Portal Frontend | Web UI, application tiles | 2 | None (client-side state) |
| UMC Backend | Admin interface (stripped-down) | 1 | None |
| UMS REST API | Machine provisioning endpoint | 1 | None |

## Security Context

| Component | RunAsUser | Capabilities | Seccomp |
|-----------|-----------|--------------|---------|
| Keycloak | 1001 (keycloak) | drop: ALL | RuntimeDefault |
| OpenLDAP | 100 (ldap) | drop: ALL | RuntimeDefault |
| PostgreSQL | 999 (postgres) | drop: ALL | RuntimeDefault |
| Portal Frontend | 1001 (nginx) | drop: ALL | RuntimeDefault |
| UMC Backend | 1001 (univention) | drop: ALL | RuntimeDefault |
| UMS REST API | 1001 (python) | drop: ALL | RuntimeDefault |

## Configuration Reference

| Property | Value |
|----------|-------|
| Keycloak realm | `opendesk` |
| Keycloak base URL | `https://keycloak.opendesk.hrz.uni-marburg.de` |
| Base domain | `opendesk.hrz.uni-marburg.de` |
| OpenLDAP base DN | `dc=opendesk,dc=opendesk-hrz,dc=uni-marburg,dc=de` |
| Login URL | `/portal` |
| OIDC clients | 19 pre-configured (sogo, opencloud, matrix, jitsi, xwiki, ...) |
| SAML SP entities | 8 pre-configured (Nextcloud, BBB, ILIAS, Moodle, BookStack, Zammad, OpenProject, ...) |
| UMS REST path | `/univention/udm` |
| Chart | `opendesk/nubus` (upstream: Univention GmbH) |

## Known Quirks

- **UMC stripped-down**: Only admin panel for IAM admins. Most UMC modules
  are disabled (university-only modules like DHCP, DNS are read-only).
- **OpenLDAP schema**: If you need custom schema extensions, modify via UMC only.
  Direct LDAP schema mods are NOT supported by Nubus upstream.
- **UMS REST API**: Existing credentials (UMS admin user: `ums-admin` / `ums-admin`).

## Depends On

PostgreSQL (Keycloak + UMS), Redis (optional for UMS), HAProxy Ingress

## Integrates With

All services via OIDC/SAML (Keycloak clients/SP entities), OX Connector (UMS REST API), IntercomService (portal tiles)

## SLO

**Tier**: Critical (foundation service for all authentication)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Availability** | 99.9% (43.2 min downtime/month max) | Uptime over 30-day window |
| **Latency (P95)** | <100ms (OIDC token issuance) | Prometheus histogram from Keycloak metrics |
| **Latency (P95)** | <50ms (LDAP bind) | OpenLDAP access log analysis |
| **Error Rate** | <0.1% (authentication failures) | Failed login ratio vs total attempts |
| **Portal Response** | <200ms (P95) | Portal frontend performance metrics |

**Alerts**:
- Keycloak OIDC endpoint error rate >1% for 5 minutes → P2 alert
- OpenLDAP response time >200ms for 10 minutes → P3 alert
- Portal tile navigation failures >5 in 1 minute → P3 alert
- UMS REST API 5xx errors >0.5% for 5 minutes → P2 alert

**Capacity**:
- 5,000 concurrent authenticated users (typical semester load)
- 50,000 OIDC token issuances per hour (peak: exam periods)
- 10,000 LDAP binds per hour (peak: morning login rush)

## Disaster Recovery

**Tier**: Critical (RPO: 5 min, RTO: 30 min)

**Backup Strategy**:
- **PostgreSQL** (Keycloak + UMS): Hourly incremental + daily full backup, PITR enabled
- **OpenLDAP**: Daily LDIF export + continuous replication to standby node
- **Configuration**: GitOps-managed via ArgoCD, all changes version-controlled

**Recovery Order**:
1. PostgreSQL cluster (Keycloak database) - 5 min
2. OpenLDAP replication - 3 min
3. Keycloak realm import - 2 min
4. UMS REST API deployment - 5 min
5. Portal frontend deployment - 2 min
6. Smoke tests (token issuance, LDAP bind) - 5 min
7. DNS/ingress verification - 3 min
8. User-facing service restoration - 5 min

**Critical Data**:
- Keycloak realm configuration (users, roles, clients, identity providers)
- OpenLDAP user directory (uid, mail, groups, organizational units)
- UMS provisioning state (last sync timestamps, queued operations)
- Portal configuration (application tiles, user preferences)

**Failure Scenarios**:
- **Keycloak DB corruption**: Restore from PITR, re-apply recent realm changes
- **OpenLDAP corruption**: Promote standby, redirect clients, rebuild primary
- **Complete cluster loss**: Redeploy from GitOps, restore from backups, re-provision from UCS source
