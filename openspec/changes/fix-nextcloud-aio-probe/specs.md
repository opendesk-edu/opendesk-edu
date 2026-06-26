<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Fix Nextcloud AIO Readiness Probe — Delta Specs

## ADDED
- Probe override values in `helmfile/apps/nextcloud/values.yaml.gotmpl`:
  ```yaml
  readinessProbe:
    periodSeconds: 30
    failureThreshold: 6
    timeoutSeconds: 5
  startupProbe:
    periodSeconds: 10
    failureThreshold: 30
    timeoutSeconds: 5
  ```
- Helm unittest for probe configuration (validates `periodSeconds` is set, `initialDelaySeconds` is absent)

## MODIFIED
- `helmfile/apps/nextcloud/values.yaml.gotmpl` — Add probe override section
- `openspec/specs/services/nextcloud/spec.md` — Add `### Requirement: Correct probe timing` with Given/When/Then

## REMOVED
- (none)
