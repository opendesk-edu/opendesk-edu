<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-Identifier-Identifier: Apache-2.0
-->

# Draw.io (jgraph/drawio)

## Purpose

Stateless diagramming tool (`jgraph/drawio`) for architecture diagrams,
flowcharts, UML, and network diagrams. Requires **NO authentication** and
persists **NO data server-side**. Users must export or save diagrams locally
or to external storage (Nextcloud, Git repositories) before closing the
browser tab.

## Scope

This spec defines:
- ✅ **In scope**: Stateless diagram editor deployment, client-side rendering, public access (no authentication), export to multiple formats (PNG/JPEG/SVG/PDF)
- ❌ **Out of scope**: Persistent diagram storage (use Nextcloud, Git, etc.), real-time collaboration (use Miro, Excalidraw), authentication/authorization (public access only), server-side diagram processing (client-side JavaScript only)

## Non-Goals

- Persistent diagram storage (use Nextcloud, Git repositories, etc.)
- Real-time collaboration (use Miro, Excalidraw, etc.)
- Authentication/authorization (public access only)
- Server-side diagram processing (all rendering is client-side JavaScript)

## Requirements

### Requirement: Stateless diagram editor

Draw.io SHALL load and function entirely in the browser without any authentication
or server-side persistence, with support for multiple diagram types.

#### Scenario: User creates diagram
- GIVEN any user (authenticated or anonymous)
- WHEN the user navigates to `https://drawio.opendesk.hrz.uni-marburg.de/`
- THEN the editor loads at HTTP port 8080 (internal)
- AND HAProxy ingress routes traffic to port 8080
- AND the user can create, edit, and export diagrams
- AND NO data is persisted when the browser tab is closed
- AND supported formats include: Flow chart, UML, ER diagram, Network diagram, Organization chart

#### Scenario: Diagram export and persistence
- GIVEN a user with a completed diagram
- WHEN the user wants to save the diagram
- THEN the user MUST export or save to local device (File → Download as PNG/SVG/PDF/XML)
- OR save to Nextcloud (via File → Save → Nextcloud)
- OR save to Git repository (via File → Save → Git)
- AND no cloud storage is available server-side (no "Save to Cloud" option)

#### Scenario: Multiple diagram types
- GIVEN a user accessing Draw.io
- WHEN the user selects a diagram type
- THEN available types include: Flow chart, BPMN, UML, ER diagram, Network diagram, Organization chart
- AND each type has appropriate stencils and templates
- AND stencils load dynamically without server-side rendering

### Requirement: X-Forwarded-Host for internal URL generation

Draw.io relies on the `X-Forwarded-Host` HTTP header to generate correct internal
URLs for tools, plugins, and asset loading.

#### Scenario: HAProxy ingress header
- GIVEN HAProxy ingress routing to Draw.io
- THEN the HAProxy configuration sets `X-Forwarded-Host: drawio.opendesk.hrz.uni-marburg.de`
- AND Draw.io generates correct internal URLs (no broken links)
- AND plugin and tool references resolve correctly

#### Scenario: X-Forwarded-Protocol for HTTPS
- GIVEN HAProxy ingress terminating TLS
- THEN HAProxy sets `X-Forwarded-Proto: https`
- AND Draw.io generates HTTPS URLs (not HTTP)
- AND mixed content warnings are avoided in browser

### Requirement: Resource limits and auto-scaling

Draw.io SHALL operate within defined resource limits and support horizontal
autoscaling for load distribution.

#### Scenario: Default resource allocation
- GIVEN Draw.io deployment
- THEN container memory: `512Mi` (limit 2Gi), CPU: `200m` (limit 1 core)
- AND pod count: 1 by default (stateless, no data consistency concerns)
- AND OOMKiller prioritizes terminating empty pods first (users with no active sessions)

#### Scenario: Horizontal pod autoscaling
- GIVEN HPA configured with `targetCPUUtilizationPercentage: 80`
- WHEN CPU usage exceeds 80% for 5 minutes
- THEN new replicas are created (up to max 5 replicas)
- AND new replicas are ready to serve requests within 30 seconds
- AND load balancer distributes traffic across replicas via Round-robin

