<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Security Threat Model

## Purpose

Maps security findings from the openDesk Sec pentest assessment
(`opendesk_sec/security-assessment-2025-03-26/`) to openDesk Edu services,
documents mitigations, and identifies remaining risks.

## Non-Goals

- Detailed pentest methodology (see pentest report)
- Vulnerability scoring (see pentest report for CVSS scores)

---

## Threat Categories

### TC-1: Authentication and Session Management

#### Finding: SAML assertion manipulation
- **Source**: Pentest finding (see `02-findings-critical.md`)
- **Impact**: Bypass authentication, impersonate users
- **Affected services**: All SAML 2.0 services (ILIAS, Moodle, BBB, Nextcloud, OX, BookStack, Zammad)
- **Mitigation in openDesk Edu**:
  - SAML assertions signed by Keycloak (`sigAlg: RSA-SHA256`)
  - `WantAssertionsSigned: true` on all SP configurations
  - Entity ID validation on both IdP and SP
  - Short-lived assertions (5-minute validity window)
- **Remaining risk**: LOW — mitigated by Keycloak signing

#### Finding: OIDC token exposure in logs
- **Source**: Pentest finding
- **Impact**: Token theft from log files
- **Affected services**: All OIDC services (SOGo, Element, OpenCloud, XWiki, Notes, Planka)
- **Mitigation**: `readOnlyRootFilesystem: true` on most OIDC services prevents
  log file writes to container filesystem. Centralized logging (Loki/Promtail)
  should be configured with appropriate access controls.
- **Remaining risk**: MEDIUM — container logs may still expose tokens in
  `stdout` which is captured by Kubernetes

#### Finding: Refresh token rotation
- **Source**: Design review
- **Impact**: Refresh token theft leads to persistent access
- **Affected services**: SOGo (refresh token rotation configured at 3600s interval)
- **Mitigation**: SOGo refreshes tokens on a regular interval. Other OIDC
  services should configure Keycloak refresh token rotation.
- **Remaining risk**: LOW for SOGo, MEDIUM for others (depends on Keycloak config)

### TC-2: Network Security

#### Finding: Unencrypted internal traffic
- **Source**: Pentest finding
- **Impact**: Packet sniffing between services
- **Affected services**: All inter-service communication
- **Mitigation**:
  - TLS termination at HAProxy ingress (external traffic encrypted)
  - mTLS via service mesh (not deployed — future consideration)
  - Network policies restrict pod-to-pod communication (Otterize intents
    partially deployed — see `intents.otterize.com/service-name` annotations)
- **Remaining risk**: MEDIUM — internal traffic is plaintext within the cluster

#### Finding: CNAME chain DNS resolution failure
- **Source**: Known HRZ issue
- **Impact**: External DNS lookups fail, breaking some services
- **Mitigation**: `hostAliases` in deployments for internal domains.
  `www-proxy2.uni-marburg.de` resolves; `proxy02.hrz.uni-marburg.de` does NOT.
- **Remaining risk**: LOW — documented workaround in place

### TC-3: Container Security

#### Finding: Privileged containers or elevated capabilities
- **Source**: Pentest finding
- **Impact**: Container escape, privilege escalation
- **Affected services**: Collabora (requires CHOWN/FOWNER/SYS_CHROOT for document isolation)
- **Mitigation**:
  - All services: `capabilities: drop ALL` + `seccompProfile: RuntimeDefault`
  - Collabora: explicitly adds only CHOWN/FOWNER/SYS_CHROOT (minimum needed)
  - All services: `runAsNonRoot: true` with non-root user
  - All services: `allowPrivilegeEscalation: false`
- **Remaining risk**: LOW — Collabora capabilities are necessary for document
  isolation and cannot be further reduced without breaking functionality

#### Finding: Read-only root filesystem
- **Source**: Security hardening
- **Impact**: Write protection for system files
- **Applied to**: Element, Synapse, Nextcloud AIO, Nextcloud Exporter, Notify
  Push, Notes (backend, frontend, y-provider), Collabora, CryptPad, SOGo
- **Not applied to**: Collabora (needs writable tmp for document processing),
  ILIAS (needs writable /var/www/html for Moodle/ILIAS compatibility), XWiki
  (needs writable data directory)
- **Remaining risk**: LOW — documented exceptions with justification

### TC-4: Data Protection

