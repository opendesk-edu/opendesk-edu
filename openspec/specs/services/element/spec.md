<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Element (Matrix/Synapse)

## Purpose

Secure instant messaging platform via Element Web frontend and Synapse
homeserver (Matrix protocol). Features OIDC authentication via Keycloak,
PostgreSQL backend, S3 media storage, Redis for appservice transactions,
TURN server for WebRTC calls, Intercom/OX AppSuite application services
for cross-app SSO, and Nordeck widgets for collaborative whiteboard,
polling, and video conferencing.

Synapse supports optional federation with external Matrix homeservers and
enterprise features including admin/audit bot application services and
LDAP group synchronization.

## Scope

This spec defines:
- ✅ **In scope**: Element Web + Synapse Matrix homeserver deployment, OIDC authentication via Keycloak, PostgreSQL backend, S3 media storage, Redis appservice transactions, TURN server for WebRTC, Intercom/OX AppSuite application services, Nordeck widgets (whiteboard, polling), optional federation, LDAP group sync
- ❌ **Out of scope**: Video conferencing (see BigBlueButton or Jitsi), file storage (delegated to Nextcloud/OpenCloud), native mobile apps (use Element mobile clients)

## Non-Goals

- Video conferencing (see `../bigbluebutton/spec.md` or `../jitsi/spec.md`)
- File storage (delegated to Nextcloud/OpenCloud)

## Requirements

### Requirement: OIDC authentication via Keycloak

Element SHALL authenticate users via OIDC with Keycloak client `opendesk-matrix`.
Synapse maps OIDC identity to Matrix user IDs.

#### Scenario: User logs in via Element
- GIVEN a user accessing Element
- WHEN the user logs in
- THEN Element redirects to Keycloak via OIDC
- AND the Matrix user ID is formatted as `@<opendesk_username>:<domain>`
- AND OIDC scopes include `openid` and `opendesk-matrix-scope`

#### Scenario: Logout redirect to portal
- GIVEN a user logging out of Element
- THEN the user is redirected to the Nubus Portal
- AND the Keycloak session is terminated via OIDC RP-initiated logout

### Requirement: Real-time messaging

Users SHALL send and receive messages in real-time via the Matrix protocol.

#### Scenario: Message delivery
- GIVEN two authenticated users in a room
- WHEN user A sends a message
- THEN the message is delivered through Synapse to user B via /sync
- AND E2EE is enabled (`endToEndEncryption: true`)

### Requirement: WebRTC audio/video calling

Users SHALL make 1:1 and group audio/video calls via WebRTC through Element,
using TURN servers for NAT traversal.

#### Scenario: 1:1 video call with TURN relay
- GIVEN two users behind NAT
- WHEN one user initiates a video call
- THEN WebRTC is established
- AND if direct connection fails, TURN relay is used
- AND TURN shared secret is configured for authentication

### Requirement: Intercom application service

Synapse SHALL integrate the Intercom Service as an application service for
cross-app SSO and navigation.

#### Scenario: Intercom silent login via Synapse
- GIVEN the Intercom application service configured in Synapse
- WHEN a consuming service (OX, Nextcloud) performs a silent login
- THEN the Intercom AS token authenticates the request to Synapse
- AND navigation JSON is served via the Intercom endpoint

### Requirement: OX AppSuite application service

Synapse SHALL integrate OX AppSuite as an application service for
cross-app messaging and notification delivery.

#### Scenario: OX AppSuite Matrix integration
- GIVEN the OX AppSuite application service configured
- THEN OX can send and receive Matrix messages on behalf of users
- AND the OX sender localpart is `ox-appsuite`

### Requirement: Nordeck widgets

Element SHALL support Nordeck collaborative widgets: NeoBoard (whiteboard),
NeoChoice (polls), and NeoDateFix (meeting scheduling).

#### Scenario: NeoBoard whiteboard in room
- GIVEN a room with the NeoBoard widget configured
- WHEN users open the widget
- THEN collaborative whiteboard is available
- AND widget capabilities are pre-approved for the specific widget URL
- AND preloading is enabled for faster widget loading

#### Scenario: NeoChoice poll in room
- GIVEN a room with the NeoChoice widget
- WHEN a user creates a poll
- THEN all room members can vote
- AND poll results are displayed in real-time

### Requirement: Rate limiting

Synapse SHALL enforce rate limits on login, message, and media operations
to prevent abuse, with elevated limits for widget-heavy usage.

#### Scenario: Login rate limiting
- GIVEN the `rc_login` configuration
- THEN login attempts are limited to 2/second with burst of 8
- AND address-based rate limit is 2/second with burst of 12

#### Scenario: Message rate limiting (elevated for widgets)
- GIVEN `rc_message` configuration
- THEN messages are limited to 5/second with burst of 25
- AND media creation is limited to 20/second with burst of 100
- AND Intercom and OX AS pipes are NOT rate-limited (`rate_limited: false`)

### Requirement: User directory search

Synapse SHALL allow all-authenticated-users to search the user directory.

