<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# OpenProject-Nextcloud File Store Integration

## Purpose

Integration between OpenProject work packages and Nextcloud file storage,
enabling per-project file attachments that live in Nextcloud (not duplicated in
OpenProject). The trust relationship is bootstrapped automatically during
deployment via the `opendesk-openproject-bootstrap` job.

## Non-Goals

- Alternative file store integration (only OpenProject + Nextcloud)
- WebDAV direct access (files are managed via OpenProject UI)

## Requirements

### Requirement: Bootstrap trust relationship

The `opendesk-openproject-bootstrap` job SHALL configure the trust
relationship between OpenProject and Nextcloud automatically during deployment.

Bootstrap SHALL be idempotent — running multiple times SHALL NOT create duplicate
configurations or fail on existing trust relationships.

#### Scenario: Trust established on deploy
- GIVEN both OpenProject and Nextcloud deployed successfully
  - OpenProject: API endpoint `https://openproject.opendesk.hrz.uni-marburg.de`
  - Nextcloud: API endpoint `https://nextcloud.opendesk.hrz.uni-marburg.de`
- WHEN the `opendesk-openproject-bootstrap` job runs in the `opendesk` namespace
- THEN it configures the Nextcloud file store integration in OpenProject via API
  - POST `/api/v3/storages` with Nextcloud OAuth2 client credentials
  - Enables the `integration_openproject` Nextcloud app
  - Sets up OAuth2 token exchange
- AND the file store is available in OpenProject settings without manual configuration
- AND the job uses admin credentials:
  - Nextcloud: `secrets.nextcloud.adminPassword`
  - OpenProject: `secrets.openproject.apiAdminUsername` + `secrets.openproject.apiAdminPassword`
- AND the job exits with success (exit code 0)

#### Scenario: Bootstrap runs twice (idempotency)
- GIVEN the trust relationship already established from a previous deploy
- WHEN the bootstrap job runs again (e.g., cluster restart)
- THEN it queries OpenProject's `/api/v3/storages` endpoint
- AND detects the existing Nextcloud storage configuration
- AND exits successfully without modification (no duplicate storage created)

#### Scenario: Bootstrap after partial failure (retry logic)
- GIVEN a bootstrap job that failed midway (e.g., Nextcloud was not ready, returned 503)
- WHEN the Job is retried (k8s Job backoffLimit: 6)
- THEN it detects incomplete configuration (missing storage entry)
- AND completes the remaining configuration steps
- AND the trust relationship is fully established

### Requirement: File store activation per project

Project admins SHALL enable the Nextcloud file store integration at the project
level (NOT globally enforced).

#### Scenario: Project admin enables file store
- GIVEN the Nextcloud file store integration configured at cluster level
- AND a project admin accesses project settings in OpenProject
- WHEN the project admin enables "Nextcloud file storage" in project settings
- THEN project members can attach files from Nextcloud to work packages
- AND all attachments are stored in a dedicated Nextcloud folder:
  - `/Files/OpenProject/projects/{projectId}/`