#### Finding: RWO PVC backup exclusion
- **Source**: Operational finding
- **Impact**: Database data not backed up by k8up
- **Affected**: 29 RWO PVCs (all databases)
- **Mitigation**:
  - All 29 PVCs annotated with `k8up.io/exclude: "true"`
  - TODO: Implement CSI snapshot schedules or per-node k8up schedules
- **Remaining risk**: HIGH — no automated backup for database data. Manual
  pg_dump/mysqldump required as interim measure.

#### Finding: Encryption at rest
- **Source**: Security hardening
- **Impact**: Data exposure if storage compromised
- **Mitigation**: Ceph RBD and CephFS provide encryption at the storage layer
  (Ceph cluster-level encryption). S3/MinIO data at rest encryption depends
  on MinIO configuration.
- **Remaining risk**: LOW for Ceph PVCs, MEDIUM for S3 data (verify MinIO config)

### TC-5: Input Validation

#### Finding: File upload size limits
- **Source**: Security hardening
- **Impact**: DoS via oversized uploads
- **Mitigation**: All file-uploading services have body size limits at ingress:
  - Nextcloud: configurable via `ingress.parameters.bodySize.nextcloud`
  - Moodle: 200M (course files, SCORM packages)
  - BBB: 120s timeout (streaming)
  - Collabora: configurable via `ingress.parameters.bodySize.collabora`
  - Notes: configurable via `ingress.parameters.bodySize.notes`
  - Draw.io: 2Gi memory limit (in-browser rendering)
- **Remaining risk**: LOW — size limits enforced at ingress level

#### Finding: SQL injection
- **Source**: Pentest finding
- **Impact**: Database compromise via malicious input
- **Mitigation**: All services use parameterized queries via their respective
  ORMs (ActiveRecord for Nextcloud, SQLAlchemy for Notes, Eloquent for
  Laravel-based services, JDBC for XWiki). No raw SQL construction
  from user input detected.
- **Remaining risk**: LOW

### TC-6: Dependency Security

#### Finding: Upstream chart vulnerabilities
- **Source**: Operational monitoring
- **Impact**: Known CVEs in upstream images
- **Mitigation**:
  - Trivy scans on all Helm charts (CI pipeline)
  - Semgrep SAST on Python code
  - Checkov infrastructure-as-code scanning
  - Gitleaks secret scanning
- **Remaining risk**: LOW — automated scanning in CI pipeline

---

## Service-Specific Risk Summary

| Service | Critical | High | Medium | Low | Notes |
|----------|----------|------|--------|-----|-------|
| Keycloak | 1 (token exposure) | 0 | 0 | 2 | Central auth — highest impact |
| Nextcloud | 0 | 1 (no DB backup) | 1 (plaintext logs) | 1 | S3 + MariaDB/PG |
| OpenCloud | 0 | 0 | 2 | 1 | Newer, fewer findings |
| OX AppSuite | 0 | 0 | 2 | 1 | Complex Java app |
| SOGo | 0 | 0 | 1 | 2 | Refresh tokens well-configured |
| Element | 0 | 0 | 1 | 2 | Federation risk if enabled |
| ILIAS | 0 | 1 (no DB backup) | 1 (PHP CVEs) | 0 | PHP exposure |
| Moodle | 0 | 1 (no DB backup) | 1 (PHP CVEs) | 0 | PHP exposure |
| BBB | 0 | 1 (no DB backup) | 0 | 1 | Greenlight Rails |
| Collabora | 0 | 0 | 1 (capabilities) | 2 | Document isolation |
| XWiki | 0 | 1 (no DB backup) | 1 (Java CVEs) | 0 | Dual auth (OIDC+LDAP) |
| Zammad | 0 | 1 (no DB backup) | 0 | 2 | Ruby on Rails |
| Others | 0 | 0-1 | 0-1 | 1-2 | Lower risk |

---

## Recommended Security Improvements

| Priority | Improvement | Effort | Impact |
|----------|-------------|--------|--------|
| P1 | Implement CSI snapshots for RWO PVCs | High | Closes HIGH risk gap |
| P1 | Deploy network policies (Calico Cilium) | Medium | Reduces MEDIUM internal traffic risk |
| P2 | Configure mTLS between services | High | Full internal encryption |
| P2 | Rotate all secrets regularly | Low | Reduces secret exposure risk |
| P3 | Deploy Falco for runtime security | Medium | Detect anomalous container behavior |
| P3 | Implement RBAC audit logging | Low | Track administrative actions |