### Requirement: Security and isolation

Draw.io SHALL run with minimal privileges and container security hardening,
despite being publicly accessible.

#### Scenario: Non-root container
- GIVEN Draw.io deployment with security context
- THEN `runAsUser: 1001` (nginx user), `runAsNonRoot: true`
- AND container cannot escalate to root privileges
- AND file system is read-only except for `/tmp` (for upload processing)

#### Scenario: Capability dropping
- GIVEN Draw.io security policy
- THEN `capabilities.drop: [ALL]`
- AND no linux capabilities are added (`no cap-add`)
- AND container cannot access host devices or privileged operations
- AND seccomp profile is `RuntimeDefault`

#### Scenario: Network isolation
- GIVEN Draw.io deployment with network policy
- THEN ingress allowed from any IP (public access) on HTTP/HTTPS ports
- AND egress allowed to external internet (for plugin/stencil downloads)
- AND DNS queries resolve to external domains (for CDN assets)
- AND network policy blocks cluster-internal cross-namespace traffic

### Requirement: Health and monitoring

Draw.io SHALL be healthy and monitorable with health endpoints and metrics.

#### Scenario: Health checks
- GIVEN Draw.io deployment
- THEN liveness probe checks for running nginx process (`/`)
- AND readiness probe checks for nginx serving responses (`/`)
- AND startup probe delays failing liveness checks (allow 60s startup window)
- AND health responds with HTTP 200 status on port 8080

#### Scenario: Metrics and monitoring
- GIVEN Prometheus configured for scraping
- THEN nginx exposes metrics (`/nginx_status`) via `ngx_http_stub_status_module`
- AND metrics include `connections_active`, `requests_per_second`, `nginx_up`
- AND Grafana dashboard shows request rate, response time, active connections
- AND alerts fire when request rate drops below 10 req/min (potential outage)

### Requirement: Static file serving

Draw.io SHALL serve static HTML/JavaScript/CSS files via nginx without
server-side processing.

#### Scenario: Static file deployment
- GIVEN Draw.io container image `jgraph/drawio:latest`
- THEN the image contains precompiled static files (HTML/JS/CSS)
- AND nginx serves files directly (no server-side rendering)
- AND no database or external storage is required
- AND container restarts are fast (no application initialization)

#### Scenario: File upload and Download
- GIVEN a user uploading a diagram file (XML, VSDX)
- WHEN the upload completes
- THEN file is processed client-side (preview rendered in browser)
- AND file is temporarily stored in browser memory (not server)
- AND export downloads are client-side (file generated locally)

### Requirement: Plugin and stencil support

Draw.io SHALL support third-party plugins and custom stencils via external
CDNs and local file loading.

#### Scenario: Plugin loading
- GIVEN a user enabling a plugin in Draw.io settings
- WHEN the user requests plugin URL (e.g., `https://plugins.draw.io/`)
- THEN Draw.js fetches plugin via HTTP GET
- AND plugin loads into browser memory
- AND plugin functionality is available immediately

#### Scenario: Custom stencils
- GIVEN a user adding custom stencils to Draw.io
- WHEN the user imports stencil file (JSON/XML)
- THEN stencils are rendered client-side
- AND stencils are stored in browser local storage
- AND stencils are available across browser sessions

### Requirement: Central navigation integration

Draw.io SHALL integrate with Nubus Portal for centralized navigation.

#### Scenario: Portal tile navigation
- GIVEN Draw.io deployed
- THEN a tile is displayed in Nubus Portal navigation bar
- AND tile URL is `https://drawio.opendesk.hrz.uni-marburg.de/`
- AND tile icon is Draw.io logo (data:image/svg+xml;base64)
- AND tile description is "Stateless diagram editor (no auth, no persistence)"
- AND clicking the tile redirects to Draw.io main page

### Requirement: Storage and backup policy

Draw.io SHALL NOT require persistent storage by design, but support
external storage integration.

#### Scenario: No PVC required
- GIVEN Draw.io stateless design
- THEN no PVC is required (no data to persist)
- AND container restarts are fast (no file system sync)
- AND HPA can scale replicas without data consistency concerns
- AND no backup is needed (data is client-side only)

