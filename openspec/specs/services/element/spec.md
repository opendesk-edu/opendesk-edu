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
