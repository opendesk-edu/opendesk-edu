<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Notes (im.press)

## Purpose

Collaborative note-taking application (im.press/Notes) with Django backend,
React frontend, and separate Y-Provider collaboration service. Features OIDC
authentication, PostgreSQL backend, S3 note attachments, AI integration
(configurable model/endpoint), real-time collaboration via WebSocket, and
Redis for Django cache.

Notes uses a split architecture: `impress-backend` (Django REST API + Celery),
`impress-frontend` (React SPA served by Nginx), and `impress-y-provider`
(real-time collaboration via Yjs/WebSocket).

## Scope

This spec defines:
- ✅ **In scope**: Notes (im.press) collaborative note-taking deployment, Django REST API backend, React frontend, Y-Provider real-time collaboration, OIDC authentication, PostgreSQL backend, S3 note attachments, AI integration (configurable model/endpoint), Redis cache
- ❌ **Out of scope**: Presentation slides (see CryptPad), knowledge management (see XWiki or BookStack), custom note templates, mobile app development

## Non-Goals

- Presentation slides (see CryptPad for diagram-only editing)
- Knowledge management (see XWiki or BookStack)

## Requirements

### Requirement: OIDC authentication

Notes SHALL authenticate users via OIDC with Keycloak client `opendesk-notes`.

#### Scenario: User logs in
- GIVEN a user accessing Notes
- WHEN the user logs in via OIDC
- THEN the backend validates the token with Keycloak
- AND scopes include `openid` and `opendesk-notes-scope`
- AND essential claims include `email`
- AND user's full name comes from `given_name,family_name`
- AND user's short name comes from `given_name`
- AND login failure redirects to Nubus Portal
- AND logout redirects to Nubus Portal

### Requirement: Note CRUD with AI integration

Notes SHALL support creating, editing, and deleting notes with optional
AI assistance.

#### Scenario: AI-assisted note editing
- GIVEN `ai.apiKey` and `ai.endpoint` configured
- WHEN a user uses AI features in the editor
- THEN the request goes to the configured AI model/endpoint
- AND AI results are rendered inline in the note

### Requirement: Real-time collaboration

Notes SHALL support real-time multi-user collaboration via the Y-Provider
service (Yjs protocol over WebSocket).

#### Scenario: Collaborative editing
- GIVEN two users editing the same note
- WHEN both users type simultaneously
- THEN changes are synchronized via Y-Provider WebSocket
- AND the WebSocket connection uses room-based affinity (`upstream-hash-by: "$arg_room"`)

### Requirement: Email notifications

Notes SHALL send email notifications for shared notes and mentions.

#### Scenario: Share notification
- GIVEN a user sharing a note
- WHEN the share is created
- THEN Notes sends an email via Postfix (port 25)
- AND the sender is `no-reply@<mailDomain>`
- AND the brand name is "openDesk"

### Requirement: S3 note attachments

Notes SHALL store note attachments on S3-compatible object storage (MinIO).

#### Scenario: Upload attachment
- GIVEN a user uploading a file to a note
- THEN the file is stored in the Notes S3 bucket
- AND the file is accessible via the note

### Requirement: Initial superuser

Notes SHALL create a Django superuser on first deployment.

#### Scenario: Superuser created
- GIVEN `django.createSuperuser: true`
- THEN a superuser is created with `superuserEmail` and `superuserPassword`
- AND the superuser has full admin access

### Requirement: Customization via ConfigMap

Notes SHALL support custom theme configuration via a ConfigMap.

#### Scenario: OpenDesk theme
- GIVEN `impress-customization` ConfigMap
- WHEN the frontend loads
- THEN `theme.json` is mounted into the frontend container
- AND `runtime-env.js` is mounted with environment variables
- AND the `openDesk` frontend theme is applied

## Depends On

Keycloak (OIDC, client: `opendesk-notes`), PostgreSQL (`notes` DB), MinIO/S3 (attachments), Redis (Django cache, database 7), Postfix (email), HAProxy Ingress, Nubus Portal (tile, login/logout redirect)

## Integrates With

Nubus Portal (tile, OIDC redirect), Postfix (email notifications), MinIO (note attachments)

## Component Reference

| Property | Value |
|---------|-------|
| Auth | OIDC (client: `opendesk-notes`) |
| Database | PostgreSQL (`notes` DB, `notes` user) |
| Storage | S3/MinIO (note attachments) |
| Cache | Redis (Django cache, database 7) |
| License | AGPL-3.0 |
| Config | `databases.notes.*`, `ai.*`, `helmfile/apps/notes/values.yaml.gotmpl` |
| Chart | Upstream `notes` (OCI: `opencode.de`) |
| Backend image | `runAsUser: 1001`, `readOnlyRootFilesystem: true` |

## SLO

**Tier**: Standard (collaborative note-taking, not critical for operations)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Availability** | 99.0% (7.2 hours downtime/month max) | Uptime over 30-day window |
| **Latency (P95)** | <400ms (note load) | Nginx access log analysis |
| **Latency (P95)** | <200ms (real-time sync) | Yjs WebSocket metrics |
| **Error Rate** | <1% (HTTP 5xx) | Nginx access log analysis |
| **AI Service Success** | >95% (when configured) | AI endpoint metrics |

**Alerts**:
- Notes 5xx error rate >2% for 10 minutes → P3 alert
- Database connection pool exhausted → P3 alert
- WebSocket connection failures >5% for 5 minutes → P2 alert
- OIDC authentication failures >5% for 5 minutes → P2 alert
- AI service failures >10% for 15 minutes → P3 alert (if AI enabled)

**Capacity**:
- 1,000 concurrent users
- 5,000 notes created per day
- 500 concurrent real-time collaboration sessions
- Database: 2 GB (typical), 20 GB (large institution)
- S3 attachments: 100 GB (typical), 1 TB (large institution)

## Disaster Recovery

**Tier**: Standard (RPO: 4 hours, RTO: 8 hours)

**Backup Strategy**:
- **Database** (PostgreSQL): Daily full backup
- **S3 attachments**: Daily snapshot, 30-day retention
- **Configuration**: GitOps-managed

**Recovery Order**:
1. PostgreSQL database restore - 15 min
2. S3 attachment verification - 10 min
3. Backend (Django) deployment - 10 min
4. Frontend (React) deployment - 5 min
5. Y-Provider collaboration service deployment - 5 min
6. OIDC client configuration verification - 5 min
7. Smoke tests (create note, edit, real-time sync) - 10 min
8. User access restoration - 15 min

**Critical Data**:
- Notes content and structure
- Real-time collaboration state (Yjs)
- User accounts and permissions
- AI integration configuration (if enabled)
- S3 attachments

**Failure Scenarios**:
- **Database corruption**: Restore from backup, verify note integrity
- **S3 attachment loss**: Restore from snapshot, verify checksums
- **Y-Provider failure**: Redeploy collaboration service, verify WebSocket connectivity
- **Complete failure**: Redeploy all 3 components from GitOps, restore DB + attachments, re-register OIDC client
| Frontend image | `runAsUser: 1000`, `readOnlyRootFilesystem: true` |
| Y-Provider image | `runAsUser: 1001`, `readOnlyRootFilesystem: true` |
| Replicas | `replicas.notesBackend` (backend), 1 (frontend), 1 (y-provider) |
| Django secret | `secrets.notes.djangoSecretKey` |
| Collaboration secret | `secrets.notes.collaborationSecret` |
| OpenDesk features | `FRONTEND_HOMEPAGE_FEATURE_ENABLED: False`, `FRONTEND_FOOTER_FEATURE_ENABLED: False` |
