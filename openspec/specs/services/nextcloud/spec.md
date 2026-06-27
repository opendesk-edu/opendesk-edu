<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Nextcloud

## Purpose

Enterprise file storage, sync, and sharing platform deployed as Nextcloud AIO
(All-in-One) with integrated PHP-FPM, Nginx, and Redis cache. Provides S3
primary storage (CephFS RWX fallback), MariaDB/PostgreSQL metadata backend,
OIDC authentication via Keycloak, LDAP group synchronization, ClamAV virus
scanning, WOPI office editing via Collabora, and Notify Push for real-time
notifications.

Nextcloud AIO bundles the Nextcloud server, database client, Redis client,
and cron scheduler into a single container, with a separate Notify Push
sidecar for WebSocket notifications and a separate metrics exporter for
Prometheus.

## Scope

This spec defines:
- ✅ **In scope**: Nextcloud AIO deployment, file storage/sharing (CephFS/S3), OIDC authentication via Keycloak, LDAP group sync, ClamAV virus scanning, WOPI office editing via Collabora, Notify Push real-time notifications, S3 primary storage
- ❌ **Out of scope**: Alternative file sharing (see OpenCloud), Collabora integration details (see Collabora spec), Talk/Draw.io/Collectives specific features (use standard Nextcloud apps)

## Non-Goals

- Alternative file sharing (see `../opencloud/spec.md`)
- Collabora integration details (see `../collabora/spec.md`)
- Nextcloud Talk, Draw.io, Collectives (disabled by default in edu)

## Requirements

### Requirement: S3 primary storage with OIDC authentication

Nextcloud SHALL store files on S3-compatible object storage (MinIO) and
authenticate users via OIDC with Keycloak client `opendesk-nextcloud`.

#### Scenario: File upload persistence
- GIVEN a user authenticated via OIDC uploading a file
- WHEN the upload completes
- THEN the file is stored on the configured S3 endpoint (MinIO)
- AND file metadata is stored in the database (MariaDB or PostgreSQL)
- AND the file survives pod restarts, upgrades, and pod rescheduling

#### Scenario: OIDC first login
- GIVEN a user authenticated via OIDC with `preferred_username` claim
- WHEN the user first accesses Nextcloud
- THEN Nextcloud creates a local account using `preferred_username`
- AND the OIDC client ID `opendesk-nextcloud` is used
- AND the client secret is stored in `secrets.keycloak.clientSecret.ncoidc`

#### Scenario: Trusted proxy configuration
- GIVEN Nextcloud behind HAProxy ingress
- THEN `trustedProxy` is set to the cluster CIDR range(s)
- AND Nextcloud correctly identifies the client IP from `X-Forwarded-For`

### Requirement: LDAP group synchronization

Nextcloud SHALL synchronize LDAP groups from Keycloak federation on a
configurable interval, using a dedicated LDAP bind DN for searches.

#### Scenario: Direct group members synchronized
- GIVEN users who are direct members of Nextcloud-authorized LDAP groups
- WHEN the LDAP sync runs
- THEN those users are granted Nextcloud access
- AND the sync uses bind DN `uid=ldapsearch_nextcloud,cn=users,<baseDn>`

#### Scenario: Nested group members excluded
- GIVEN users who are members only of nested subgroups (not direct)
- WHEN LDAP sync runs
- THEN those users are NOT granted Nextcloud access
- AND `adminGroupName: "managed-by-attribute-FileshareAdmin"` maps LDAP admins

#### Scenario: LDAP read-only
- GIVEN the LDAP sync configuration
- THEN Nextcloud only reads from LDAP (no writes)
- AND group membership changes must be made in Keycloak/LDAP, not Nextcloud

### Requirement: Notify Push for real-time notifications

Nextcloud SHALL deploy a separate Notify Push sidecar for WebSocket-based
real-time notifications (file changes, share events, chat messages).

#### Scenario: Real-time notification delivery
- GIVEN Notify Push deployed (`replicas.nextcloudNotifyPush > 0`)
- WHEN a file is shared with a user
- THEN the user receives a push notification via WebSocket
- AND the notification appears without page refresh

#### Scenario: Notify Push database connection
- GIVEN Notify Push configured
- THEN it connects to the same database as Nextcloud AIO
- AND uses the same Redis cache for session data

### Requirement: ClamAV virus scanning

