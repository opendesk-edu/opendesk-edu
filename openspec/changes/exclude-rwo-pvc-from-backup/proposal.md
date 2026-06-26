<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Exclude RWO PVCs from k8up Backup Schedule

## Status: PROPOSED

**Date proposed:** 2026-06-25
**Phase:** EXECUTE

## Motivation

The k8up `backup-live` Schedule backs up all PVCs including RWO (ReadWriteOnce) PVCs. RWO PVCs bound to pods on different nodes cannot be mounted simultaneously by the backup pod, causing it to hang in `ContainerCreating`. Stuck backup jobs waste cluster resources and require manual cleanup.

## Delta Specs

### ADDED
- Annotation `k8up.io/exclude: "true"` on all 29 RWO PVCs

### MODIFIED
- `openspec/specs/platform/backup/spec.md` — Add requirement: RWO PVCs SHALL be excluded from main backup schedule; add scenario for separate backup strategy
- `openspec/specs/_registry/index.md` — Add storage class column (RWO vs RWX) to Shared Storage table

### REMOVED
- (none)

## Affected Specs

- `openspec/specs/platform/backup/spec.md`
- `openspec/specs/platform/storage/spec.md`
- `openspec/specs/_registry/index.md`

## Acceptance Criteria

1. All RWO PVCs have `k8up.io/exclude: "true"` annotation
2. Main backup schedule only backs up RWX PVCs
3. Backup pod no longer hangs on RWO PVC mounts
4. Behavioral spec updated with RWO exclusion requirement
