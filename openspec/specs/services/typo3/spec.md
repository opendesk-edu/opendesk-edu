<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# TYPO3 CMS

## Purpose

Enterprise-level content management system for institutional websites,
departmental pages, and public-facing content. Authenticated via OIDC with
embedded MariaDB, supporting multi-site setups, rich text editing, and the TYPO3
extension ecosystem.

## Scope

This spec defines:
- ✅ **In scope**: TYPO3 CMS deployment, OIDC authentication via Keycloak, multi-site setups, rich text editing, TYPO3 extension ecosystem, public-facing content management, MariaDB backend
- ❌ **Out of scope**: Alternative web CMS platforms (use WordPress if needed), multi-language content (single-language per deployment), e-commerce features, custom TYPO3 extension development

## Non-Goals

- Alternative web CMS platforms (use WordPress if needed)
- Multi-language content (single-language per deployment)

## Requirements

### Requirement: OIDC authentication via Keycloak

TYPO3 CMS SHALL authenticate content editors and administrators via OIDC,
configured as a Keycloak client `opendesk-typo3` in realm `opendesk`.

#### Scenario: Editor accesses TYPO3 backend
- GIVEN an authenticated user with TYPO3 editor permissions (role `typo3-editor`)
- WHEN the user navigates to `berta.opendesk.hrz.uni-marburg.de/typo3`
- THEN TYPO3 redirects to Keycloak OIDC login
- AND the user is redirected to the TYPO3 backend (no re-auth)
- AND can create and manage content

#### Scenario: Admin user accesses TYPO3 backend
- GIVEN an authenticated user with TYPO3 admin permissions (role `typo3-admin`)
- WHEN the user navigates to the TYPO3 backend
- THEN the user has full administrative access
- AND can install/uninstall TYPO3 extensions, manage users, configure sites

### Requirement: Embedded MariaDB

TYPO3 SHALL use an embedded MariaDB StatefulSet for content and configuration
storage (NOT external MariaDB).

#### Scenario: Content persistence
- GIVEN a TYPO3 pod withMariaDB StatefulSet
- WHEN an editor creates or modifies content (pages, news articles)
- THEN content is stored in the embedded MariaDB
- AND persists across pod restarts / upgrades

### Requirement: Multi-site support

TYPO3 SHALL support multiple independent websites within the same deployment,
each with its own domain and content tree.

#### Scenario: Site A and Site B isolation
- GIVEN a TYPO3 deployment configured with two sites:
  - Site A: `site-a.opendesk.hrz.uni-marburg.de`
  - Site B: `site-b.opendesk.hrz.uni-marburg.de`
- WHEN an editor creates a page `homepage` in Site A
- THEN the page is NOT accessible in Site B
- AND content trees are completely isolated

### Requirement: Rich text editing

TYPO3 editors SHALL use the CKEditor (or similar) rich text editor for
content creation.

#### Scenario: Rich text editing
- GIVEN an editor creating a new page
- WHEN the editor opens the content editor
- THEN a rich text editor (CKEditor) is available
- AND allows formatting (bold, italic, headings, links, images)

### Requirement: Extension management

TYPO3 administrators SHALL be able to install and uninstall TYPO3 extensions
via the TYPO3 Extension Manager (backend UI).

#### Scenario: Installing an extension
- GIVEN an administrator with `typo3-admin` role
- WHEN the administrator navigates to the Extension Manager
- THEN extensions can be installed from the TYPO3 Extension Repository (TER)
- OR uploaded as ZIP files
- AND installed extensions are enabled by default

## Depends On

- Keycloak (OIDC client `opendesk-typo3`, realm `opendesk`)
- MariaDB (embedded `typo3` database)
- HAProxy Ingress (HTTP routing)
- Nubus Portal (portal tile visibility for `typo3-editor` role)

## Integrates With

