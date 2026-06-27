<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Etherpad

## Purpose

Real-time collaborative document editor for meeting notes, workshops, and live
editing sessions. Uses operational transform (OT) algorithm for conflict-free
concurrent editing. Authenticated via OIDC with embedded PostgreSQL for pad
metadata and content.

## Scope

This spec defines:
- ✅ **In scope**: Real-time collaborative text editing via OT algorithm, OIDC authentication, PostgreSQL backend for pad metadata/content, Markdown support with limited formatting
- ❌ **Out of scope**: Alternative collaborative editing platforms (CryptPad, HedgeDoc, etc.), rich text editing beyond Markdown (Etherpad supports limited formatting), version control (pad history only)

## Non-Goals

- Alternative collaborative editing platforms (use CryptPad, HedgeDoc, etc.)
- Rich text editing beyond Markdown (Etherpad supports limited formatting)

## Requirements

### Requirement: Real-time collaborative editing via OT

Etherpad SHALL use the Operational Transform (OT) algorithm to enable multiple
users to edit the same pad simultaneously without conflicts.

#### Scenario: Concurrent editing
- GIVEN two authenticated users accessing the same pad URL (`/p/notes-xyz`)
- WHEN both users type simultaneously
- THEN changes appear in real-time via WebSocket (Etherpad's Node.js backend)
- AND the OT algorithm merges edits without conflict
- AND no manual conflict resolution is needed by users

#### Scenario: Cursor tracking
- GIVEN multiple users in a pad
- WHEN users move their cursors
- THEN cursor positions are shown in real-time to all users
- AND user names are displayed near each cursor

### Requirement: OIDC authentication via Keycloak

Etherpad SHALL authenticate via OIDC with Keycloak (using the `ep_etherpad_oauth2`
or similar plugin).

#### Scenario: OIDC login
- GIVEN a user navigating to Etherpad
- WHEN Etherpad's OAuth2 plugin redirects to Keycloak OIDC
- AND the user authenticates with Keycloak SSO
- THEN Keycloak returns an OIDC access token
- AND Etherpad creates a local user in PostgreSQL (if first login)
- AND the user is logged in and pads are attributed to the user

#### Scenario: Anonymous read-only access (optional)
- GIVEN an anonymous user accessing a pad (no authentication)
- WHEN pad is configured for public read
- THEN the user can view the pad read-only
- AND cannot edit without authentication

### Requirement: Persistent content storage in PostgreSQL

Etherpad SHALL store all pad content, metadata, and revisions in PostgreSQL (NOT
blob storage).

Pad content is stored as plain text (Markdown-ish) in PostgreSQL.

#### Scenario: Pad content persistence
- GIVEN an Etherpad deployment with PostgreSQL
- WHEN a user creates a pad and types content
- THEN content is stored in the `etherpad` PostgreSQL DB
- AND persists across pod restarts, upgrades, and database migrations
- AND pad revisions are kept for version history

### Requirement: Pad creation and sharing

Etherpad users SHALL create new pads with auto-generated URLs (`/p/generated-id`)
and share them via URL.

#### Scenario: Pad creation
- GIVEN an authenticated user
- WHEN the user creates a new pad
- THEN a unique pad ID is generated
- AND the pad URL is `/p/{pad-id}` (e.g., `/p/notes-abc123`)
- AND the pad is initially read/write by the creator (permission model is per-pad)

#### Scenario: Pad sharing
- GIVEN an existing pad
- WHEN the creator shares the pad URL (`/p/notes-abc123`)
- THEN any authenticated user with the URL can access the pad
- AND pad permissions are limited to read/write (no granular ACL in open-source Etherpad)

### Requirement: Markdown formatting

Etherpad SHALL support limited Markdown-style formatting:
- Headings (`# H1`, `## H2`)
- Bold (`**bold**`), italic (`*italic*`)
- Lists (ordered `1.`, unordered `-`)
- Links (`[text](url)`)

#### Scenario: Rich text editing
- GIVEN a user editing a pad
- WHEN the user formats text using Etherpad's toolbar
- THEN Markdown-style formatting is applied (stored in PostgreSQL)
- AND rendered in the pad editor

## Component Reference

| Component | Purpose | Replicas | Storage |
|-----------|---------|----------|---------|
| Etherpad Web | Node.js backend (Express) + frontend | 1 | RWO PVC (PostgreSQL data) |
| PostgreSQL | Pad content and metadata storage | 1 (StatefulSet) | RWO PVC (10Gi) |
| Chart | `helmfile/charts/etherpad/` (local chart) |

## Security Context

| Component | RunAsUser | Capabilities | Seccomp |
|-----------|-----------|--------------|---------|
| Etherpad Web | 1001 (node) | drop: ALL | RuntimeDefault |
| PostgreSQL | 999 (postgres) | drop: ALL | RuntimeDefault |

## Configuration Reference

| Property | Value |
|----------|-------|
| OIDC client | `opendesk-etherpad` (if using OAuth2 plugin) |
| OIDC scope | `openid, email, profile` |
| PostgreSQL database | `etherpad` |
| PostgreSQL user | `etherpad` |
| PVC size | 10Gi (postgres persistence) |
| Storage class | `ceph-rbd-ssd` |
| Web port | 9001 |

## Known Quirks

- **Embedded PostgreSQL**: The Etherpad chart includes an embedded PostgreSQL
  StatefulSet (NOT the shared PostgreSQL cluster). This is self-contained and
  does not connect to the central `postgres` service.
- **Permission model**: Open-source Etherpad has limited permission control
  (read/write per pad, no user-based ACL). For more granular permissions,
  consider CryptPad or HedgeDoc.

## Depends On

Keycloak (OIDC), PostgreSQL (embedded), HAProxy Ingress

## Integrates With

Nubus Portal (tile)
