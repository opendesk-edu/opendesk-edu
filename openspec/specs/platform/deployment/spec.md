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

## Version Constraints

| Tool | Minimum Version | Excluded |
|:-----|:----------------|:---------|
| Helm | 3.17.3 | 3.18.0, 4.x |
| Helmfile | 1.0.0 | — |
| HelmDiff | 3.11.0 | — |
| Kubernetes | 1.24 | OpenShift (untested) |
