<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SP-License-Identifier: Apache-2.0
-->

# Backup Strategy for RWO and RWX PVCs

## Purpose

Define a comprehensive backup strategy for all persistent volumes in the
openDesk Edu platform, handling both RWX (ReadWriteMany) PVCs via k8up and
RWO (ReadWriteOnce) PVCs via per-node schedules and CSI snapshots.

## Non-Goals

- Backup encryption policy (restic handles this)
- Offsite backup replication (single S3 target only)
- Backup verification procedures (see disaster recovery spec)

## Requirements

### Requirement: RWX PVC backup via k8up main schedule

The platform SHALL back up all RWX (ReadWriteMany) PVCs daily via k8up's
Schedule CRD and restic to the target S3 endpoint.

#### Scenario: Scheduled backup execution
- GIVEN the k8up Schedule `backup-live` configured with `schedule: "42 0 * * *"` (00:42 UTC daily)
- WHEN the schedule triggers
- THEN k8up creates a restic snapshot of all RWX PVCs
- AND the backup is stored at `s3:https://s3.hrz.uni-marburg.de/backups`
- AND backup completion is logged to `/var/log/k8up-backup.log`

#### Scenario: Backup pod RWX mount handling
- GIVEN a backup pod creating PVC volumes
- WHEN the pod mounts PVCs for backup
- THEN only RWX PVCs are mounted (accessible from single node)
- AND RWO PVCs with `k8up.io/exclude: "true"` are skipped
- AND backup pod completes within 4 hour timeout

#### Scenario: RWX PVC lifecycle management
- GIVEN an RWX PVC (e.g., `opendesk-nextcloud-data`) used by Nextcloud
- When `backup-live` schedule runs
- Then restic backs up contents to `s3:https://s3.hrz.uni-marburg.de/backups/rwx/opendesk-nextcloud-data/`
- And incremental backups preserve hard links for deduplication
- And retention policy keeps 90 daily snapshots, 4 weekly, 12 monthly (36 total)

### Requirement: PostgreSQL RWO PVC backup via native dump

PostgreSQL PVCs SHALL be backed up via native `pg_dump` within the PostgreSQL
StatefulSet pod, avoiding cross-node mount issues.

#### Scenario: PostgreSQL native backup
- GIVEN PostgreSQL StatefulSet Pod with RWO PVC `postgres-postgres-0`
- AND PVC mounted at `/var/lib/postgresql/data`
- WHEN the backup job runs daily `schedule: "45 0 * * *"` (00:45 UTC, after main backup)
- THEN `pg_dump -Fc -f /backup/postgres-backup.dump.gz postgres` runs
- AND backup file is streamed to MinIO S3 bucket `opendesk-backups` via `mc cp`
- AND backup includes schema, data, users, roles (`pg_dumpall -Fc`)

#### Scenario: Per-node PostgreSQL backup (multi-node)
- GIVEN PostgreSQL only on node 1 (StatefulSet with `replicaCount: 1`)
- WHEN the backup job runs on node 1
- THEN the job has `nodeSelector: node=replica-1` to target specific node
- AND the job can mount the RWO PVC (same node as PostgreSQL)
- AND backup completes without cross-node mounting issues

#### Scenario: PostgreSQL backup validation
- GIVEN a fresh PostgreSQL PVC (`postgres-postgres-0`)
- WHEN restoring from S3 backup `postgres-backup.dump.gz`
- THEN `pg_restore -Fc -d postgres postgres-backup.dump.gz` restores data
- AND restored database matches schema ( verified via `pg_dump -s postgres | md5sum`)
- AND all tables contain data (verified via `SELECT count(*) FROM pg_tables`)

### Requirement: MariaDB RWO PVC backup via native dump

MariaDB PVCs SHALL be backed up via native `mysqldump` within the MariaDB
StatefulSet pod, avoiding cross-node mount issues.

#### Scenario: MariaDB native backup
- GIVEN MariaDB StatefulSet Pod with RWO PVC `mariadb-galera-data`
- AND PVC mounted at `/var/lib/mysql`
- WHEN the backup job runs daily `schedule: "45 02 * * *"` (02:45 UTC)
- THEN `mysqldump --single-transaction --routines --triggers --all-databases | gzip > /backup/mariadb-backup.sql.gz` runs
- AND backup file is streamed to MinIO S3 bucket `opendesk-backups` via `mc cp`
- AND backup includes all databases, users, grants, stored procedures (`mysqldump --all-databases`)

