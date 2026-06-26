<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-Identifier: Apache-2.0
-->

# Backup

## Purpose

Daily restic-based backup of RWX PVCs via k8up, with RWO PVC exclusion to
prevent backup pod hangs.

## Non-Goals

- Backup encryption policy (restic handles this)
- Disaster recovery procedures (see `docs/disaster-recovery.md`)

## Requirements

### Requirement: Daily RWX backup via k8up

The platform SHALL back up all RWX (ReadWriteMany) PVCs daily via k8up's
Schedule CRD and restic.

#### Scenario: Scheduled backup execution
- GIVEN the k8up Schedule `backup-live` configured with a daily cron expression
- WHEN the schedule triggers (00:42 UTC daily)
- THEN k8up creates a restic snapshot of all RWX PVCs
- AND the backup is stored at the configured S3 endpoint

### Requirement: RWO PVC exclusion

RWO PVCs SHALL be excluded from the k8up backup schedule to prevent the backup pod
from hanging in ContainerCreating state (cannot mount RWO PVCs from multiple nodes).

#### Scenario: RWO PVC annotated for exclusion
- GIVEN PVCs with the annotation `k8up.io/exclude: "true"`
- WHEN the k8up Schedule runs
- THEN those PVCs are NOT included in the backup
- AND the backup pod does not attempt to mount them

#### Scenario: Backup pod completes without hanging
- GIVEN all RWO PVCs properly excluded
- WHEN the backup pod starts
- THEN it mounts only RWX PVCs (all accessible from one node)
- AND the backup completes within the configured timeout

### Requirement: Backup target configuration

Backups SHALL be stored at a configurable S3-compatible endpoint.

#### Scenario: Backup stored at configured S3 endpoint
- GIVEN the k8up backup target configured
- THEN backups are stored at `s3:https://s3.hrz.uni-marburg.de/backups`
- AND the backup uses configured S3 credentials

## Backed-Up PVCs (RWX)

`clamav-db`, `clamav-tmp`, `dovecot`, `opendesk-opencloud-data`,
`seaweedfs-all-in-one-data`, `slidev-slides`

## Excluded PVCs (RWO)

29 database and stateful application PVCs annotated with `k8up.io/exclude: "true"`.
