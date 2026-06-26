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

## Component Reference

| Property | Value |
|---------|:------|
| Bootstrap job | `opendesk-openproject-bootstrap` |
| Nextcloud dependency | `integration_openproject` Nextcloud app |
| Trigger | Post-deployment, runs once after OpenProject + Nextcloud |
| Credentials | `secrets.nextcloud.adminPassword`, `secrets.openproject.apiAdminPassword` |