- Nubus Portal (tile, role mapping `typo3-editor` → `managed-by-attribute-Cms`)
- Keycloak (OIDC authentication)

## Component Reference

| Component | Purpose | Replicas | Storage |
|-----------|---------|----------|---------|
| TYPO3 Web | PHP-FPM backend (Apache) | 1 | RWO PVC (MariaDB) |
| Embedded MariaDB | Content and configuration storage | 1 (StatefulSet) | RWO PVC (8Gi) |
| Chart | `helmfile/charts/typo3/` (local chart) |

## Security Context

| Component | RunAsUser | Capabilities | Seccomp |
|-----------|-----------|--------------|---------|
| TYPO3 Web | 33 (www-data) | drop: ALL | RuntimeDefault |
| MariaDB | 999 (mysql) | drop: ALL | RuntimeDefault |

## Configuration Reference

| Property | Value |
|----------|-------|
| OIDC client | `opendesk-typo3` |
| OIDC scope | `openid, email, profile` |
| MariaDB database | `typo3` |
| MariaDB user | `typo3` |
| PVC size | 8Gi (mariadb persistence) |
| Storage class | `ceph-rbd-ssd` |

## Known Quirks

- **No separate files storage**: TYPO3 content is stored entirely in MariaDB,
  including binary data (e.g., images uploaded via TYPO3 forms). This is not
  最佳 practice for large-scale deployments but is acceptable for institutional
  websites.
- **Embedded MariaDB**: TYPO3 uses an embedded MariaDB sub-chart (NOT the shared
  MariaDB cluster), unlike other services.
- **OIDC via extension**: OIDC authentication is provided by the `myprojectopenid`
  TYPO3 extension (or similar), not built-in to TYPO3 core.

## Depends On

Keycloak (OIDC client `opendesk-typo3`), MariaDB (embedded), HAProxy Ingress

## Integrates With

Nubus Portal (tile, role mapping `typo3-editor`)

## SLO

**Tier**: Standard (CMS for public-facing content, not critical for operations)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Availability** | 99.0% (7.2 hours downtime/month max) | Uptime over 30-day window |
| **Latency (P95)** | <500ms (page load) | Apache access log analysis |
| **Latency (P95)** | <300ms (content edit save) | TYPO3 backend metrics |
| **Error Rate** | <1% (HTTP 5xx) | Apache access log analysis |
| **SSO Success** | >99% (OIDC auth) | Keycloak event log |

**Alerts**:
- TYPO3 5xx error rate >2% for 10 minutes → P3 alert
- Database connection pool exhausted → P3 alert
- OIDC authentication failures >5% for 5 minutes → P2 alert
- Disk usage >85% → P3 alert

**Capacity**:
- 5,000 concurrent public visitors
- 50 concurrent content editors
- 1,000,000 page views per month (typical institution)
- Database: 2 GB (typical), 20 GB (large institution)

## Disaster Recovery

**Tier**: Standard (RPO: 4 hours, RTO: 8 hours)

**Backup Strategy**:
- **Database** (MariaDB): Daily full backup
- **File storage** (RWO PVC): Daily snapshot via k8up
- **Configuration**: GitOps-managed

**Recovery Order**:
1. MariaDB database restore - 20 min
2. RWO PVC file storage restore - 10 min
3. TYPO3 application deployment - 10 min
4. OIDC client configuration verification - 5 min
5. Smoke tests (public page load, content edit) - 10 min
6. User access restoration - 15 min

**Critical Data**:
- Web pages and content
- Media files (images, videos, documents)
- User accounts and permissions
- Extension configurations
- OIDC client configuration

**Failure Scenarios**:
- **Database corruption**: Restore from backup, verify content integrity
- **RWO PVC loss**: Restore from snapshot, verify media file checksums
- **OIDC misconfiguration**: Re-register client in Keycloak, verify SSO flow
- **Complete failure**: Redeploy from GitOps, restore DB + PVC, verify authentication
