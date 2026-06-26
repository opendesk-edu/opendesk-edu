<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Disaster Recovery Runbook

## Purpose

Defines the recovery order, RPO/RTO targets, verification procedures, and
responsibilities for restoring the openDesk Edu platform from backup or
complete cluster failure. This spec serves as the authoritative recovery
reference for platform operators.

## Non-Goals

- Backup scheduling and configuration (see `../platform/backup/spec.md`)
- Individual service troubleshooting (see per-service specs)
- Hardware replacement procedures (node-level, handled by HRZ infrastructure)

---

## RPO / RTO Targets

| Tier | Services | RPO | RTO |
|------|----------|-----|-----|
| **Critical** | Keycloak, OpenLDAP, Nubus Portal | 1 hour | 30 minutes |
| **High** | Nextcloud/OpenCloud, PostgreSQL, MariaDB | 24 hours | 2 hours |
| **Medium** | ILIAS, Moodle, BBB, OX/SOGo, Element | 24 hours | 4 hours |
| **Low** | CryptPad, Draw.io, Excalidraw, Notes | 7 days | 8 hours |
| **Infrastructure** | HAProxy Ingress, Cert Manager, Prometheus | N/A | 15 minutes |

---

## Recovery Order

Services MUST be restored in this exact order. Each phase depends on the
previous phase completing successfully.

### Phase 0: Infrastructure (RTO: 15 minutes)

1. **Verify node health**: `kubectl get nodes` — all nodes must be `Ready`
2. **Restore Ceph**: Verify Ceph cluster health (`ceph -s`), ensure RBD and CephFS pools healthy
3. **Restore networking**: Verify HAProxy Ingress, CoreDNS, Calico/Cilium CNI
4. **Restore Cert Manager**: Verify cluster issuer, reissue certificates if needed
5. **Verify storage classes**: `kubectl get sc` — `ceph-rbd-ssd` and `ceph-cephfs-hdd-ec` must exist

### Phase 1: Authentication (RTO: 30 minutes)

1. **Restore PostgreSQL** (if data lost): `kubectl apply` the StatefulSet, verify pods running
   - DB: `nubus`, `element`, `bigbluebutton`, `ilias`, `moodle`, `etherpad`, `planka`, `zammad`, `xwiki`, `openproject`, `nextcloud`
   - NOTE: PostgreSQL PVCs are RWO and excluded from k8up — need CSI snapshots or manual pg_dump/pg_restore
2. **Restore MariaDB** (if data lost): Same procedure
   - DB: `nextcloud` (if MariaDB), `opendesk-opencloud`, `sogo`, `bookstack`, `limesurvey`, `typo3`
3. **Restore Redis**: `kubectl apply` the StatefulSet, verify pods running
4. **Restore Keycloak**: Apply StatefulSet, verify `ums-keycloak-0` is running, test login at `/realms/opendesk`
5. **Restore OpenLDAP**: Apply StatefulSet, verify `ldap` service is reachable, test bind
6. **Restore Nubus Portal**: Apply Deployment, verify portal tiles load

### Phase 2: Core Services (RTO: 2 hours)

1. **Restore MinIO/S3**: Apply StatefulSet, verify buckets exist and accessible
2. **Restore Nextcloud OR OpenCloud** (mutually exclusive):
   - Apply AIO Deployment + Notify Push + Exporter
   - Verify S3 connection and OIDC auth
   - Run `occ status` to confirm healthy
3. **Restore OX AppSuite OR SOGo** (mutually exclusive):
   - Apply Deployment, verify IMAP/SMTP/LDAP connectivity
   - Test mail delivery
4. **Restore Element**: Apply Deployment, verify Synapse homeserver connectivity
5. **Restore XWiki**: Apply Deployment, verify PostgreSQL connection and LDAP sync

### Phase 3: Education Services (RTO: 4 hours)

1. **Restore ILIAS**: Apply Deployment + init container + SSO check cronjob
   - Verify Shibboleth SP config, Lucene RPC server, database
2. **Restore Moodle**: Apply Deployment, verify Shibboleth SP, external MariaDB
3. **Restore BigBlueButton**: Apply Greenlight Deployment, verify PostgreSQL + BBB backend
4. **Restore Etherpad**: Apply StatefulSet (PostgreSQL) + Deployment

### Phase 4: Support Services (RTO: 8 hours)

1. **Restore OpenProject**: Apply Deployment, verify PostgreSQL and Nextcloud integration
2. **Restore Zammad**: Apply Deployment, verify PostgreSQL
3. **Restore LimeSurvey**: Apply Deployment, verify MariaDB
4. **Restore TYPO3**: Apply Deployment, verify MariaDB
5. **Restore Self-Service Password**: Apply Deployment, verify LDAP connectivity

### Phase 5: Stateless Services (RTO: 8 hours)

1. **Restore CryptPad**: Apply Deployment (no persistent data beyond S3)
2. **Restore Collabora**: Apply Deployment, verify WOPI connection to Nextcloud/OpenCloud
3. **Restore Draw.io, Excalidraw**: Apply Deployments (fully stateless)
4. **Restore Notes**: Apply Deployment
5. **Restore Planka**: Apply Deployment, verify PostgreSQL

---

## Verification Checklist

After each phase, run the corresponding verification:

### Phase 0 Verification

