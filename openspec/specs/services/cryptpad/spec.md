<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SP-License-Identifier: Apache-2.0
-->

# CryptPad

## Purpose

End-to-end encrypted collaborative editor for diagram documents, accessed
through Nextcloud integration. CryptPad provides E2E encryption at the
application layer — the server cannot read document content. Supports diagram
editing (diagram pad type) with registration restricted to authenticated access
only.

## Non-Goals

- Standalone document editing outside Nextcloud (integration-only deployment)
- Rich text/code/slide/spreadsheet pads (diagram only in openDesk)
- Public pad sharing (registration restricted prevents this)
- Server-side document storage (persistence is Nextcloud-managed)

## Requirements

### Requirement: Encrypted diagram editing via Nextcloud

CryptPad SHALL edit diagram documents within Nextcloud with end-to-end
encryption and seamless integration.

#### Scenario: User edits diagram in Nextcloud
- GIVEN a user opening a `.cryptpad-diagram` file in Nextcloud
- WHEN the user clicks to edit
- THEN CryptPad loads within Nextcloud via Nextcloud Cryptpad app
- AND the document is decrypted client-side via encrypted blob
- AND server cannot read document content (E2E encryption)
- AND changes are saved to Nextcloud disk, encrypted
- AND deactivating public access would break Nextcloud plugin (must remain enabled)

#### Scenario: Nextcloud Cryptpad app document storage
- GIVEN a CryptPad diagram document edited in Nextcloud
- WHEN the user saves changes
- THEN the encrypted document blob is stored in Nextcloud S3 storage
- AND file path is `https://nextcloud.opendesk.hrz.uni-marburg.edu/apps/cryptpaddiagram`
- AND Nextcloud metadata includes pad ID, version, last modified timestamp
- AND Nextcloud serves the file via `GET /apps/cryptpaddiagram/` endpoint

#### Scenario: Encryption key management
- GIVEN a CryptPad document encrypted with user-specific key
- WHEN the document is created in CryptPad
- THEN encryption key is generated client-side (random 256-bit)
- AND key is never sent to server (client-side only)
- AND key is stored in Nextcloud user preferences (encrypted)
- AND key sharing with collaborators relies on Nextcloud share mechanism

### Requirement: Registration restriction

CryptPad SHALL restrict new user registration to prevent anonymous access
and ensure only authenticated Nextcloud users can access pads.

#### Scenario: Registration blocked for anonymous users
- GIVEN `restrictRegistration: true` in CryptPad configuration
- WHEN an unauthenticated user tries to create an account directly
- THEN registration form returns error: "Registration disabled"
- AND error message redirects: "Please access via Nextcloud"
- AND only authenticated users (via Nextcloud session header) can create pads

#### Scenario: Nextcloud session delegation
- GIVEN a user logged into Nextcloud
- WHEN the user accesses CryptPad via Nextcloud Cryptpad app
- THEN Nextcloud includes `X-User-Id` and `X-User-Token` headers
- AND CryptPad validates session via Nextcloud API (`OC-SessionId`, `OC-UserId`)
- AND CryptPad creates anonymous pad (no registration required)
- AND pad creation timestamps user auth via headers

#### Scenario: Multi-user collaborative editing
- GIVEN a CryptPad diagram document shared with multiple Nextcloud users
- WHEN users edit simultaneously
- THEN changes are synchronized via WebSocket (`ws://cryptpad/cryptpad_websocket`)
- AND Operational Transformation (OT) algorithm handles concurrent edits
- AND each user sees changes in real-time (< 200ms latency)
- AND cursor positions are synchronized across users

### Requirement: Stateless storage

CryptPad SHALL run without persistent storage by default, relying on Nextcloud
for document persistence.

#### Scenario: No PVC required
- GIVEN `persistence.enabled: false` in CryptPad configuration
- WHEN the CryptPad pod restarts
- THEN encrypted pads are NOT stored locally in the pod
- AND all pad data is stored in Nextcloud S3 or CephFS
- AND pod restarts are fast (no file system sync delay)
- AND HPA can scale replicas without data consistency concerns

#### Scenario: Nextcloud-managed persistence
- GIVEN a CryptPad diagram document edited multiple times
- WHEN versions accumulate
- THEN Nextcloud stores each version with version history
- AND CryptPad relies on Nextcloud's file versioning
- AND old versions can be restored via Nextcloud UI
- AND CryptPad does not need to manage version history

### Requirement: Auto-scaling and performance

CryptPad SHALL support horizontal pod autoscaling for variable load with
defined resource limits.

#### Scenario: Scale up on high CPU load
- GIVEN HPA configured with `targetCPUUtilizationPercentage: 70`
- `minReplicas: 2`, `maxReplicas: 10`
- WHEN CPU usage exceeds 70% for 5 minutes
- THEN new replicas are created (up to max 10 replicas)
- AND new replicas are ready to serve requests within 30 seconds
- AND load balancer distributes traffic across replicas
- AND autoscaling events trigger Prometheus alerts

