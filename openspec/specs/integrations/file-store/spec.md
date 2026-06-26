<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# OpenProject-Nextcloud File Store

## Purpose

Integration between OpenProject and Nextcloud enabling per-project file storage
in Nextcloud, bootstrapped during deployment via the
`opendesk-openproject-bootstrap` job.

## Non-Goals

- Alternative file store integration (only OpenProject + Nextcloud)

## Requirements

### Requirement: Bootstrap trust relationship

The `opendesk-openproject-bootstrap` job SHALL configure the trust
relationship between OpenProject and Nextcloud automatically during deployment.

#### Scenario: Trust established on deploy
- GIVEN both OpenProject and Nextcloud deployed successfully
- WHEN the `opendesk-openproject-bootstrap` job runs
- THEN it configures the Nextcloud file store integration in OpenProject
- AND the file store is available without manual configuration
- AND the job uses admin credentials from both services

#### Scenario: File store activation per project
- GIVEN the trust relationship established
- WHEN a project admin enables the file store in OpenProject settings
- THEN project members can attach files from Nextcloud to work packages
- AND files remain stored in Nextcloud (not duplicated in OpenProject)

### Requirement: Idempotent bootstrap

The bootstrap job SHALL be idempotent — running it multiple times SHALL NOT
create duplicate configurations or fail on existing trust relationships.

#### Scenario: Bootstrap runs twice
- GIVEN the trust relationship already established
- WHEN the bootstrap job runs again
- THEN it detects the existing configuration
- AND exits successfully without modification

#### Scenario: Bootstrap after partial failure
- GIVEN a bootstrap job that failed midway (e.g., Nextcloud was not ready)
- WHEN the job is retried
- THEN it completes the remaining configuration steps
- AND the trust relationship is fully established

### Requirement: File versioning

Files attached from Nextcloud to OpenProject work packages SHALL retain
Nextcloud's version history.

#### Scenario: File version access
- GIVEN a Nextcloud file with multiple versions attached to an OpenProject work package
- WHEN a project member views the file in OpenProject
- THEN all historical versions are accessible via Nextcloud's versioning API
- AND the file is NOT duplicated in OpenProject's storage

## Component Reference

| Property | Value |
|---------|:------|
| Bootstrap job | `opendesk-openproject-bootstrap` |
| Nextcloud dependency | `integration_openproject` Nextcloud app |
| Trigger | Post-deployment, runs once after OpenProject + Nextcloud |
| Credentials | `secrets.nextcloud.adminPassword`, `secrets.openproject.apiAdminPassword` |