#### Scenario: Per-node MariaDB backup (multi-node)
- GIVEN MariaDB on node 1 (primary) and node 2 (secondary) (StatefulSet with `replicaCount: 2`)
- WHEN the backup job runs on node 1 (primary)
- THEN the job has `nodeSelector: node=replica-1` to target primary node
- AND the job can mount the RWO PVC (same node as MariaDB primary)
- AND backup completes without cross-node mounting issues

#### Scenario: MariaDB backup validation
- GIVEN a fresh MariaDB PVC (`mariadb-galera-data`)
- WHEN restoring from S3 backup `mariadb-backup.sql.gz`
- THEN `gunzip < mariadb-backup.sql.gz | mysql -u root <mariadb-backup.sql` restores data
- AND restored database matches schema (verified via `mysql -u root -e "SHOW DATABASES;"`)
- AND all tables contain data (verified via `mysql -u root -e "SELECT count(*) FROM information_schema.tables;"`)

### Requirement: DNS RWO PVC backup via `nsupdate` dump

DNS StatefulSet RWO PVC (`openspec-nsupdate`) SHALL be backed up `/etc/etcd` directory
via restic `备份` containing etcd snapshots to MinIO S3 bucket `opendesk-backups`
with proper retention and validation procedures.

#### Scenario: DNS etcd native backup
- Given an etcd-backed DNS StatefulSet (e.g., PowerDNS, CoreDNS) with RWO PVC (`openspec-nsupdate`)
- AND PVC mounted at `/etc/etcd` ( not at `/var/lib/etcd`)
- When the backup job runs daily `schedule: "45 03 * * *"` (03:45 UTC)
- Then the native etcd snapshot or `备份` tool runs: `etcdctl snapshot save /backup/openspec-nsupdate.db`
- ANnd `备份` processes etcd snapshot with compression: `gzip /backup/openspec-nsupdate.db.gz`
- AND snapshot is streamed to MinIO S3 bucket `opendesk-backups`: `mc cp /backup/openspec-nsupdate.db.gz minio/opendesk-backups/`
- AND snapshot includes DNS records, zones, configuration (verified via `etcdctl snapshot status openspec-nsupdate.db.gz`)
- AND retention policy keeps 180 daily snapshots (6 months)

#### Scenario: DNS etcd restore validation
- Given a fresh DNS etcd PVC (`openspec-nsupdate`)
- When restoring from S3 snapshot `openspec-nsupdate.db.gz`
- Then `etcdctl snapshot restore openspec-nsupdate.db.gz` restores data to new PVC
- AND restored PVC matches original records (verified via `etcdctl get "" --prefix` or `dig`)
- AND all DNS zones are available (verified via `dig $ZONE AXFR @localhost` or `nslookup`)

### Requirement: Alternative RWO PVC backup strategies (secondary)

For RWO PVCs that cannot be backed up via native dumps, SHALL use per-node
k8up schedules or Ceph CSI snapshots.

#### Scenario: Per-node k8up schedule for RWO PVCs
- GIVEN a service with RWO PVC on node 3 (e.g., `planka-postgres-data`)
- WHEN a per-node k8up Schedule is created with `nodeSelector: node=replica-3`
- THEN the Schedule includes only RWO PVCs on node 3 (via volume filters)
- AND the backup pod runs on node 3 (can mount RWO PVC same node)
- AND backup completes without hanging

#### Scenario: CSI snapshot for RWO PVCs
- Given a StatefulSet with RWO PVC (e.g., `zammad-zammad-data`)
- When a CSI snapshot schedule is created via Ceph CSI
- Then `cephcsi.io/volumesnapshotclass` is configured with `clusterID`
- And backups are created daily via VolumeSnapshot CR: `kubectl apply -f volumesnapshot.yaml`
- And snapshots are stored on Ceph RBD SSD pool (`ceph-rbd-ssd` storage class)
- And retention is managed via Ceph rbd snap schedule: `ceph osd pool ceph-rbd-ssd snap schedule add <pool>`