#### Scenario: Nextcloud export integration
- GIVEN a user exporting a diagram to Nextcloud
- WHEN File → Save → Nextcloud is selected
- THEN Draw.io prompts for Nextcloud login (OIDC)
- AND diagram file is uploaded to Nextcloud S3 storage
- AND Nextcloud file metadata includes diagram type and last modified timestamp
- AND diagram can be opened from Nextcloud via Nextcloud Draw.io app

## Depends On

**Infrastructure**:
- HAProxy Ingress (ingress class: `haproxy`, terminates TLS, sets `X-Forwarded-Host`, `X-Forwarded-Proto`)
- Load balancer (192.168.3.201 IP, shared with ingress-nginx)

**External Services**:
- External internet access for plugin/stencil CDN downloads
- Nextcloud (optional, for diagram export save target)

## Integrates With

**Services**:
- Nubus Portal (tile only — no data flow)
- Nextcloud (external export target save destination for diagrams)
- External plugin/stencil CDNs (for third-party extensions)

**API Contracts**:
- None (no authentication, no server-side API)

## Component Reference

| Property | Value |
|---------|-------|
| Auth | None (public access) |
| Database | None |
| Storage | None (stateless) |
| Cache | None |
| License | Apache-2.0 |
| Config | `helmfile/apps/drawio/values.yaml.gotmpl` |
| Chart | `helmfile/charts/drawio/` (local chart) |
| Image | `jgraph/drawio:latest` |
| Health | HTTP 8080 (liveness/readiness on `/`) |
| Ingress | `drawio.opendesk.hrz.uni-marburg.de` (HAProxy, sets `X-Forwarded-Host`) |
| Security | `runAsUser: 1001`, `runAsGroup: 1001`, `runAsNonRoot: true`, `capabilities.drop: [ALL]` |
| Resources | `cpu: 200m/1 core`, `memory: 512Mi/2Gi` |
| Static files | Precompiled HTML/JS/CSS (no server-side rendering) |
| Supported formats | Flow chart, UML, ER diagram, Network diagram, Organization chart |
| Export formats | PNG, SVG, PDF, XML, VSDX |

## Known Quirks

- **No persistence by design**: Draw.io is stateless. Users MUST export/save
  diagrams locally. Use Nextcloud or Git repositories for shared storage.
- **HTTP port 8080**: Draw.io uses HTTP (not HTTPS) internally. HAProxy ingress
  terminates TLS and forwards to port 8080 with `X-Forwarded-Host`.
- **X-Forwarded-Host required**: Without `X-Forwarded-Host` header, Draw.js tools
  and plugins generate broken internal URLs (must be configured in HAProxy).
- **Public access**: No authentication is required by design. Anyone with the URL can access Draw.io.
- **No real-time collaboration**: Multiple users cannot edit the same diagram simultaneously.

## SLO

**Tier**: Low (stateless diagram editor, public access, minimal dependencies)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Availability** | 99.0% (7.2 hours downtime/month max) | Uptime over 30-day window |
| **Latency (P95)** | <300ms (page load) | Nginx access log analysis |
| **Error Rate** | <1% (HTTP 5xx) | Nginx access log analysis |

**Alerts**:
- Draw.io 5xx error rate >2% for 10 minutes → P3 alert
- Pod crash loop >3 in 5 minutes → P3 alert

**Capacity**:
- 1,000 concurrent users (stateless, easily scalable)
- 10,000 page loads per day

## Disaster Recovery

**Tier**: Low (RPO: N/A - stateless, RTO: 30 min)

**Backup Strategy**:
- **Configuration**: GitOps-managed
- **User data**: NONE (stateless service, all data client-side)

**Recovery Order**:
1. Draw.io application deployment - 5 min
2. Smoke tests (page load, diagram rendering) - 5 min
3. User access restoration - 5 min

**Critical Data**:
- None (stateless service)

**Failure Scenarios**:
- **Pod crash**: Kubernetes auto-restart
- **Complete failure**: Redeploy from GitOps (no data to restore)
