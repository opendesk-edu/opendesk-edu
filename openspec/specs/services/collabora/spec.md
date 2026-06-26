<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Collabora Online

## Purpose

LibreOffice-based online document editing service, providing WOPI (Web Application
Open Platform Interface) integration with Nextcloud and OpenCloud for collaborative
editing of ODF, OOXML, PDF, and text documents. Collabora does NOT require
separate user authentication — the session is delegated from the file-sharing
service via WOPI.

Collabora supports real-time multi-user editing, macro execution (configurable
security levels), font configuration from the Nextcloud server, and admin
metrics/monitoring endpoints. Security features include document workspace
isolation via Linux user namespaces, CAP_CHOWN/CAP_FOWNER/CAP_SYS_CHROOT
for filesystem sandboxing, and admin URL blocking at the ingress level.

## Non-Goals

- Standalone Collabora deployment (always accessed via WOPI delegate)
- Document conversion as a standalone service (always via WOPI client)
- Font management (delegated to Nextcloud RichDocuments settings)

## Requirements

### Requirement: WOPI session delegation

Collabora SHALL receive WOPI tokens from Nextcloud or OpenCloud without
requiring users to re-authenticate. The file-sharing service acts as WOPI
client and Collabora as WOPI server.

#### Scenario: User edits ODF document in Nextcloud
- GIVEN a user opening an `.odt`, `.ods`, or `.odp` file in Nextcloud
- WHEN the user clicks "Edit in Collabora"
- THEN Nextcloud sends a WOPI `CheckFileInfo` request to Collabora with the file URL
- AND Collabora loads the document in-browser using WebSocket connection
- AND the user's Nextcloud session is used for WOPI authorization
- AND no separate Collabora login is required

#### Scenario: User edits OOXML document in Nextcloud
- GIVEN a user opening a `.docx`, `.xlsx`, or `.pptx` file
- WHEN the user clicks "Edit in Collabora"
- THEN Collabora converts the OOXML document for editing
- AND saves are written back via WOPI `PutFile` to Nextcloud's storage

#### Scenario: WOPI allowlist
- GIVEN Collabora configured with `wopiAllowlist`
- WHEN a WOPI request arrives from a source NOT in the allowlist
- THEN Collabora rejects the request with HTTP 403

### Requirement: Real-time collaborative editing

Multiple users SHALL edit the same document simultaneously without conflicts
via WebSocket-based synchronization.

#### Scenario: Concurrent editing of same document
- GIVEN two users with edit access to the same document in Nextcloud
- WHEN both users edit simultaneously
- THEN changes are merged in real-time by Collabora
- AND no conflict resolution errors occur
- AND cursor positions of other users are visible

#### Scenario: Affinity-based routing
- GIVEN multiple Collabora replicas (default: 2+)
- WHEN a user opens a document for editing
- THEN the HAProxy ingress routes subsequent requests to the same replica
- AND routing is based on `$arg_WOPISrc` (or `$arg_RouteToken` with Controller)
- AND consistent hashing prevents document session split across replicas

### Requirement: Document workspace isolation

Collabora SHALL isolate document editing workspaces to prevent one document
from accessing another's files or runtime environment.

#### Scenario: Linux user namespace isolation (preferred)
- GIVEN Collabora running with user namespace support (`unshare -Ur bash` succeeds)
- WHEN a document is opened for editing
- THEN the document runs in an isolated user namespace
- AND no additional capabilities beyond the default security context are needed

#### Scenario: Filesystem sandboxing fallback
- GIVEN Collabora where user namespaces are NOT available
- WHEN a document is opened for editing
- THEN Collabora falls back to filesystem sandboxing using:
  - `CAP_CHOWN` — ownership changes for isolation
  - `CAP_FOWNER` — file permission bypass for isolated copies
  - `CAP_SYS_CHROOT` — `chroot` into isolated document directory
- AND the container security context adds these capabilities

#### Scenario: Admin URL blocking at ingress
- GIVEN Collabora deployed with HAProxy ingress
- WHEN external requests target admin endpoints
- THEN the following paths return HTTP 403:
  - `/cool/getMetrics`
  - `/cool/adminws/`
  - `/browser/dist/admin/admin.html`

