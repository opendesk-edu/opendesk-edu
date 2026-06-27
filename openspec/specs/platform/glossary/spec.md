<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Platform Terminology & Glossary

## Purpose

Defines standardized terminology used across openDesk Edu OpenSpec, including
component names, protocols, tiers, deployment waves, and HRZ-specific concepts.

## Glossary

### Core Platform Components

| Term | Definition |
|------|-------------|
| **Nubus** | Identity and access management platform (Univention GmbH) comprising OpenLDAP, Keycloak, Portal, UMC, UMS REST API. See spec: [services/nubus](../services/nubus/spec.md) |
| **Keycloak** | OIDC/SAML identity provider, issues JWT access tokens to all OIDC clients. Realm: `opendesk`. |
| **OpenLDAP** | User directory service (LDAP_bind), organizational unit (OU) structure: `ou=users`, `ou=groups`. |
| **Portal** | Single-sign-on web page showing application tiles, navigates to services via Intercom silent login. |
| **Intercom Service** | Cross-app token relay backend enabling silent login (OAuth2 → SAML SP) between OIDC and SAML-only services. |
| **UMC (Univention Management Console)** | Admin interface for directory management, stripped-down to IAM-only modules (no DHCP/DNS). |
| **UMS REST API** | Machine provisioning API at `/univention/udm` for OX Connector and CMS systems. |

### Services & Applications

| Term | Definition |
|------|-------------|
| **openDesk CE** | Base platform: Nubus IAM, Collabora, Nextcloud, CryptPad, Draw.io, Excalidraw, Planka, Notes, Etherpad, BookStack, Zammad. |
| **openDesk Edu** | openDesk CE + 25 education services: ILIAS, Moodle, Jitsi/BigBlueButton, XWiki, TYPO3, LimeSurvey, SSP, OpenProject, Element, etc. |
| **oidc-client-secret** | The OAuth2 client secret stored in Kubernetes secrets (e.g., `sogo-sogo-secrets:oidc-client-secret`). |
| **OD_PRIVATE_REGISTRY_USERNAME/PASSWORD** | Environment variables for pulling the private OCI registry charts (e.g., Nextcloud chart hosted on `registry.opencode.de`). |
| **Kecloak realm** | The `opendesk` realm in Keycloak containing all OIDC clients and SP entities. |
| **Shibboleth IdP** | External federation gateway (DFN-AAI/eduGAIN) — NOT Keycloak. See spec: [auth/federation](../auth/federation/spec.md) |

### Networking & Infrastructure

| Term | Definition |
|------|-------------|
| **HAProxy Ingress** | Primary ingress controller on ingress IP 192.168.3.201. Routes external HTTPS → internal Kubernetes Services. |
| **Ingress IP** | 192.168.3.201 — external IP for HAProxy + ingress-nginx (both share the IP). |
| **Body Timeout** | HAProxy ingress timeout for large HTTP bodies (per-service: Collabora 600s, Jitsi 3600s, Notes Y-Provider 86400s). |
| **Proxy** | `http://www-proxy2.uni-marburg.de:3128` — outbound proxy for pods requiring internet access. |
| **DNS CNAME chain issue** | HRZ-specific CoreDNS limitation — external CNAME resolution fails. Workaround: `hostAliases` with ingress IP. |
| **X-Forwarded-Host** | HTTP header set by HAProxy ingress for Draw.io to generate correct internal URLs. |

### Storage Systems

| Term | Definition | Type |
|------|-------------|------|
| **ceph-rbd-ssd** | Ceph RBD SSD-backed storage class, for databases (RWO PVCs). | RWO |
| **ceph-cephfs-hdd-ec** | CephFS erasure-coded (3+2) HDD-backed storage class, for shared files (RWX PVCs). | RWX |
| **k8up** | Kubernetes backup operator (Go), backs up RWX PVCs to S3 (CephFS). |
| **RWO PVC exclusion** | Annotation `k8up.io/exclude: "true"` on all 29 RWO PVCs to prevent backup job hang (cannot mount multiple RWO PVCs simultaneously). |
| **backup-live** | k8up Schedule name for main backup (00:42 UTC daily, backs up RWX PVCs). |