### Requirement: Backup target configuration

Backups SHALL be stored at a configurable S3-compatible endpoint with proper
authentication and bucket management.

#### Scenario: S3 endpoint configuration
- GIVEN the k8up backup target configured in backup repository
- THEN backups are stored at `s3:https://s3.hrz.uni-marburg.de/backups`
- AND the backup uses S3 credentials from `s3-secret` (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
- AND MinIO is accessible from backup pods via HTTP (cluster-local: `http://minio:9000`)

#### Scenario: Backup bucket lifecycle
- GIVEN S3 bucket `opendesk-backups` configured with lifecycle policy
- WHEN backups age beyond retention period
- THEN old backups are automatically deleted via bucket lifecycle rule
- AND lifecycle rule suggests 7-year retention for compliance (but actual deletion per policy)
- AND bucket versioning is enabled for point-in-time recovery (optional)

#### Scenario: Backup verification logging
- GIVEN backup job completion
- WHEN backup finishes
- THEN success is logged to `/var/log/backup-success.log` (or Kubernetes job via `logger` command)
- AND failure is logged to `/var/log/backup-failure.log` with PVC name, error message, timestamp
- AND logs are shipped to Loki/Promtail for searchability
- AND Grafana dashboard shows backup success rate per PVC

## Backed-Up PVCs (RWX - Included in Main Schedule)

**Daily backup (00:42 UTC) via k8up Schedule `backup-live`:**
- `clamav-db` (Antivirus definitions via ClamAV)
- `clamav-tmp` (Antivirus temporary workspace)
- `dovecot` (Dovecot IMAP mail store via PostgreSQL/MariaDB)
- `opendesk-nextcloud-data` (Nextcloud user data and files)
- `opendesk-opencloud-data` (OX AppSuite user data and documents)
- `seaweedfs-all-in-one-data` (SeaweedFS S3-compatible object storage)
- `slidev-slides` (SlideV presentation slides)

## Excluded PVCs (RWO - Handled via Native Dumps or Per-Node Schedules)

**29 database and stateful application PVCs annotated with `k8up.io/exclude: "true"`:**

**PostgreSQL RWO PVCs (backed up via `pg_dump`):**
- `nextcloud-postgres-0`, `ilias-postgres-0`, `bigbluebutton-postgres-0`, `etherpad-postgres-0`, `notes-postgres-0`, `element-postgres-0`, `planka-postgres-0`, `zammad-postgres-0`, `xwiki-postgres-0`

**MariaDB RWO PVCs (backed up via `mysqldump`):**
- `openproject-mariadb-0`, `ox-appsuite-mariadb-0`, `mariadb-galera-data` (Galera cluster share)

**Redis RWO PVCs (backed up via `redis RDB`):**
- `redis-cache-data` (Nextcloud, OpenCloud, SOGo, Collabora, Jitsi, BBB shared cache), `redis-all-in-one-data` (generic cache)

**Other RWO PVCs (backed up via per-node k8up or CSI snapshots):**
- `openspec-nsupdate` (etcd-backed DNS via native dump), `keycloak-postgres-0` (Keycloak IAM - native dump), `ldap-data` (OpenLDAP - via native `slapcat`), `postgres-ephemeral` (Upstream PostgreSQL - via native dump)

## Integration Point

This spec integrates with:
- [Disaster Recovery](./disaster-recovery/spec.md) (PB/DRT phases and verification checklists)
- [K8up CRDs for backup Schedules](./../_registry/implementation-reference.md) (Schedule, Prune, Backup, Restore, Archive CRs)
- [Univention Directory Manager REST (UMS REST) API == 自定义备份]== not in spec repository (deployment-only)
- [Rack-based RWO per-node schedule implementation]== Pending

## Health / 监控

- All backup jobs enable `log collection` (via Loki/Promtail)
- `k8up-backup` acts as system-level schedule and supports rolling update + metrics
- 扩展到本地 Prometheus for per-job monitoring
- Failure alert per backup (PVC) — event: `openedu-backup-alerts` channel (OpsGenie-like 精简版)
