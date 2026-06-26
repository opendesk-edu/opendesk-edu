<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Fix Nextcloud AIO Readiness Probe — Tasks

## Wave 1: Patch Running Deployment
1. `kubectl get deploy -n opendesk -l app.kubernetes.io/name=nextcloud -o yaml > nextcloud-deploy-backup.yaml`
2. Patch deployment with correct probe values via `kubectl patch`
3. Monitor pod restarts: `kubectl get pods -n opendesk -l app.kubernetes.io/name=nextcloud -w`
4. Verify PHP-FPM process count returns to normal (1x)

## Wave 2: Persist in Helm Values
5. Add probe override section to `helmfile/apps/nextcloud/values.yaml.gotmpl`
6. `helm lint` the Nextcloud release
7. `helm template` to verify probe configuration in rendered output

## Wave 3: Add Tests
8. Create helm unittest verifying `periodSeconds` is set on readinessProbe and startupProbe
9. Create helm unittest verifying `initialDelaySeconds` is NOT set
10. `helm unittest` passes

## Wave 4: Update Specs
11. Add probe timing requirement to `openspec/specs/services/nextcloud/spec.md`
12. Archive this change to `openspec/archive/`

## Wave 5: Verify
13. `helmfile sync` with updated values
14. New rollout uses correct probe config
15. No restart loop observed over 24h