### Deployment Concepts

| Term | Definition |
|------|-------------|
| **Helmfile** | Multi-release Helm deployment orchestration tool, processes releases in deployment wave order. |
| **Deployment Wave** | Phased release ordering (6 waves): 000-migrations, 010-infra, 020-components, 050-stateless, 040-collab, 060-edu. |
| **deployStage** | Kubernetes pod/Service label controlling deployment wave (e.g., `deployStage: 020-components`). |
| **opencode.de registry** | Private OCI registry for openDesk-hosted Helm charts (e.g., Nextcloud, Jitsi). |
| **values.yaml.gotmpl** | Helmfile values file with Go templating (`.yaml.gotmpl` extension). Supports `{{ env "VAR" }}` interpolation. |

### Service Tiers

| Tier | Definition | Services (examples) |
|------|-------------|----------------------|
| **Critical** | Availability-critical, SLO: 99.9% | Keycloak, PostgreSQL, MariaDB, Redis, MinIO |
| **High** | High-impact services, SLO: 99.5% | Nubus Portal, Intercom, Nextcloud, OpenCloud, OX, SOGo, Element |
| **Standard** | Standard LMS/collab services, SLO: 99.0% | ILIAS, Moodle, Jitsi, BBB, Collabora, XWiki |
| **Low** | Supporting tools | Planka, Notes, Etherpad, CryptPad, BookStack, Draw.io, Excalidraw |

### Security Terminology