- AND files remain stored in Nextcloud (NOT duplicated in OpenProject's storage)

### Requirement: File versioning via Nextcloud

Files attached from Nextcloud to OpenProject work packages SHALL retain
Nextcloud's version history.

#### Scenario: File version access
- GIVEN a Nextcloud file `contract.pdf` with 3 versions
  - v1: Initial draft
  - v2: Revision 1
  - v3: Final (current)
- AND the file is attached to an OpenProject work package
- WHEN a project member views the file attachment in OpenProject UI
- THEN all historical versions are accessible via Nextcloud's versioning API
  - OpenProject displays a version selector dropdown
  - Selecting a version opens the specific Nextcloud file version
- AND the file is NOT duplicated in OpenProject's storage

### Requirement: OAuth2 token refresh

OpenProject SHALL maintain a valid OAuth2 access token for Nextcloud, refreshing
it as needed via token refresh workflow.

#### Scenario: OAuth2 token expires and is refreshed
- GIVEN an initial OAuth2 access token with 1-hour expiry
- AND OpenProject continues using the file store integration
- WHEN the token expires (401 Unauthorized from Nextcloud)
- THEN OpenProject's OAuth2 client refreshes the token via Nextcloud's `/oauth/token` endpoint
- AND file store operations resume with the new token

## OpenProject API Contract: Nextcloud File Store

### POST /api/v3/storages (Create Storage)

Creates a Nextcloud storage integration.

**Request:**
```json
POST /api/v3/storages
Authorization: Bearer <opaque-admin-token>
Content-Type: application/vnd.api+json

{
  "data": {
    "type": "storages",
    "attributes": {
      "name": "Nextcloud",
      "origin": "nextcloud",
      "providerType": "nextcloud",
      "oauthClientId": "opendesk-openproject",
      "oauthClientSecret": "<opaque-client-secret>",
      "host": "https://nextcloud.opendesk.hrz.uni-marburg.de",
      "baseUrl": "https://nextcloud.opendesk.hrz.uni-marburg.de",
      "storageNonce": "<opaque-nonce-1234>"
    }
  }
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "1",
    "type": "storages",
    "attributes": {
      "name": "Nextcloud",
      "origin": "nextcloud",
      "host": "https://nextcloud.opendesk.hrz.uni-marburg.de"
    }
  }
}
```

### GET /api/v3/storages/{id}/files (List Files)

Lists files available from the Nextcloud storage for a project.

**Request:**
```json
GET /api/v3/storages/1/files?filter=[{ "field": "origin", "operator": "=", "values": ["nextcloud"] }]
Authorization: Bearer <opaque-admin-token>
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "123",
      "type": "files",
      "attributes": {
        "name": "contract.pdf",
        "mimeType": "application/pdf",
        "size": 2048576,
        "createdAt": "2026-06-27T10:00:00Z"
      }
    }
  ]
}
```

### POST /api/v3/projects/{id}/file_links (Attach File)

Links a Nextcloud file to an OpenProject work package.

**Request:**
```json
POST /api/v3/projects/456/work_packages/789/file_links
Authorization: Bearer <opaque-project-token>
Content-Type: application/vnd.api+json

{
  "data": {
    "type": "file_links",
    "relationships": {
      "container": {
        "data": { "type": "work_packages", "id": "789" }
      },
      "file": {
        "meta": { "origin": "nextcloud", "id": "123" }
      }
    }
  }
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "999",
    "type": "file_links",
    "attributes": {
      "createdAt": "2026-06-27T10:05:00Z"
    }
  }
}
```

## Nextcloud OAuth2 Configuration

### OAuth2 Client Registration

OpenProject registers as an OAuth2 client in Nextcloud:

| Property | Value |
|----------|-------|
| Client ID | `opendesk-openproject` |
| Redirect URI | `https://openproject.opendesk.hrz.uni-marburg.de/oauth/callback` |
| Grant Type | Authorization Code |
| Scope | `files AND read` |

OAuth2 client secret is stored in Kubernetes secret `opendesk-openproject-secrets`
under `nextcloudOauthClientSecret`.

## Bootstrap Job Reference

| Property | Value |
|----------|-------|
| Job name | `opendesk-openproject-bootstrap` |
| Namespace | `opendesk` |
| Image | `registry.opencode.de/opendesk/openproject-bootstrap` |
| Backoff limit | 6 (retry if OpenProject/Nextcloud not ready) |
| Completion mode | `NonIndexed` (runs multiple pods if multiple jobs) |
| Secret references |
  | Nextcloud admin: `secrets.nextcloud.adminPassword` |
  | OpenProject admin: `secrets.openproject.apiAdminUsername`, `secrets.openproject.apiAdminPassword` |
  | OAuth2 secret: `secrets.opendesk-openproject.nextcloudOauthClientSecret` |

## Depends On

- OpenProject (API v3, OAuth2 client registration)
- Nextcloud (`integration_openproject` app, OAuth2 server)
- Kubernetes secret `secrets.opendesk-openproject.nextcloudOauthClientSecret`

## Integrates With

- [Provisioning](./provisioning/spec.md) (user account linking)
- [API Contracts](./api-contracts/spec.md) (OAuth2 token management)
- `../_registry/interconnection-matrix.md` (DATA relationship: OpenProject → Nextcloud)
