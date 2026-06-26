<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Storage

## Purpose

Volume provisioning via Ceph CSI for database workloads (RWO) and shared
file storage (RWX).

## Non-Goals

- Object storage configuration (MinIO/S3, per-service in service specs)
- Backup strategy (see `../backup/spec.md`)

## Requirements

### Requirement: RWO volume provisioning for databases

Database and stateful application workloads SHALL use ReadWriteOnce volumes
provisioned from the `ceph-rbd-ssd` storage class.

#### Scenario: Database PVC provisioning
- GIVEN a database StatefulSet requesting a persistent volume
- WHEN the PVC is created
- THEN the volume is provisioned from `ceph-rbd-ssd`
- AND the volume is bound to a single node
- AND the volume uses SSD-backed Ceph RBD storage

### Requirement: RWX volume provisioning for shared storage

Shared file storage workloads SHALL use ReadWriteMany volumes provisioned
from the `ceph-cephfs-hdd-ec` storage class.

#### Scenario: Shared storage PVC provisioning
- GIVEN a deployment requiring shared file access from multiple pods/nodes
- WHEN the PVC is created
- THEN the volume is provisioned from `ceph-cephfs-hdd-ec`
- AND the volume is accessible from multiple nodes simultaneously
- AND the volume uses HDD erasure-coded CephFS storage

### Requirement: Sticky bit support

The volume provisioner SHALL support the sticky bit for file permission
preservation.

#### Scenario: OpenProject seeder job with sticky bit
- GIVEN the OpenProject seeder job creating files with setgid
- WHEN the job writes to a PVC
- THEN the sticky bit is preserved
- AND the OpenProject seeder job completes successfully

## Storage Classes

| Class | Access Mode | Backend | Use Case |
|:------|:------------|:--------|:---------|
| `ceph-rbd-ssd` | RWO | Ceph RBD on SSD | Databases, stateful apps |
| `ceph-cephfs-hdd-ec` | RWX | CephFS on HDD (erasure-coded) | Shared files, recordings |