### Requirement: Macro execution security

Collabora SHALL support macro execution with configurable security levels
to balance functionality and security.

#### Scenario: Macro execution enabled with security level 1
- GIVEN `macros.enabled: true` and `macros.securityLevel: "1"`
- WHEN a user opens a document containing macros
- THEN macros execute with confirmation prompt
- AND signed macros run without prompt, unsigned macros prompt user

#### Scenario: Macro execution disabled (security level 0)
- GIVEN `macros.enabled: true` and `macros.securityLevel: "0"`
- WHEN a user opens a document containing macros
- THEN all macros are executed without confirmation
- AND security level values outside `{0, 1}` SHALL cause helmfile render failure

### Requirement: Prometheus metrics and monitoring

Collabora SHALL expose Prometheus-compatible metrics and integrate with
the Prometheus Operator for service monitoring and alerting.

#### Scenario: ServiceMonitor scraping
- GIVEN Collabora deployed with `serviceMonitors.enabled: true`
- WHEN Prometheus scrapes targets
- THEN a ServiceMonitor resource selects Collabora pods
- AND metrics are collected including document count, active users, CPU/memory

#### Scenario: PrometheusRule alerts
- GIVEN Collabora deployed with `prometheusRules.enabled: true`
- THEN Prometheus alerting rules are deployed for Collabora health

### Requirement: Font configuration from Nextcloud

Collabora SHALL load font configuration from the Nextcloud RichDocuments
app settings endpoint.

#### Scenario: Remote font configuration
- GIVEN `remote_font_config.url` pointing to Nextcloud RichDocuments
- WHEN Collabora starts
- THEN it fetches the font list JSON from `https://<nextcloud>/apps/richdocuments/settings/fonts.json`
- AND available fonts match those configured in Nextcloud

### Requirement: TLS termination at ingress

Collabora SHALL terminate TLS at the ingress controller, running plain HTTP
internally.

#### Scenario: SSL termination
- GIVEN `ssl.enable=false` and `ssl.termination=true`
- WHEN a user accesses Collabora via HTTPS
- THEN the ingress controller terminates TLS
- AND internal traffic between ingress and Collabora is plain HTTP

### Requirement: Enterprise features (conditional)

Collabora SHALL support enterprise-specific features when `OPENDESK_ENTERPRISE=true`
environment variable is set.

#### Scenario: Enterprise integration theme
- GIVEN `OPENDESK_ENTERPRISE: "true"`
- WHEN Collabora renders its UI
- THEN `use_integration_theme=false` is applied
- AND Collabora uses its own theme (NOT the Nextcloud integration theme)

#### Scenario: Collabora Controller (load balancing)
- GIVEN `apps.collaboraController.enabled: true`
- WHEN a user opens a document
- THEN routing uses `RouteToken` instead of `WOPISrc` for affinity
- AND a WebSocket monitor connects to `collabora-controller-cool-controller:9000`
- AND the indirection endpoint is configured at `/controller/routeToken`

## Depends On

HAProxy Ingress (TLS termination, affinity routing, admin URL blocking)

## Integrates With

Nextcloud (WOPI delegate, RichDocuments app, font config), OpenCloud (WOPI delegate alternative), Prometheus (metrics, ServiceMonitor, PrometheusRule)

## Component Reference

| Property | Value |
|---------|-------|
| Auth | None (WOPI token delegation from file-sharing service) |
| Database | None |
| Storage | None (documents streamed via WOPI from file service) |
| Cache | None |
| License | MPL-2.0 |
| Config | `functional.weboffice.macros.*`, `technical.collabora.*`, `helmfile/apps/collabora/values.yaml.gotmpl` |
| Chart | Upstream `collabora-online` (OCI registry: `opencode.de`) |
| Admin credentials | `collabora-internal-admin` / `secrets.collabora.adminPassword` |
| Replicas | `replicas.collabora` (default: 2) |
| Security context | `runAsUser: 1001`, `runAsGroup: 1001`, `seccompProfile: RuntimeDefault`, `capabilities: drop ALL + add CHOWN/FOWNER/SYS_CHROOT` |
| Health | Port 9980 |
| Ingress affinity | HAProxy: `url_param WOPISrc check_post` with `hash-type consistent` |