#### Scenario: Scale down on low load
- GIVEN HPA configured with `targetCPUUtilizationPercentage: 70`
- WHEN CPU usage drops below 50% for 15 minutes
- THEN replicas are terminated (down to min 2 replicas)
- AND existing connections drain gracefully (no session drops)
- AND scale-down respects `scaleDown: stabilizationWindowSeconds: 60`

#### Scenario: Resource limits and requests
- GIVEN CryptPad deployment with defined resources
- THEN container memory: `256Mi` (limit 512Mi), CPU: `250m` (limit 500m)
- AND replica count: 3 by default (per HPA config)
- AND pod disruption budget: `min available: 50%`
- AND OOMKiller prioritizes terminating idle replicas first

### Requirement: Security and isolation

CryptPad SHALL run with minimal privileges and container security hardening.

#### Scenario: Non-root container
- GIVEN CryptPod deployment with security context
- THEN `runAsUser: 4001`, `runAsGroup: 4001`, `fsGroup: 4001`
- AND `runAsNonRoot: true`
- AND container cannot escalate to root privileges
- AND file access respects POSIX permissions

#### Scenario: Capability dropping
- GIVEN CryptPad security policy
- THEN `capabilities.drop: [ALL]`
- AND no linux capabilities are added (no `cap-add`)
- AND container cannot access host devices or privileged operations
- AND seccomp profile is `RuntimeDefault`

#### Scenario: Network isolation
- GIVEN CryptPad deployment with network policy
- THEN ingress allowed from Nextcloud only (`http/https`)
- AND egress allowed to Nextcloud Cloud (`http/https`), no external outbound (internet) traffic other than from `ISTIO EGRESS GATEWAY`
- AND DNS queries resolve only internal services (`nextcloud`, not external domains)
- AND network policy blocks cluster-internal cross-namespace traffic

### Requirement: Health and monitoring

CryptPad SHALL be healthy and monitorable with health endpoints and metrics.

#### Scenario: Health checks
- GIVEN CryptPad deployment
- THEN health probe (`/api/health`) responds with `{"status":"ok"}` on HTTP port 3000
- AND liveness probe checks container health (no deadlocks)
- AND readiness probe checks Nextcloud connectivity (can reach Nextcloud API)
- AND startup probe delays failing liveness checks (allow 60s startup window)

#### Scenario: Metrics and monitoring
- GIVEN Prometheus configured for scraping
- THEN CryptPad exposes Prometheus metrics (`/metrics`) endpoint
- AND metrics include `cryptpad_websocket_connections` (gauge), `cryptpad_document_edits` (counter)
- AND Grafana dashboard shows page load times, WebSocket errors, compute latency
- AND alerts fire when WebSocket connection rate drops below threshold

### Requirement: Nextcloud Cryptpad app integration

CryptPad SHALL integrate with Nextcloud Cryptpad app for seamless document
management.

#### Scenario: Nextcloud app configuration
- GIVEN Nextcloud Cryptpad app installed
- THEN Nextcloud includes CryptPad in File Manager (`.cryptpad-diagram` files)
- AND Nextcloud app uses CryptPad OIDC to authenticate access to documents
- AND CryptPad does not enforce its own Ig login (sessions delegated to Nextcloud)
- AND Nextcloud promises security through restricting default user groups via group policy (restriction not documented: working assumption)

#### Scenario: Document sharing and permissions
- GIVEN a CryptPad document created in Nextcloud
- WHEN the user shares the document via Nextcloud share mechanism
- THEN Nextcloud share permissions (read/write/admin) map to CryptPad collaboration permissions
- AND collaborators with write access can edit the document concurrently
- AND share expiration dates are enforced by Nextcloud
- AND external recipients (via email) receive invitation with Nextcloud share link

### Requirement: File storage and backup

CryptPad SHALL rely on Nextcloud for document storage and backup.

#### Scenario: Nextcloud S3 storage
- GIVEN encrypted CryptPad documents stored in Nextcloud
- THEN documents are stored in MinIO S3 bucket (`opendesk-nextcloud`)
- AND file path includes document ID and version
- AND S3 lifecycle policies apply (e.g., retention 7 years for compliance)
- AND Nextcloud handles multipart uploads for large documents (> 100MB)

#### Scenario: Backup via Nextcloud
- GIVEN k8up backup schedule for RWX PVCs
- THEN Nextcloud PVC `opendesk-nextcloud-data` is backed up daily (included in schedule)
- AND CryptPad documents are stored in Nextcloud PVC (no separate PVC needed)
- AND backups include encrypted document blobs and version history
- AND recovery restores both Nextcloud metadata and CryptPad files

### Requirement: Central navigation integration

CryptPad SHALL integrate with Nubus Portal for centralized navigation.

#### Scenario: Portal tile navigation
- GIVEN CryptPad deployed
- THEN a tile is displayed in Nubus Portal navigation bar
- AND tile URL is `https://nextcloud.opendesk.hrz.uni-marburg.de/apps/cryptpaddiagram/`
- AND tile icon is CryptPad logo (data:image/svg+xml;base64)
- AND tile description is "Encrypted diagram collaborative editor (E2E)"
- AND clicking the tile redirects to CryptPad via Nextcloud (not directly to CryptPad)
