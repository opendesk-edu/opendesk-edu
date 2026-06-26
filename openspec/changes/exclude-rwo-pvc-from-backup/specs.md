<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Exclude RWO PVCs from k8up Backup Schedule — Delta Specs

## ADDED
- PVC annotations: `k8up.io/exclude: "true"` on 29 RWO database/application PVCs
- Label selector on k8up Schedule: `k8up.io/backup: "true"` on RWX PVCs only

## MODIFIED
- `openspec/specs/platform/backup/spec.md`:
  - Add `### Requirement: RWO PVC exclusion` with scenario
  - Update backup target config to reference label selector
- `openspec/specs/_registry/index.md`:
  - Add `Access` column to Shared Storage table (RWO vs RWX)
  - Add `Backup` column showing k8up inclusion status
- `helmfile/apps/opendesk-services/values.yaml.gotmpl`:
  - Add k8up Schedule label selector to skip annotated PVCs

## REMOVED
- (none)