Nextcloud SHALL scan uploaded files for viruses via ClamAV ICAP server.

#### Scenario: File upload scanned
- GIVEN ClamAV ICAP server running (`clamav-icap:1344`)
- WHEN a user uploads a file
- THEN Nextcloud sends the file to ClamAV for scanning
- AND infected files are quarantined or rejected
- AND the scan result is stored in the file metadata

#### Scenario: Distributed vs Simple ClamAV
- GIVEN `apps.clamavDistributed.enabled: true`
- THEN the ICAP host is `clamav-icap`
- AND given `apps.clamavSimple.enabled: true`
- THEN the ICAP host is `clamav-simple`

### Requirement: WOPI integration with Collabora

Nextcloud SHALL delegate office document editing to Collabora via WOPI,
with per-document access token generation.

#### Scenario: Open document for editing
- GIVEN a user opening an office document in Nextcloud
- WHEN the user clicks "Edit in Collabora"
- THEN Nextcloud generates a WOPI access token for the file
- AND the WOPI allowlist restricts access to configured CIDR ranges
- AND the default file format is configurable (`functional.weboffice.defaultFormat`)

### Requirement: File sharing policies

Nextcloud SHALL enforce configurable sharing policies for internal and
external shares, including expiry, password enforcement, and mail notification.

#### Scenario: Internal share with expiry
- GIVEN `sharing.internal.expiry.activeByDefault: true`
- WHEN a user shares a file with another internal user
- THEN the share has a default expiry of `sharing.internal.expiry.defaultDays` days
- AND if `enforced: true`, the expiry cannot be disabled

#### Scenario: External share with password
- GIVEN `sharing.external.enabled: true` and `enforcePasswords: true`
- WHEN a user creates an external share link
- THEN a password is required
- AND `sendPasswordMail` delivers the password via email

#### Scenario: Public upload allowed
- GIVEN `sharing.external.enabled: true` and `allowPublicUpload: true`
- WHEN a user creates an external share
- THEN recipients can upload files to the shared folder

### Requirement: Quota management

Nextcloud SHALL enforce per-user storage quotas configured via AIO.

#### Scenario: User quota enforcement
- GIVEN `quota.default` set to `<N> GB`
- WHEN a user's storage exceeds the quota
- THEN upload attempts are rejected
- AND the user receives a "storage full" notification

### Requirement: Correct probe timing

Nextcloud SHALL configure readiness and startup probes with `periodSeconds`
instead of `initialDelaySeconds` to prevent PHP-FPM overload.

#### Scenario: Probe timing prevents restart loop
- GIVEN Nextcloud AIO deployed with probe overrides
- WHEN readiness and startup probes fire
- THEN `periodSeconds` is used (NOT `initialDelaySeconds`)
- AND PHP-FPM load remains at 1x (not 10x)
- AND the container does not enter a restart loop

### Requirement: Prometheus metrics exporter

Nextcloud SHALL deploy a separate metrics exporter for Prometheus monitoring.

#### Scenario: Metrics collection
- GIVEN the exporter deployed (`nextcloudExporter` sidecar)
- WHEN Prometheus scrapes `http://opendesk-nextcloud-aio/metrics`
- THEN Nextcloud metrics are exposed using the `serverinfo.token`
- AND metrics include user count, file count, share count, active users
- AND the exporter runs as `runAsUser: 65532`, `readOnlyRootFilesystem: true`

### Requirement: Administrative bootstrap

Nextcloud SHALL provision an admin user during initial deployment, required
for the OpenProject integration bootstrap.

#### Scenario: Admin user provisioned
- GIVEN `administrator.enabled: true`
- THEN the admin user `nextcloud` is created with the configured password
- AND this user is used by OpenProject to bootstrap the Nextcloud integration

### Requirement: Feature flags

Nextcloud SHALL support feature toggles for optional functionality.

#### Scenario: Disabled features
- GIVEN the default edu configuration
- THEN the following are disabled:
  - `contacts` (address book — LDAP handles this)
  - `spreed` (Nextcloud Talk — not needed in edu)
  - `circles` (social sharing)
  - `comments` (file comments)
  - `appstore` (no external app installation)
  - `shareReview` (share approval workflow)