```bash
# All nodes Ready
kubectl get nodes -o wide
# Ceph healthy
ceph -s
# Ingress accessible
curl -sk https://localhost/healthz
# Storage classes exist
kubectl get sc ceph-rbd-ssd ceph-cephfs-hdd-ec
```

### Phase 1 Verification

```bash
# PostgreSQL databases reachable
for db in nubus element bigbluebutton ilias moodle xwiki openproject; do
  kubectl exec -n opendesk postgresql-0 -- pg_isready -d $db
done
# Keycloak health
curl -sk https://id.opendesk.hrz.uni-marburg.de/realms/opendesk
# OpenLDAP bind
ldapsearch -x -H ldap://openldap -D "uid=admin,cn=users,dc=opendesk,dc=edu" -w <pw> -b "ou=users,dc=opendesk,dc=edu" "(uid=admin)"
# Nubus portal
curl -sk https://portal.opendesk.hrz.uni-marburg.de/univention/portal/
```

### Phase 2 Verification

```bash
# S3 buckets accessible
mc ls minio/nextcloud-data
mc ls minio/opendesk-opencloud
# Nextcloud OIDC login
curl -sk -o /dev/null -w "%{http_code}" "https://nextcloud.opendesk.hrz.uni-marburg.de/status.php"
# OX/SOGo login test
curl -sk "https://ox.opendesk.hrz.uni-marburg.de/appsuite/api" -o /dev/null -w "%{http_code}"
```

### Phase 3-5 Verification

```bash
# For each service, verify:
# 1. Pod is Running: kubectl get pods -l app=<service>
# 2. Health probe passes: kubectl describe pod <pod> | grep -A5 Liveness
# 3. Ingress responds: curl -sk -o /dev/null -w "%{http_code}" https://<service>.opendesk.hrz.uni-marburg.de/
```

---

## Data Recovery Procedures

### RWX PVC Recovery (k8up backup)

RWX PVCs are backed up daily via k8up to `s3:https://s3.hrz.uni-marburg.de/backups`.

1. List available snapshots: `restic -r s3:https://s3.hrz.uni-marburg.de/backups snapshots --tag k8up`
2. Find snapshot for target PVC by date/tag
3. Restore to temp directory: `restic -r s3:https://s3.hrz.uni-marburg.de/backups restore <snapshot> --target /tmp/restore`
4. Copy restored data to the PVC: `kubectl cp /tmp/restore/<pvc-name>/ <namespace>/<pod>:/data/`

### RWO PVC Recovery (NOT backed up by k8up)

RWO PVCs (databases, stateful apps) are excluded from k8up. Recovery options:

1. **CSI Snapshots**: If Ceph RBD snapshots are configured, restore from CSI snapshot
2. **pg_dump / mysqldump**: If periodic logical dumps exist, restore from dump file
3. **Cold backup**: If PVC data was manually backed up, restore from backup

**TODO**: Implement per-node k8up schedules or CSI snapshot schedules for RWO PVCs.

### S3 Bucket Recovery

MinIO data is stored on Ceph RBD PVCs. If MinIO PVC is lost:

1. Restore MinIO PVC from Ceph RBD snapshot
2. Verify bucket integrity: `mc admin info minio`
3. If bucket data is corrupted, restore from k8up backup of the RWX service that uses it

---

## Failure Scenarios

### Scenario: Single node failure

1. K3s automatically reschedules pods to healthy nodes
2. StatefulSet pods (Keycloak, PostgreSQL, MariaDB) may need manual PVC reattachment
3. Verify: `kubectl get pods --all-namespaces -o wide | grep -v Running`

### Scenario: Ceph cluster failure

1. ALL PVCs (RBD and CephFS) become read-only or unavailable
2. Pods using PVCs enter `ContainerCreating` or `CrashLoopBackOff`
3. Recovery: Contact HRZ storage team, restore Ceph cluster
4. After Ceph recovery: pods resume automatically

### Scenario: Keycloak failure

1. No new logins succeed
2. Existing sessions remain valid until token expiry (5 minutes for access tokens)
3. Intercom silent login fails → cross-app workflows break
4. Recovery: Restart Keycloak pod, verify PostgreSQL connectivity
5. If data lost: Restore `keycloak` database from backup

### Scenario: HAProxy Ingress failure

1. ALL external access to services is unavailable
2. Internal cluster communication continues (services can talk to each other)
3. Recovery: Restart ingress controller pods, verify LoadBalancer service IP (192.168.3.201)

### Scenario: DNS failure (CoreDNS)

1. Internal service discovery fails
2. External resolution fails (SERVFAIL on CNAME chains is known HRZ issue)
3. Recovery: Restart CoreDNS pods, verify `/etc/resolv.conf` on nodes

---

## Known Limitations

| Limitation | Impact | Mitigation |
|-----------|--------|------------|
| RWO PVCs not backed up by k8up | Database loss requires CSI snapshots or manual dumps | Implement per-node schedules |
| No automated DR testing | Recovery procedures may have undiscovered gaps | Quarterly DR drills |
| Single Ceph cluster | Storage failure affects ALL services | HRZ manages Ceph HA |
| No cross-site replication | No geographic redundancy | Future: DR site |
| MariaDB password staleness | Restored MariaDB may have outdated Helm-deployed password | `ALTER USER` sync after restore |