| Term | Definition |
|------|-------------|
| **Otterize** | Kubernetes intent-based network policy controller, translates `ClientIntent` → `NetworkPolicy`. |
| **ClientIntent / ServerIntent** | Otterize custom resources defining allowed traffic between services. |
| **RuntimeDefault** | Kubernetes seccomp profile (node's default profile) applied to most containers. |
| **Capabilities** | Linux capabilities granted to containers. Default: `drop: ["ALL"]`. |
| **PSA** | Pod Security Admission, enforces `baseline` or `restricted` profile. |
| **GPG/Cosign** | Chart provenance verification. `helmfile/files/gpg-pubkeys/` (GPG), `helmfile/files/cosign-pubkeys/` (Cosign). |
| **MASTER_PASSWORD** | Environment variable for derived password generation. Used in `derivePassword` calls for secrets. |

### Metrics & Monitoring

| Term | Definition |
|------|-------------|
| **ServiceMonitor** | Prometheus Operator CR, scrapes `/metrics` endpoint from pods. |
| **Grafana Dashboard** | Custom Grafana dashboards in `monitoring/` directory. |
| **SLO** | Service Level Objective (performance target, e.g., 99.9% availability). |
| **SLI** | Service Level Indicator (metric measuring SLO compliance). |
| **Alertmanager** | Prometheus alert routing component, routes alerts to email/PagerDuty/Teams. |
| **Probe timing** | Health/Liveness/Startup probe timing (period = `periodSeconds`, delay = `initialDelaySeconds`). |

### Ops & Backup

| Term | Definition |
|------|-------------|
| **k8up Schedule** | k8up CRD defining backup/check/prune/restore schedules. |
| **Restore CR** | k8up CR triggering backup restoration from S3. |
| **Jarvis** | Not applicable (no Jarvis in this platform — confused with Draw.io/jgraph). |
| **Backup live** | Main k8up schedule `backup-live` backs up RWX PVCs (CephFS). |
| **RWO PVC** | ReadWriteOnce volume, bound to single node. Excluded from main backup. |
| **RWX PVC** | ReadWriteMany volume, accessible from multiple nodes. Included in main backup. |

## Spec Format Terminology

| Term | Definition |
|------|-------------|
| **SHALL / MUST** | RFC 2119 requirement (mandatory). |
| **SHOULD** | RFC 2119 recommendation (best practice). |
| **MAY** | RFC 2119 permission (optional). |
| **Scenario** | Testable user story: Given (context), When (action), Then (outcome). |
| **Depends On** | Required infrastructure components. |
| **Integrates With** | Service-to-service integration relationships. |
| **Component Reference** | Replica, storage, and container details table. |
| **Security Context** | RunAsUser, capabilities, seccomp profile table. |

### HRZ-Specific Terminology

| Term | Definition |
|------|-------------|
| **HRZ cluster** | Kubernetes K3s cluster at Uni Marburg (9 nodes: 3 control-plane vhrz2331-2333, 6 workers vhrz2334-2339). |
| **Ceph CSI** | Kubernetes storage drivers: `rbd.csi.ceph.com` (RBD SSD), `cephfs.csi.ceph.com` (CephFS). |
| **containerd** | CRI runtime version 2.0.4-k3s2. |
| **K3s** | Kubernetes distribution version 1.32.3. |
| **ArgoCD** | GitOps deployment controller, syncs `opendesk` namespace manifests from GitLab. |

## Acronym Glossary

| Acronym | Full Form |
|---------|-----------|
| **AAA** | Authentication, Authorization, Accounting |
| **AGPL** | Affero General Public License |
| **BLOB** | Binary Large Object |
| **CephFS** | Ceph Filesystem |
| **CI/CD** | Continuous Integration / Continuous Deployment |
| **CIDR** | Classless Inter-Domain Routing |
| **CRD** | Custom Resource Definition (Kubernetes) |
| **DB** | Database |
| **DFN-AAI** | Deutsches Forschungsnetz Authentication Authorization Infrastructure (German research federation) |
| **eduGAIN** | interfederation for research/education (EuZ eScience) |
| **HA** | High Availability |
| **HAProxy** | High Availability Proxy (load balancer) |
| **HISinOne** | HIS Higher Education Information System (CMS for universities) |
| **HPC** | High Performance Computing |
| **HRZ** | Hochschulrechenzentrum Uni Marburg (University Marburg computing center) |
| **IAM** | Identity and Access Management (Nubus) |
| **ICAP** | Internet Content Adaptation Protocol (virus scanning) |
| **IMAP** | Internet Message Access Protocol (email client) |
| **IP** | Internet Protocol (IPv4/IPv6) |
| **JWT** | JSON Web Token (OAuth2 access token format) |
| **LDAP** | Lightweight Directory Access Protocol (directory service) |
| **LfD** | Learning for Development (German acronym for LMS) |
| **LMS** | Learning Management System (ILIAS, Moodle, etc.) |
| **LTB** | LDAP Tool Box (Self-Service Password uses LTB) |
| **MA** | Michael Alberty (openDesk co-founder, see documentation credits) |
| **MIT** | Massachusetts Institute of Technology (license) |
| **MPL** | Mozilla Public License (Collabora) |
| **OIDC** | OpenID Connect (OAuth2 authentication protocol) |
| **OX** | Open-Xchange (OX AppSuite is OX) |
| **PBX** | Private Branch Exchange (phone system - SSH VOIP utiliza Jigasi para ligações SIP). |
| **SSL/TLS** | Secure Sockets Layer / Transport Layer Security (encrypted HTTP) |
| **SMTP** | Simple Mail Transfer Protocol (email server) |
| **SP** | Service Provider (SAML SP for services) |
| **SSH** | Secure Shell (encrypted remote shell) |
| **S3** | Simple Storage Service (object storage protocol) |
| **TOSCA** | Topology and Orchestration Specification of Applications (not used in this platform) |
| **TOU** | Terms of Use (not used in this platform) |

## See Also

- [API Contracts](../integrations/api-contracts/spec.md) — HTTP endpoint contracts, token formats
- [Deployment](./deployment/spec.md) — Helmfile, deployment waves
- [Networking](./networking/spec.md) — Ingress, DNS, proxy
- [Monitoring](./monitoring/spec.md) — Prometheus, Grafana, alerting
- [Disaster Recovery](./disaster-recovery/spec.md) — Backup restore, failover
