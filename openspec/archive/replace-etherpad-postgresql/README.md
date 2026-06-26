<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Replace Bitnami PostgreSQL with StatefulSet in Etherpad

## Status: ARCHIVED

**Date proposed:** 2026-06-20
**Date completed:** 2026-06-22
**Author:** Sisyphus (AI orchestrator)

## Motivation

The Etherpad Helm chart depended on the Bitnami PostgreSQL sub-chart. The upstream Bitnami chart uses an entrypoint script incompatible with the official `postgres:17` image, making future upgrades risky. Additionally, the sub-chart dependency model adds unnecessary Helm dependency management overhead for a single-database service.

## Proposal

Remove the Bitnami PostgreSQL sub-chart and replace it with a direct PostgreSQL StatefulSet managed alongside the Etherpad deployment. Use the official `postgres:17` image. Preserve existing PVC data.

## Delta Specs

### ADDED
- `helmfile/charts/etherpad/templates/postgresql-statefulset.yaml` — PostgreSQL 17 StatefulSet with `uid: 999`, `PGDATA: /var/lib/postgresql/data`, health probe
- `helmfile/charts/etherpad/templates/postgresql-service.yaml` — ClusterIP Service exposing port 5432
- `openspec/specs/services/etherpad/spec.md` — Behavioral contract for Etherpad service (OIDC + PostgreSQL)

### MODIFIED
- `helmfile/charts/etherpad/Chart.yaml` — Removed `postgresql` from dependencies list
- `helmfile/charts/etherpad/values.yaml` — Added `postgresql.image`, `postgresql.persistence` section
- `helmfile/charts/etherpad/templates/_helpers.tpl` — Replaced `.Values.postgresql.auth.*` fallbacks with `secretKeyRef` to `etherpad-postgresql`
- `openspec/specs/services/etherpad/spec.md` — Documented PostgreSQL as official image (not Bitnami)
- `openspec/specs/platform/storage/spec.md` — Added Etherpad PostgreSQL PVC as RWO storage class

### REMOVED
- `helmfile/charts/etherpad/charts/` — Deleted entire sub-chart directory (Bitnami PostgreSQL)
- `helmfile/charts/etherpad/Chart.yaml` — Removed `postgresql` from `dependencies`

## Implementation Tasks

1. Create `postgresql-statefulset.yaml` with official `postgres:17` image
2. Create `postgresql-service.yaml` with headless + clusterip services
3. Update `_helpers.tpl` to read DB credentials from K8s secret
4. Remove sub-chart directory and Chart.yaml dependency entry
5. Patch existing Bitnami-initialized data (add missing `postgresql.conf` and `pg_hba.conf`)
6. Write behavioral spec for Etherpad service
7. Verify: `helm lint`, `helm template`, deployed pod health

## Verification

- `helm lint helmfile/charts/etherpad/` passes
- `helm template` renders StatefulSet with correct image and volume mount
- Existing PVC `data-etherpad-postgresql-0` reattaches to new StatefulSet
- Etherpad pod connects to PostgreSQL and creates pads successfully
- `kubectl logs -f <etherpad-pod>` shows successful DB connection

## References

- Etherpad service spec: `openspec/specs/services/etherpad/spec.md`
- Storage spec: `openspec/specs/platform/storage/spec.md`
- AGENTS.md: Etherpad Chart section
