<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# OpenCloud (Alternative to Nextcloud)

## Purpose

Lightweight, CS3-native file sharing platform optimized for education
use cases. Provides per-course and per-student file shares, WebDAV access,
OIDC auto-provisioning with role-based access control, and integration with
OX AppSuite and Nubus Portal for document editing workflows.

OpenCloud is built on a microservices architecture with a Graph service for
metadata, CS3 (Cloud Storage Synchronization), WOPI for office document
collaboration, and an event system for notifications and audit logging.

## Scope

This spec defines:
- ✅ **In scope**: OpenCloud deployment (educational use case alternative), per-course/per-student file shares, WebDAV access, OIDC auto-provisioning with RBAC, OX AppSuite and Nubus Portal integration, Graph service metadata, CS3 storage sync, WOPI office collaboration
- ❌ **Out of scope**: Nextcloud-specific features (OCID, Talk, Draw.io, Collectives), desktop client application (web-only interface), general-purpose file sharing beyond education

## Non-Goals

- Nextcloud-specific features (OCID integration, Talk, Draw.io, Collectives — see `../nextcloud/spec.md`)
- Desktop client application (web-only interface)

## Requirements

### Requirement: Mutual exclusivity with Nextcloud

OpenCloud and Nextcloud SHALL NOT be deployed simultaneously. Exactly one
file sharing service SHALL be active per platform.

#### Scenario: Only one file service active
- GIVEN both OpenCloud and Nextcloud charts available
- WHEN the environment configuration is applied
- THEN exactly one file sharing service is deployed
- AND the inactive service is NOT included in the helmfile release list
- AND shared S3 buckets are used by only the active service

### Requirement: OIDC authentication with auto-provisioning

OpenCloud SHALL authenticate users via OIDC with Keycloak client ID `opendesk-opencloud`,
automatically creating user accounts on first login.

#### Scenario: First-time user auto-provisioning
- GIVEN a user authenticated via OIDC with `sub` claim matching a Keycloak user
- WHEN the user first accesses OpenCloud
- THEN OpenCloud creates a local user account using `preferred_username` as the username
- AND role assignment is driven by the OIDC claim (NOT default user role)
- AND the user has read/write access to their storage space

#### Scenario: Account editing link
- GIVEN a user wanting to manage their account settings
- WHEN the user accesses the account section in the UI
- THEN the account edit link redirects to Keycloak account management
  (`https://id.opendesk.hrz.uni-marburg.de/realms/opendesk/account`)

#### Scenario: Anonymous run services excluded
- GIVEN the `excludeRunServices` configuration (default: `idp,idm,auth-basic`)
- WHEN the OIDC token includes a role matching an excluded service
- THEN OpenCloud blocks access via that role

### Requirement: Per-course file shares

OpenCloud SHALL organize file storage as per-course and per-student shares,
accessible via WebDAV and the web UI.

#### Scenario: Student uploads assignment
- GIVEN a student with a course share
- WHEN the student uploads a file to the course share
- THEN the file is stored in the course's storage space
- AND the file is NOT visible to students not enrolled in that course

#### Scenario: Instructor manages course files
- GIVEN an instructor with write access to a course share
- WHEN the instructor uploads a PDF, Word doc, or video
- THEN all enrolled students can view and download the file
- AND file metadata (name, size, upload date) is preserved

### Requirement: WOPI-based office editing

OpenCloud SHALL delegate document editing to Collabora via the WOPI
(Web Application Open Platform Interface) protocol.

#### Scenario: Edit document in Collabora
- GIVEN a user opening a `.docx`, `.xlsx`, or `.pptx` file in OpenCloud
- WHEN the user clicks "Edit in Collabora"
- THEN the file is opened in Collabora using WOPI
- AND edits are saved back to OpenCloud automatically
- AND Collabora communicates with OpenCloud via the configured WOPI secret

### Requirement: LDAP user directory integration

OpenCloud SHALL synchronize user profiles from an LDAP directory via the
Graph service's LDAP driver.

#### Scenario: User profile from LDAP
- GIVEN an LDAP user record with `mail`, `displayName`, `uid` fields
- WHEN the LDAP sync runs
- THEN OpenCloud imports the user profile from LDAP
- AND display name, email, and username are populated from LDAP attributes

#### Scenario: LDAP read-only access
- GIVEN LDAP integration configured in the Graph service
- THEN `bind_password` is set to `"disabled"`
- AND `write_disabled` is set to `true`
- AND OpenCloud cannot modify LDAP entries

### Requirement: CS3 file synchronization

OpenCloud SHALL sync files to/from external storage via the CS3 protocol
(Cloud Storage Sync, ISO standard) with per-user storage mount IDs.

#### Scenario: S3 file access
- GIVEN an external S3 bucket configured for a user
- WHEN the user accesses their storage space
- THEN files are synced via CS3 protocol
- AND file metadata is preserved (timestamps, checksums)

### Requirement: Event notification system

OpenCloud SHALL emit events for file changes, sharing operations, and
user actions via an event bus.

#### Scenario: File modification notification
- GIVEN a user modifying a file in OpenCloud
- WHEN the save completes
- THEN an event is emitted with the file path, action, and user ID
- AND subscribed services (e.g., Nextcloud via Intercom) can react