- AND the following are enabled:
  - `groupfolders` (managed shared folders)
  - `filesZip` (zip download of folders)
  - `systemtags` (file tagging)
  - `integrationOpenproject` (if OpenProject enabled)
  - `notifyPush` (if replicas > 0)
  - `cryptpad` (if CryptPad enabled)

### Requirement: Central navigation integration

Nextcloud SHALL integrate with the Nubus central navigation bar.

#### Scenario: Navigation bar injection
- GIVEN the OpenDesk integration app enabled
- THEN Nextcloud fetches navigation.json from `http://ums-portal-server/portal/navigation.json`
- AND the central navigation bar is rendered in the Nextcloud header
- AND links point to `https://<nubus-host>.<domain>`

## Depends On

**Authentication**:
- Keycloak OIDC (`https://keycloak.opendesk.hrz.uni-marburg.de/auth/realms/opendek/.well-known/openid-configuration`, client: `opendesk-nextcloud`, secret: `nextcloud-oidc-client-secret` from `nextcloud-nextcloud` secret)
- Intercom (`https://intercom.opendesk.hrz.uni-marburg.de/api/silent-login`, secret: `secret.centralnavigation.apiKey`)

**Data Store**:
- MariaDB (`nextcloud` DB, host: `mariadb:3306`, user: `nextcloud_user`, password: `secrets.nextcloud.db_password`) OR PostgreSQL (`nextcloud` DB, host: `postgresql:5432`, user: `nextcloud_user`, password: `secret.nextcloud.psql_password`)
- Redis (`redis:6379`, password: `secrets.cache.redis_password`)
- MinIO S3 (bucket: `opendesk-nextcloud`, endpoint: `http://minio:9000`, access key: `secret.s3.accessKey`, secret: `secret.s3.secretKey`)
- CephFS RWX: `opendesk-nextcloud-data` (100Gi, storage class: `ceph-cephfs-hdd-ec`, included in k8up schedule)

**Infrastructure**:
- HAProxy Ingress (HAProxy route, ingress class: `haproxy`, host: `nextcloud.opendesk.hrz.uni-marburg.de`, timeout: 86400s for large files)
- Collabora (`https://collabora.opendesk.hrz.uni-marburg.edu`, WOPI endpoint: `https://collabora.opendesk.hrz.uni-marburg.edu/hosting/discovery`)
- ClamAV ICAP (`icap://clamav-icap:1344/avscan`, REQMOD/RESMOD)
- Postfix (submission: `smtp://postfix:587` STARTTLS, from address: `noreply@opendesk.hrz.uni-marburg.de`)
- Notify Push (`wss://notify-push.opendesk.hrz.uni-marburg.de/push`, WebSocket notifications)
- Nubus Portal (navigation.json endpoint, tile)

## Integrates With

