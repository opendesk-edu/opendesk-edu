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

Keycloak (OIDC, client: `opendesk-nextcloud`), MariaDB or PostgreSQL (metadata), Redis (cache), MinIO/S3 (primary storage), HAProxy Ingress, Collabora (WOPI delegate), ClamAV (virus scanning), Postfix (SMTP mail), Nubus Portal (central navigation), Intercom Service (silent login for Filepicker)

## Integrates With

OX AppSuite (Filepicker via Intercom), OpenProject (file store integration, admin bootstrap), Collabora (WOPI office editing), Element (file sharing via Intercom), XWiki (newsfeed via Intercom), Notify Push (WebSocket notifications), ClamAV (ICAP virus scanning), Nubus Portal (central navigation, tile)

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
