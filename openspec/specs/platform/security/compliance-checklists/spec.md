<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Compliance Checklists

Pre-deployment and periodic compliance verification checklists for critical
platform services. Each checklist maps to specific spec requirements and
MUST be completed before production deployment and after each upgrade.

## Keycloak (OIDC/SAML IdP)

### Pre-Deployment Checklist

- [ ] Realm `opendesk` created with required client scopes
- [ ] All 19 OIDC/SAML clients registered with correct redirect URIs
- [ ] Client secrets stored in Kubernetes secrets (NOT in values files)
- [ ] Brute-force protection enabled (NEVER disabled in production)
- [ ] LDAP user federation configured (sync from OpenLDAP)
- [ ] Session timeout configured (default 30 minutes)
- [ ] Admin console access restricted to internal network
- [ ] HTTPS enforced (no HTTP access to admin console)

### Post-Upgrade Checklist

- [ ] All client secrets still match Kubernetes secrets
- [ ] User federation sync still operational
- [ ] Token issuance latency < 500ms under load
- [ ] Existing sessions remain valid after upgrade

## PostgreSQL (shared database cluster)

### Pre-Deployment Checklist

- [ ] TLS between client pods and PostgreSQL enabled
- [ ] Replication configured (if HA profile)
- [ ] Connection pooling configured (PgBouncer or built-in)
- [ ] Per-database credentials stored in Kubernetes secrets
- [ ] `max_connections` set appropriately for 11 services
- [ ] Automated backups configured (k8up or pg_dump)

### Post-Upgrade Checklist

- [ ] All 11 services can connect to their databases
- [ ] No orphan connections from previous version
- [ ] Replication lag < 1 second (if HA)

## MariaDB (shared database cluster)

### Pre-Deployment Checklist

- [ ] ILIAS MariaDB Galera cluster quorum verified (3 nodes)
- [ ] External Moodle MariaDB reachable from Moodle pods
- [ ] Per-database credentials stored in Kubernetes secrets
- [ ] TLS between client pods and MariaDB enabled
- [ ] Password synchronization verified (Helm-managed vs. running instance)

### Post-Upgrade Checklist

- [ ] All 8 services can connect to their databases
- [ ] Galera cluster status: `wsrep_cluster_status: Primary`
- [ ] MariaDB password matches Helm-managed secret (run `ALTER USER` if needed)

## MinIO / S3 (object storage)

### Pre-Deployment Checklist

- [ ] Bucket per-service isolation configured
- [ ] Access keys stored in Kubernetes secrets
- [ ] Lifecycle policies configured for temporary uploads
- [ ] Quota limits set per bucket (prevent runaway storage)

### Post-Upgrade Checklist

- [ ] All 6 services can read/write to their buckets
- [ ] Object versioning still enabled
- [ ] Backup target `s3:https://s3.hrz.uni-marburg.de/backups` reachable

## Keycloak Adapter Services (OIDC clients)

### Services Requiring OIDC Client Verification

| Service | Client ID | Required Scopes |
|---------|-----------|-----------------|
| SOGo | `sogo` | `openid, email, profile` |
| OpenCloud | `opendesk-opencloud` | `openid, email, profile` |
| Element | `opendesk-matrix` | `openid, profile` |
| Jitsi | `opendesk-jitsi` | `opendesk-jitsi-scope` |
| XWiki | `opendesk-xwiki` | `opendesk-xwiki-scope` |
| Planka | `planka` | `openid, email, profile` |
| Etherpad | `opendesk-etherpad` | `openid, email, profile` |
| Notes | `opendesk-notes` | `openid, email, profile` |
| TYPO3 | `opendesk-typo3` | `openid, email, profile` |

### SAML Service Providers

| Service | Entity ID | NameID Format |
|---------|-----------|---------------|
| Nextcloud | `https://nextcloud.opendesk.hrz.uni-marburg.de` | `persistent` |
| OX AppSuite | `https://ox.opendesk.hrz.uni-marburg.de` | `persistent` |
| BigBlueButton | `https://bbb.opendesk.hrz.uni-marburg.de` | `persistent` |
| ILIAS | `https://ilias.opendesk.hrz.uni-marburg.de` | `transient` |
| Moodle | `https://moodle.opendesk.hrz.uni-marburg.de` | `transient` |
| BookStack | `https://bookstack.opendesk.hrz.uni-marburg.de` | `persistent` |
| Zammad | `https://zammad.opendesk.hrz.uni-marburg.de` | `persistent` |
| OpenProject | `https://openproject.opendesk.hrz.uni-marburg.de` | `persistent` |

## LDAP-Dependent Services

| Service | Bind Method | Search Base | Special |
|---------|-------------|-------------|---------|
| LimeSurvey | Simple bind | User tree | Read-only access |
| Self-Service Password | Simple bind | User tree | Write access (password change) |
| SOGo | SASL bind | User + group trees | Address book sync |
| XWiki | Simple bind | Group tree | Group `opendeskKnowledgemanagementGroup` |
| Keycloak | LDAP federation | Full tree | User sync + group sync |

## Brute-Force Protection Verification

The following services MUST have brute-force protection enabled in
production. Disabling brute-force protection is NEVER permitted.

| Service | Protection Mechanism | Verification Command |
|---------|---------------------|----------------------|
| Keycloak | Built-in Brute Force Detection | Check realm settings |
| Nextcloud | `auth.bruteforce.protection.enabled: true` | Occ web UI |
| OX AppSuite | Built-in login failure lockout | Admin UI |
| SOGo | Fail2Ban or equivalent | Check fail2ban status |
| Element/Synapse | `rc_login_address` rate limit | Synapse config |

## Depends On

- Keycloak (client registry)
- PostgreSQL (client secrets storage)
- Kubernetes secrets management

## Integrates With

- `../security/spec.md` (network policies, Pod Security Admission)
- `../security/threat-model/spec.md` (threat mitigations)
- `../monitoring/spec.md` (SLO verification)
- `../disaster-recovery/spec.md` (recovery verification)
- `../upgrade-migration/spec.md` (post-upgrade checklists)