**API Contracts**:
- [Keycloak OIDC Token](../../integrations/api-contracts/spec.md#contract-keycloak-oidc-token-endpoint) — authentication
- [Intercom Silent Login](../../integrations/api-contracts/spec.md#contract-intercom-silent-login) — Filepicker/OX integration
- [WOPI Discovery + CheckFileInfo](../../integrations/api-contracts/spec.md#contract-wopi-discovery-and-checkfileinfo) — Collabora office editing
- [WOPI SaveChild](../../integrations/api-contracts/spec.md#wopi-savechild-endpoint) — Collabora new document creation
- [S3 Operations](../../integrations/api-contracts/spec.md#contract-s3-object-storage) — file storage
- [ClamAV ICAP Scan](../../integrations/api-contracts/spec.md#contract-clamav-icap-scan) — virus scanning
- [Notify Push WebSocket](../../integrations/api-contracts/spec.md#contract-notify-push-websocket) — real-time notifications
- [Nubus Navigation](../../integrations/api-contracts/spec.md#contract-nubus-portal-navigation) — portal tile
- [Postfix SMTP](../../integrations/api-contracts/spec.md#contract-postfix-smtp-submission) — email sending

**Services**:
- OX AppSuite (Filepicker via Intercom, consumer: `opendesk-opencloud`, target service: `opendesk-nextcloud`)
- OpenProject (file store integration via Nextcloud API v3, admin bootstrap: `openid-config`)
- Collabora (WOPI delegate, reads OdT/OdX/LyX presentation formats, writes back to Nextcloud S3)
- Element (file sharing via Intercom, Signal bridge for file attachments)
- XWiki (newsfeed via Intercom, syndication and notification display)
- ClamAV (ICAP REQMOD/RESMOD, quarantines infected files in `quarantine` folder)
- Nubus Portal (tile: display, url: `https://nextcloud.opendesk.hrz.uni-marburg.de/`, icon, description)

## Component Reference

| Property | Value |
|---------|-------|
| Auth | OIDC (client: `opendesk-nextcloud`) |
| Database | MariaDB or PostgreSQL (`nextcloud` DB, configurable via `databases.nextcloud.type`) |
| Storage | S3/MinIO (primary) + CephFS RWX (`opendesk-nextcloud-data`, 100Gi) |
| Cache | Redis (`cache.nextcloud.host:port`) |
| Antivirus | ClamAV ICAP (`clamav-icap:1344` or `clamav-simple:1344`) |
| SMTP | Postfix (`postfix.<namespace>.svc:587`, STARTTLS) |
| License | AGPL-3.0 |
| Config | `databases.nextcloud.*`, `cache.nextcloud.*`, `functional.filestore.*`, `helmfile/apps/nextcloud/values-nextcloud.yaml.gotmpl` |
| Chart | Upstream `nextcloud-aio` (OCI registry: `opencode.de`) |
| AIO image | `runAsUser: 101`, `runAsGroup: 101`, `fsGroup: 101`, `seccompProfile: RuntimeDefault` |
| Exporter image | `runAsUser: 65532`, `readOnlyRootFilesystem: true` |
| Notify Push | Separate sidecar, connects to same DB and Redis |
| Replicas | `replicas.nextcloud` (AIO), `replicas.nextcloudNotifyPush` (Notify Push), `replicas.nextcloudExporter` (exporter) |
| Health | Port 8080 (`/status.php`), exporter port 9205 |

## SLO

**Tier**: Critical (primary file storage for 20+ integrated services)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Availability** | 99.9% (43.2 min downtime/month max) | Uptime over 30-day window |
| **Latency (P95)** | <200ms (file list/UI) | Nextcloud AIO metrics exporter |
| **Latency (P95)** | <500ms (file upload 10MB) | Upload completion time |
| **Latency (P95)** | <300ms (file download) | Download throughput metrics |
| **Error Rate** | <0.1% (HTTP 5xx) | Nginx access log analysis |
| **Storage Latency** | <100ms (S3 object get) | MinIO/Ceph performance metrics |

**Alerts**:
- Nextcloud 5xx error rate >0.5% for 5 minutes → P1 alert
- File upload success rate <99% for 10 minutes → P2 alert
- Database connection failures >3 in 5 minutes → P1 alert
- Disk usage >85% → P3 alert
- Notify Push WebSocket disconnection rate >10% → P3 alert

**Capacity**:
- 5,000 concurrent active users
- 50,000 files uploaded per day (peak: assignment deadlines)
- 10 TB total storage (typical institution)
- 1,000 MB/s aggregate throughput (CephFS/S3 backend)

## Disaster Recovery

**Tier**: Critical (RPO: 15 min, RTO: 1 hour)

**Backup Strategy**:
- **Database** (PostgreSQL/MariaDB): Hourly incremental + daily full backup, PITR enabled
- **User files** (S3/CephFS): Daily snapshot + continuous versioning
- **Configuration**: GitOps-managed via ArgoCD
- **External storage**: k8up schedule for RWX PVCs only

**Recovery Order**:
1. Database restore (PostgreSQL/MariaDB) - 10 min
2. S3/CephFS data verification - 15 min
3. Nextcloud AIO deployment - 10 min
4. Notify Push sidecar deployment - 5 min
5. Collabora integration verification - 5 min
6. ClamAV scan resumption - 5 min
7. Smoke tests (upload, share, WOPI) - 5 min
8. User access restoration - 5 min

**Critical Data**:
- User files (documents, photos, videos, shared content)
- File metadata (names, permissions, share links, tags)
- User preferences and app configurations
- External storage mount points and credentials
- Collabora temporary files and session data

**Failure Scenarios**:
- **Database corruption**: Restore from PITR, verify file metadata integrity
- **S3 storage loss**: Restore from snapshots, verify checksums
- **Complete AIO failure**: Redeploy from GitOps, restore DB + files, re-register OIDC client
- **Collabora integration broken**: Verify WOPI endpoint, re-register WOPI host