#### Scenario: Sharing notification
- GIVEN a user sharing a file with another user
- WHEN the share is created
- THEN a sharing event is emitted with the share target and permissions

### Requirement: Shared infrastructure with OpenX AppSuite

OpenCloud and OX AppSuite SHALL share the same object storage backend,
enabling cross-app file access without duplication.

#### Scenario: OX AppSuite accesses OpenCloud file via WebDAV
- GIVEN a user in OX AppSuite wanting to attach a file from OpenCloud
- WHEN the user selects "OpenCloud files" in the OX compose editor
- THEN the Filepicker (via Intercom) lists OpenCloud files
- AND the file reference is shared (NOT duplicated)
- AND the file remains stored in OpenCloud's S3 backend

### Requirement: Health probes

OpenCloud SHALL expose liveness and readiness probes.

#### Scenario: Service health check
- GIVEN OpenCloud deployed and running
- WHEN the liveness probe fires
- THEN the container responds on port 8080
- AND unhealthy containers are restarted by Kubernetes

## Depends On

Keycloak (OIDC, client: `opendesk-opencloud`), MariaDB (metadata, user profiles), MinIO/S3 (CS3 file storage), HAProxy Ingress (TLS termination), Collabora (WOPI delegate), Intercom Service (silent login for Filepicker), Nubus Portal (tile), Dovecot (IMAP for SOGo interop via WebDAV)

## Integrates With

OX AppSuite (WebDAV file access via Intercom), Nubus Portal (tile), Collabora (WOPI office editing), Intercom Service (silent login, cross-app SSO), SOGo (IMAP/SMTP interop via WebDAV), XWiki (newsfeed via Intercom)

## Component Reference

| Property | Value |
|---------|-------|
| Auth | OIDC (client: `opendesk-opencloud`, issuer: `keycloak`) |
| Database | MariaDB (metadata, user profiles, sharing, notifications) |
| Storage | CephFS RWX PVC (100Gi default, `ceph-cephfs-hdd-ec`) + S3 (CS3 sync) |
| Cache | Redis (OIDC token caching) |
| License | Apache-2.0 |
| Config | `secrets.opencloud.*`, `helmfile/apps/opencloud/values.yaml.gotmpl` |
| Chart | `helmfile/charts/opencloud/` (local chart) |
| Health | Port 8080 (TCP probes) |
| Replicas | 2 (default, HAProxy ingress) |
| Environment vars | `JWT_SECRET`, `TRANSFER_SECRET`, `MACHINE_AUTH_API_KEY`, `URL_SIGNING_SECRET`, `SYSTEM_USER_API_KEY`, `SYSTEM_USER_ID` |
| Service Account | UUID-based (`serviceAccountId`) used for all internal service communication |

## SLO

**Tier**: Critical (alternative primary file storage, used in education scenarios)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Availability** | 99.9% (43.2 min downtime/month max) | Uptime over 30-day window |
| **Latency (P95)** | <200ms (file list/UI) | OpenCloud metrics |
| **Latency (P95)** | <500ms (file upload 10MB) | Upload completion time |
| **Latency (P95)** | <300ms (file download) | Download throughput metrics |
| **Error Rate** | <0.1% (HTTP 5xx) | Nginx access log analysis |

**Alerts**:
- OpenCloud 5xx error rate >0.5% for 5 minutes → P1 alert
- File upload success rate <99% for 10 minutes → P2 alert
- Database connection failures >3 in 5 minutes → P1 alert
- Disk usage >85% → P3 alert
- CephFS mount failures >3 in 5 minutes → P1 alert

**Capacity**:
- 5,000 concurrent active users
- 50,000 files uploaded per day (peak: assignment deadlines)
- 10 TB total storage (typical institution)
- 1,000 MB/s aggregate throughput (CephFS backend)

## Disaster Recovery

**Tier**: Critical (RPO: 15 min, RTO: 1 hour)

**Backup Strategy**:
- **Database** (MariaDB): Hourly incremental + daily full backup, PITR enabled
- **User files** (CephFS): Daily snapshot, 30-day retention
- **Configuration**: GitOps-managed
- **Secrets**: Encrypted backup with quarterly rotation

**Recovery Order**:
1. Database restore (MariaDB) - 15 min
2. CephFS data verification - 15 min
3. OpenCloud application deployment - 10 min
4. Redis cache deployment - 3 min
5. OIDC client configuration verification - 5 min
6. OX AppSuite/Nubus Portal integration test - 5 min
7. WOPI host registration (if Collabora used) - 5 min
8. Smoke tests (upload, share, WebDAV) - 10 min
9. User access restoration - 10 min

**Critical Data**:
- User files (documents, photos, videos, shared content)
- File metadata (names, permissions, share links, CS3 references)
- User profiles and role-based access control
- OIDC client configuration and secrets
- Service account UUIDs

**Failure Scenarios**:
- **Database corruption**: Restore from PITR, verify file metadata integrity
- **CephFS storage loss**: Restore from snapshot, verify checksums
- **Complete failure**: Redeploy from GitOps, restore DB + files, re-register OIDC client, re-establish CS3 connections
- **OIDC misconfiguration**: Re-register client in Keycloak, verify SSO flow
