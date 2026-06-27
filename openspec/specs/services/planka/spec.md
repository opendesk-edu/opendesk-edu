<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Planka

## Purpose

Kanban project management boards for student project management, research
planning, and task tracking. Features OIDC authentication (Keycloak client
`planka`), PostgreSQL backend, drag-and-drop board interface, card labels/due
dates, and LTI integration (for LMS embedding).

## Non-Goals

- Alternative project management tools (use OpenProject, Trello, etc.)
- Agile methodology enforcement (use additional tools for Scrum/Sprint planning)

## Requirements

### Requirement: Kanban board → List → Card hierarchy

Planka content SHALL be organized in a three-level hierarchy:
- **Boards** (top level, per project or team)
- **Lists** (within a board, status columns: To Do, In Progress, Done)
- **Cards** (within a list, task items)

#### Scenario: User manages project board
- GIVEN an authenticated user with Planka access (role `planka-user`)
- WHEN the user navigates to `planka.opendesk.hrz.uni-marburg.de`
- THEN the user is authenticated via OIDC (client: `planka`, realm: `opendesk`)
- AND can create boards, add lists (e.g., "To Do", "In Progress", "Done")
- AND can create cards in lists with drag-and-drop
- AND cards move between lists when dragged

### Requirement: Card details and metadata

Planka cards SHALL support rich metadata including labels, due dates, descriptions,
checklists, comments, and attachments.

#### Scenario: Card metadata
- GIVEN a user creating a card in the "To Do" list
- WHEN the user edits the card
- THEN the card supports:
  - Labels (color-coded tags, e.g., "High Priority", "Research")
  - Due dates (with overdue highlighting)
  - Description (rich text or Markdown)
  - Checklists (subtask items, checked off as completed)
  - Comments (team collaboration)
  - Attachments (file uploads, stored in PostgreSQL as BLOB)

### Requirement: OIDC authentication via Keycloak

Planka SHALL authenticate via OIDC with Keycloak client `planka` in realm
`opendesk`.

The OIDC client secret is stored in Kubernetes secret `planka-planka-secrets`
under key `planka-oidc-client-secret`.

First-time login SHALL auto-provision a user in Planka's PostgreSQL database.

#### Scenario: OIDC login
- GIVEN a user navigating to Planka
- WHEN Planka redirects to Keycloak OIDC (`/oauth/authorize`)
- AND the user authenticates with Keycloak SSO
- THEN Keycloak returns an OIDC token to Planka
- AND Planka validates the token
- AND creates a local user in PostgreSQL (if first login)
- AND the user is logged in

#### Scenario: Token refresh
- GIVEN a Planka session with an expired OIDC access token
- WHEN the user performs an action
- THEN Planka refreshes the token via Keycloak's `/oauth/token` endpoint
- AND the session resumes without re-auth

### Requirement: Persistent PostgreSQL storage

Planka SHALL store all content (boards, lists, cards, attachments, audit logs) in
PostgreSQL (NOT blob storage).

Attachments are stored as PostgreSQL BLOB objects (acceptable for small files
<10MB).

#### Scenario: Content persistence
- GIVEN a Planka deployment with PostgreSQL
- WHEN a user updates a card description
- THEN the change is persisted in the `planka` PostgreSQL DB
- AND persists across pod restarts, upgrades, and database migrations

### Requirement: LTI integration (optional)

Planka SHALL support LTI (Learning Tools Interoperability) for embedding boards
in LMS platforms (ILIAS, Moodle).

This is optional and requires LTI configuration.

#### Scenario: LTI launch from LMS
- GIVEN a student in an ILIAS course with a Planka board embedded
- WHEN the student clicks the Planka LTI tool link
- THEN ILIAS initiates an LTI launch request to Planka
- AND Planka validates the LTI consumer key/secret
- AND the student is logged in as an LTI user (shared LTI users, not mapped per student)
- AND the student can view the embedded board

## Component Reference

| Component | Purpose | Replicas | Storage |
|-----------|---------|----------|---------|
| Planka Web | Node.js backend (Express) | 1 | RWO PVC (PostgreSQL data) |
| PostgreSQL | Content storage | 1 (StatefulSet) | RWO PVC (1Gi) |

## Security Context

| Component | RunAsUser | Capabilities | Seccomp |
|-----------|-----------|--------------|---------|
| Planka Web | 1001 (node) | drop: ALL | RuntimeDefault |
| PostgreSQL | 999 (postgres) | drop: ALL | RuntimeDefault |

## Configuration Reference

| Property | Value |
|----------|-------|
| OIDC client | `planka` |
| OIDC scope | `openid, email, profile` |
| OIDC client secret | `planka-planka-secrets:planka-oidc-client-secret` |
| PostgreSQL database | `planka` |
| PostgreSQL user | `planka` |
| PVC size | 1Gi (planka persistence) |
| Storage class | `ceph-rbd-ssd` |

## Known Quirks

- **Attachments in PostgreSQL**: Planka stores uploaded files as BLOB objects in
  PostgreSQL (not in S3). This is acceptable for small attachments (<10MB).
- **LTI shared users**: LTI launches create a single shared LTI user in Planka,
  not per-student accounts. This is a limitation of LTI v1.x integration.

## Depends On

**Authentication**:
- Keycloak OIDC (`https://keycloak.opendesk.hrz.uni-marburg.de/auth/realms/opendek/.well-known/openid-configuration`, client: `planka`, secret: `planka-oidc-client-secret` from `planka-planka-secrets` secret)

**Data Store**:
- PostgreSQL (`planka` DB, host: `postgresql.opendesk.svc.cluster.local:5432`, user: `planka_user`, password: `secret.planka.psql_password`)
- RWO PVC: `planka-postgres-data` (1Gi, storage class: `ceph-rbd-ssd`, excluded from k8up schedule)

**Infrastructure**:
- HAProxy Ingress (HAProxy route, ingress class: `haproxy`, host: `planka.opendesk.hrz.uni-marburg.de`)

## Integrates With

**API Contracts**:
- [Keycloak OIDC Token](../../integrations/api-contracts/spec.md#contract-keycloak-oidc-token-endpoint) — authentication, user sync

**Services**:
- Nubus Portal (tile: display, url: `https://planka.opendesk.hrz.uni-marburg.de/`, icon, description, role mapping: `planka-user` group in Keycloak)
- ILIAS/Moodle (LTI v1.x integration for board attachments, optional, consumer key: `planka-lti`, secret: `secret.planka.lti_secret`)
