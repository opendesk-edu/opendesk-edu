<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# OpenCloud (Alternative to Nextcloud)

## Purpose

Lightweight file sharing alternative to Nextcloud, optimized for education
use cases with per-course file shares and CS3-based sync.

## Non-Goals

- Nextcloud-specific features (see `../nextcloud/spec.md`)

## Requirements

### Requirement: Mutual exclusivity with Nextcloud

OpenCloud and Nextcloud SHALL NOT be deployed simultaneously. Exactly one
SHALL be the active file sharing service.

#### Scenario: Only one file service active
- GIVEN both OpenCloud and Nextcloud charts available
- WHEN the environment configuration is applied
- THEN exactly one file sharing service is deployed
- AND the inactive service is NOT included in the release list

### Requirement: OIDC authentication

OpenCloud SHALL authenticate users via OIDC.

#### Scenario: User accesses OpenCloud
- GIVEN an authenticated user
- WHEN the user navigates to the OpenCloud portal tile
- THEN the user is authenticated via OIDC
- AND file storage is accessible


## Depends On

Keycloak (SAML 2.0), MariaDB, MinIO/S3

## Integrates With

OX AppSuite (WebDAV), Nubus Portal (tile)
## Component Reference

| Property | Value |
|:---------|:------|
| Auth | OIDC |
| Database | PostgreSQL |
| Storage | RWX PVC |
| License | Apache-2.0 |
| Alternative to | Nextcloud |