#### Scenario: User searches for other users
- GIVEN `user_directory.search_all_users: true`
- WHEN a user searches the directory
- THEN all platform users are searchable by display name or Matrix ID

### Requirement: Federation (optional)

Synapse MAY support federation with external Matrix homeservers.

#### Scenario: Federation configuration
- GIVEN `federation.enabled: true`
- THEN Synapse listens on a federation ingress
- AND only domains in `domainAllowList` can federate
- AND federation uses a separate TLS certificate (`opendesk-certificates-synapse-tls`)

## Depends On

Keycloak (OIDC, client: `opendesk-matrix`), PostgreSQL (`synapse` DB), MinIO/S3 (media), Redis (appservice transactions), Postfix (email notifications), TURN server, HAProxy Ingress, Intercom Service, Nubus Portal (tile, logout redirect)

## Integrates With

Intercom Service (silent login, navigation, AS pipe), OX AppSuite (messaging AS pipe), Nubus Portal (tile, welcome bot, central navigation CSS theme), Nextcloud (file sharing via Intercom), Nordeck widgets (whiteboard, polls, meeting scheduler)

## Component Reference

| Property | Value |
|---------|-------|
| Auth | OIDC (client: `opendesk-matrix`) |
| Database | PostgreSQL (`synapse` DB, `synapse` user, RWO PVC) |
| Storage | S3/MinIO (media files, attachments) |
| Cache | Redis (appservice transactions) |
| License | AGPL-3.0 (Element) / Apache-2.0 (Synapse) |
| Config | `databases.synapse.*`, `secrets.intercom.*`, `helmfile/apps/element/values-synapse.yaml.gotmpl` |
| Chart | Upstream Element + Synapse (OCI: `opencode.de`) |
| Synapse image | `runAsUser: 10991`, `runAsGroup: 10991`, `readOnlyRootFilesystem: true` |
| Element image | `runAsUser: 101`, `runAsGroup: 101`, `readOnlyRootFilesystem: true` |
| Matrix domain | `global.matrixDomain` or `global.domain` |
| Replicas | `replicas.synapse` (1 default), `replicas.element` |
| App Services | Intercom (`intercom-service`), OX AppSuite (`ox-appsuite`) |
| Enterprise AS | AdminBot, AuditBot (pipes on port 9995), GroupSync (port 10010) |
| Presence | Configurable (`functional.dataProtection.matrixPresence.enabled`) |
| Theme | `title: "Chat - <productName>"`, primary color CSS variables |
| Security | Both: `capabilities: drop ALL`, `seccompProfile: RuntimeDefault` |

## SLO

**Tier**: High (important communication tool, but not critical)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Availability** | 99.5% (3.6 hours downtime/month max) | Uptime over 30-day window |
| **Latency (P95)** | <300ms (message delivery) | Synapse metrics |
| **Connection Success** | >98% (WebSocket) | Synapse connection logs |
| **Message Delivery** | >99% (within 5 seconds) | Federation/send queue metrics |
| **Federation Success** | >95% (external homeservers) | Federation transaction logs |

**Alerts**:
- Synapse 5xx error rate >1% for 10 minutes → P2 alert
- WebSocket connection failures >5% for 5 minutes → P1 alert
- Message delivery delay >10s for 5 minutes → P2 alert
- Federation failures >10% for 15 minutes → P3 alert
- TURN server connection failures >3 in 5 minutes → P2 alert

**Capacity**:
- 5,000 concurrent connected users
- 50,000 messages per day (typical)
- 1,000 concurrent voice/video calls (TURN)
- Database: 20 GB (typical), 200 GB (large institution)
- S3 media storage: 500 GB (typical), 5 TB (large institution)

## Disaster Recovery

**Tier**: High (RPO: 1 hour, RTO: 2 hours)

**Backup Strategy**:
- **Database** (PostgreSQL): Hourly incremental + daily full backup, PITR enabled
- **S3 media storage**: Daily snapshot, 30-day retention
- **Configuration**: GitOps-managed (homeserver.yaml, well-known delegation)
- **Signing keys**: Encrypted backup with quarterly rotation

**Recovery Order**:
1. PostgreSQL database restore - 20 min
2. S3 media storage verification - 15 min
3. Synapse homeserver deployment - 15 min
4. Element Web frontend deployment - 5 min
5. OIDC client configuration verification - 5 min
6. Federation signing key verification - 5 min
7. Well-known delegation DNS check - 3 min
8. TURN server integration test - 5 min
9. Smoke tests (login, send message, join room) - 10 min
10. User access restoration - 10 min

**Critical Data**:
- User accounts and device lists
- Room memberships and metadata
- Message history (encrypted)
- Media uploads (S3)
- Signing keys (critical for federation trust)

**Failure Scenarios**:
- **Database corruption**: Restore from PITR, verify message history integrity
- **S3 media loss**: Restore from snapshot, verify media checksums
- **Signing key loss**: CRITICAL - federation trust broken, coordinate with other homeservers
- **Complete failure**: Redeploy from GitOps, restore DB + media, re-register OIDC client, verify federation
