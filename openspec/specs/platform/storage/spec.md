<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Storage

## Purpose

Volume provisioning via Ceph CSI operators for database workloads (RWO) and
shared file storage (RWX), with RWO backup exclusion patterns and unit-based
sizing.

## Non-Goals

- Object storage configuration (MinIO/S3, per-service in service specs)
- Backup strategy (see `../backup/spec.md`)

## Requirements

### Requirement: RWO volume provisioning for databases

Database and stateful application workloads SHALL use ReadWriteOnce volumes
provisioned from the `ceph-rbd-ssd` storage class.

RWO PVCs SHALL be annotated with `k8up.io/exclude: "true"` to prevent backup
pods from hanging when they cannot mount multiple RWO PVCs bound to different
nodes.

#### Scenario: Database PVC provisioned from RBD
- GIVEN a database StatefulSet (e.g., PostgreSQL) requesting a persistent volume
- WHEN the PVC is created with `storageClassName: ceph-rbd-ssd`
- THEN the volume is provisioned as a Ceph RBD image on SSD storage
- AND the volume is bound to a single node (ReadWriteOnce)
- AND the PVC has annotation `k8up.io/exclude: "true"`

#### Scenario: RWO backup excluded
- GIVEN a k8up Schedule backing up all PVCs
- WHEN the backup job encounters an RWO PVC
- THEN the PVC is skipped due to `k8up.io/exclude: "true"` annotation
- AND the backup job does not hang attempting to mount multiple RWO PVCs

### Requirement: RWX volume provisioning for shared storage

Shared file storage workloads SHALL use ReadWriteMany volumes provisioned
from the `ceph-cephfs-hdd-ec` storage class.

#### Scenario: Shared storage PVC provisioned from CephFS
- GIVEN a deployment requiring shared file access (e.g., Nextcloud)
- WHEN the PVC is created with `storageClassName: ceph-cephfs-hdd-ec`
- THEN the volume is provisioned as a CephFS subdirectory on the erasure-coded pool
- AND the volume is accessible from multiple nodes simultaneously (ReadWriteMany)
- AND the volume uses HDD erasure-coded storage (3+2 default)

#### Scenario: Sticky bit support for OpenProject
- GIVEN the OpenProject seeder job creating files with setgid in a CephFS PVC
- WHEN the job writes to the PVC
- THEN the sticky bit is preserved
- AND group-owned files inherit the parent directory's group
- AND the OpenProject seeder job completes successfully

### Requirement: Volume sizing units

Storage requests SHALL use standard Ceph CSI units:
- Database PVCs: multiples of 1Ti (e.g., `1Ti`, `2Ti`)
- File sharing PVCs: multiples of 100Gi (e.g., `500Gi`, `1000Gi`)
- Minimal PVCs: minimum 10Gi to prevent provisioning errors

#### Scenario: Database PVC sized correctly
- GIVEN a MariaDB PVC requesting storage
- WHEN the PVC specifies `size: "10Gi"`
- THEN the Ceph RBD image is provisioned with 10Gi capacity
- AND the PVC bound capacity exactly matches the request

### Requirement: Storage class quality of service

- **`ceph-rbd-ssd`**: High IOPS, low latency, SSD-backed, for databases
- **`ceph-cephfs-hdd-ec`**: Throughput-oriented, erasure-coded (3+2), for shared files

#### Scenario: Appropriate storage class selection
- GIVEN a database workload (PostgreSQL)
- WHEN a PVC is requested
- THEN `ceph-rbd-ssd` SHALL be used (not `ceph-cephfs-hdd-ec`)
- AND the PVC annotations specify IOPS requirements if needed

## Storage Classes

| Class | Access Mode | Backend | Use Case | Excluded From Backup |
|-------|-------------|---------|----------|----------------------|
| `ceph-rbd-ssd` | RWO | Ceph RBD on SSD | Databases, stateful apps (Keycloak, PostgreSQL, MariaDB, Redis) | Yes (`k8up.io/exclude: "true"`) |
| `ceph-cephfs-hdd-ec` | RWX | CephFS on HDD (3+2) | Shared files, recordings,attachments (Nextcloud, OpenCloud, BBB, Moodle) | No (included in main backup) |

## RWO PVC Exclusion Rationale

All 29 RWO PVCs are excluded from the main k8up backup schedule because:

1. **Multi-node mounting**: A single backup pod cannot mount RWO PVCs bound to different nodes
2. **Stuck jobs**: Attempting this causes the backup job to hang in `ContainerCreating`
3. **Alternative backup**: Database backups are handled via native tools (`pg_dump`, `mysqldump`) scheduled separately

### Excluded RWO PVCs (29 total)

| Service | PVC Name | Alternative Backup |
|---------|----------|-------------------|
| Keycloak | `data-keycloak-0` | SQL dump via k8up Schedule |
| PostgreSQL | `data-postgresql-0` | `pg_dump` via k8up Schedule |
| MariaDB | `data-mariadb-0` | `mysqldump` via k8up Schedule |
| Redis | `data-redis-0` | Redis RDB snapshot via k8up Schedule |
| OpenLDAP | `data-ldap-0` | Slapcat dump via k8up Schedule |
| ... (other stateful services) | ... | ... |

## HRZ Storage Context

### Ceph Cluster Details

| Property | Value |
|----------|-------|
| Storage System | Ceph (via CSI) |
| CSI Drivers | `rbd.csi.ceph.com` (RBD), `cephfs.csi.ceph.com` (CephFS) |
| SSD Pool | `ceph-rbd-ssd` (for RBD) |
| HDD Pool | `ceph-cephfs-hdd-ec` (erasure-coded 3+2) |
| Namespaces | Separate CephFS namespaces per PVC |

### Storage Sizing Baselines

| Service | PVC | Size | Type | Backup Strategy |
|---------|-----|------|------|-----------------|
| Keycloak | `data-keycloak-0` | 10Gi | RWO | SQL dump |
| PostgreSQL | `data-postgresql-0` | 10Gi | RWO | `pg_dump` |
| MariaDB | `data-mariadb-0` | 10Gi | RWO | `mysqldump` |
| Redis | `data-redis-0` | 1Gi | RWO | RDB snapshot |
| Nextcloud | `nextcloud-data` | 500Gi | RWX | k8up (main schedule) |
| OpenCloud | `opendesk-opencloud-data` | 500Gi | RWX | k8up (main schedule) |
| ILIAS | `ilias-data` | 500Gi | RWX (S3) | k8up (main schedule) |
| BBB | `bbb-recordings` | 500Gi | RWX | k8up (main schedule) |
| Moodle | `moodle-data` | 500Gi | RWX | k8up (main schedule) |

## Depends On

- Ceph CSI drivers (`rbd.csi.ceph.com`, `cephfs.csi.ceph.com`)
- k8up backup operator (main backup schedule)
- PostgreSQL/MariaDB/Redis (native backup jobs)

## Integrates With

- [Backup](./backup/spec.md) (backup schedules, RWO exclusion)
- [Disaster Recovery](./disaster-recovery/spec.md) (RWO recovery procedures)
- [Resource Sizing](./resource-sizing/spec.md) (storage per-service)
- `../_registry/index.md` (Shared Storage table)
