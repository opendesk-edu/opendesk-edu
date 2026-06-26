<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Exclude RWO PVCs from k8up Backup Schedule — Tasks

## Wave 1: Identify and Annotate
1. List all RWO PVCs across all namespaces: `kubectl get pvc -A -o json | jq '.items[] | select(.spec.accessModes[] == "ReadWriteOnce")'`
2. Annotate each with `kubectl annotate pvc <name> -n <ns> k8up.io/exclude="true"`
3. Verify annotation applied: `kubectl get pvc -A --show-labels | grep k8up.io/exclude`

## Wave 2: Update Helm Configuration
4. Add PVC annotation template to `helmfile/apps/opendesk-services/values.yaml.gotmpl`
5. Add label selector to k8up Schedule CRD in values
6. `helm lint` the affected chart
7. `helm template` to verify rendered manifests

## Wave 3: Update Specs
8. Add RWO exclusion scenario to `openspec/specs/platform/backup/spec.md`
9. Update `openspec/specs/_registry/index.md` storage table with access modes

## Wave 4: Verify
10. Trigger manual k8up backup: `kubectl create job --from=k8up/backup-live manual-backup-test`
11. Verify backup pod mounts only RWX PVCs (no `ContainerCreating` hang)
12. Verify backup completes within timeout
13. Archive this change to `openspec/archive/`
