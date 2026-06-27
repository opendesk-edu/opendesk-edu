<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Deployment Orchestration

## Purpose

Helmfile-based multi-release orchestration of 35+ Helm charts across
multiple environments.

## Non-Goals

- Individual Helm chart internals (see service specs)
- GitOps workflow (ArgoCD configuration is operational, not in spec)

## Requirements

### Requirement: One-command deployment

The platform SHALL be deployable with a single command.

#### Scenario: Fresh deployment
- GIVEN a configured Kubernetes cluster with Helm 3.17.3+, Helmfile 1.0.0+, HelmDiff 3.11.0+
- WHEN an operator runs `helmfile -e <environment> apply`
- THEN all releases are deployed in dependency order
- AND no manual intervention is required between releases

#### Scenario: Environment selection
- GIVEN environment directories under `helmfile/environments/` (dev, test, prod)
- WHEN `helmfile -e prod apply` is executed
- THEN values from `helmfile/environments/prod/*.yaml.gotmpl` are applied
- AND the deployment uses production-specific domain, storage classes, and feature flags

### Requirement: Release dependency ordering

Helmfile SHALL process releases in a strict order ensuring no application is
deployed before its dependencies.

#### Scenario: Pre-migrations run first
- GIVEN `opendesk-migrations-pre` in the release list
- WHEN helmfile processes the release order
- THEN migrations-pre executes BEFORE any application release

#### Scenario: Infrastructure before applications
- GIVEN `opendesk-services` (PostgreSQL, MariaDB, Redis, etc.) in the release list
- WHEN helmfile processes the release order
- THEN infrastructure services deploy BEFORE applications that depend on them

#### Scenario: Post-migrations run last
- GIVEN `opendesk-migrations-post` in the release list
- WHEN all application releases complete
- THEN migrations-post executes AFTER all applications

### Requirement: Templated configuration

Values files SHALL support Go templating via `.yaml.gotmpl` extension,
enabling dynamic configuration from environment variables.

#### Scenario: Environment variable interpolation
- GIVEN a values file containing `{{ env "OPENDESK_DOMAIN" }}`
- WHEN the environment variable is set
- THEN the template is rendered with the actual value

### Requirement: Helm version compatibility

The platform SHALL use Helm >= 3.17.3. Helm 3.18.0 and 4.x are NOT supported
due to known bugs and breaking changes.

## Known Operational Constraints

### Requirement: MariaDB password synchronization

Helm-deployed MariaDB passwords may differ from passwords set during initial
deployment. On upgrades, the Helm-managed password SHALL be checked and synced
via `ALTER USER`.

#### Scenario: Password mismatch after upgrade
- GIVEN a MariaDB instance deployed via Helm with a generated password
- WHEN the Helm release is upgraded with a new generated password
- THEN the database retains the original password
- AND the operator MUST run `ALTER USER` to sync the Helm-managed value

### Requirement: Transient connection failure resilience

Newly created pods MAY experience transient `Connection refused` errors on
first database connection attempt.

#### Scenario: Retry on first connection
- GIVEN a newly created pod (e.g., ILIAS cronjob) connecting to MariaDB
- WHEN the first connection attempt fails with `SQLSTATE[HY000] [2002] Connection refused`
- THEN the application SHALL retry with a backoff
- AND the connection SHALL succeed within 5 attempts (10s sleep between retries)

## Version Constraints

| Tool | Minimum Version | Excluded |
|:-----|:----------------|:---------|
| Helm | 3.17.3 | 3.18.0, 4.x |
| Helmfile | 1.0.0 | — |
| HelmDiff | 3.11.0 | — |
| Kubernetes | 1.24 | OpenShift (untested) |

## Deployment Waves

Releases are processed in 6 waves to ensure correct dependency ordering.
Each wave's `deployStage` label controls ordering.

| Wave | Stage | Components | Label |
|------|-------|-----------|-------|
| 1 | 000-migrations | Pre-migration jobs | `000-migrations` |
| 2 | 010-infra | Keycloak, MariaDB, PostgreSQL, Redis, Memcached, MinIO, Dovecot, Postfix | `010-infra` |
| 3 | 020-components | Nubus Portal, Intercom, OpenCloud, Nextcloud, OX AppSuite, SOGo, Element | `020-components` |
| 4 | 040-collaboration | Collabora, Jitsi, BigBlueButton, Etherpad, CryptPad | `040-collab` |
| 5 | 060-education | ILIAS, Moodle, XWiki, Zammad, OpenProject | `060-edu` |
| 6 | 050-components | Planka, Notes, BookStack, LimeSurvey, TYPO3, SSP, Draw.io, Excalidraw | `050-components` |

### Requirement: Wave ordering enforcement

Helmfile SHALL process releases in ascending `deployStage` order. Within the
same stage, releases MAY be processed in parallel.

#### Scenario: Application deployed before database
- GIVEN `opendesk-services` (databases) has `deployStage: 010`
- AND `opendesk-opencloud` has `deployStage: 020`
- WHEN helmfile processes the release order
- THEN databases deploy BEFORE applications
- AND application pods do not crash-loop on missing database connections

## Known Service Quirks

### Requirement: license-cache CronJob failure handling

The `ums-udm-rest-api-license-cache` CronJob in both `default` and `opendesk`
namespaces SHALL fail permanently. The binary
`/usr/share/univention-directory-manager-tools/univention-update-license-cache`
does not exist in image `udm-rest-api:0.42.6`. This CronJob SHALL be suspended
until the chart is updated to a compatible version.

### Requirement: k8up RWO PVC exclusion

All 29 RWO PVCs SHALL be annotated with `k8up.io/exclude: "true"` to prevent
backup pods from hanging in `ContainerCreating` (they cannot mount multiple
RWO PVCs on different nodes). Only RWX PVCs are backed up by the main
k8up schedule.

#### Scenario: Backup job stuck on RWO PVC
- GIVEN a k8up Schedule backing up all PVCs including RWO
- WHEN the backup pod tries to mount RWO PVCs bound to different nodes
- THEN the pod hangs in `ContainerCreating` indefinitely
- AND the stuck Job SHALL be deleted for the next scheduled run
- AND all RWO PVCs SHALL have `k8up.io/exclude: "true"` annotation

## Service Tiers

| Tier | Services | SLA Target |
|------|----------|------------|
| Critical | Keycloak, PostgreSQL, MariaDB, Redis, MinIO | 99.9% |
| High | Nubus, Intercom, OpenCloud, Nextcloud, OX, SOGo, Element | 99.9% |
| Standard | ILIAS, Moodle, XWiki, Jitsi/BBB, Collabora | 99.5% |
| Low | Planka, Notes, Etherpad, CryptPad, BookStack, Draw.io, Excalidraw | 99.0% |
| Support | SSP, LimeSurvey, TYPO3, OpenProject, Zammad | 99.0% |
