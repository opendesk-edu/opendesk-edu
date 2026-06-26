<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Fix Nextcloud AIO Readiness Probe

## Status: PROPOSED

**Date proposed:** 2026-06-25
**Phase:** PLAN

## Motivation

Nextcloud AIO (All-in-One) readiness and startup probes use `initialDelaySeconds` instead of `periodSeconds`. This causes 10x PHP-FPM load and a container restart loop because the probe configuration doesn't match the actual startup timing expectations.

## Delta Specs

### ADDED
- Helm chart template patch for Nextcloud AIO probe configuration
- Test scenario in `openspec/specs/services/nextcloud/spec.md` for correct probe timing

### MODIFIED
- `helmfile/apps/nextcloud/values.yaml.gotmpl` — Override `readinessProbe.initialDelaySeconds` and `startupProbe.initialDelaySeconds` to use `periodSeconds` semantics
- `openspec/specs/services/nextcloud/spec.md` — Add requirement for correct probe configuration with Given/When/Then scenario

### REMOVED
- (none)

## Affected Specs

- `openspec/specs/services/nextcloud/spec.md`

## Acceptance Criteria

1. Readiness probe uses `periodSeconds` instead of `initialDelaySeconds`
2. PHP-FPM load returns to normal (1x instead of 10x)
3. Container restart loop stops
4. Behavioral spec includes probe configuration requirement
