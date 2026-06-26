<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Nubus (IAM + Portal)

## Purpose

Identity and access management platform providing OpenLDAP user directory,
Keycloak OIDC provider, portal with application tiles, UMC administration,
and provisioning service.

## Non-Goals

- Keycloak internal configuration (realm settings, client protocols)
- OpenLDAP schema design (managed by Nubus upstream)
- SCIM provisioning (planned future)

## Requirements

### Requirement: Portal with application tiles

The platform SHALL provide a web portal displaying all authorized applications
as clickable tiles after a single Keycloak authentication.

#### Scenario: Authorized applications displayed
- GIVEN a user with access to Nextcloud, OpenProject, and XWiki
- WHEN the user accesses the portal
- THEN tiles for Nextcloud, OpenProject, and XWiki are displayed
- AND tiles for unauthorized applications are NOT displayed

#### Scenario: Tile click navigates to application
- GIVEN a user viewing the portal
- WHEN the user clicks an application tile
- THEN the user is navigated to the application URL
- AND authentication happens transparently

### Requirement: UMC administration interface

The platform SHALL provide a stripped-down UMC (Univention Management Console)
for IAM administrators to manage users, groups, and permissions in OpenLDAP.


## Depends On

Keycloak (OIDC), OpenLDAP, PostgreSQL, Redis

## Integrates With

Portal tiles for all services, OX Connector for provisioning, Intercom Service for cross-app SSO
## Component Reference

| Property | Value |
|:---------|:------|
| Auth | Internal (contains Keycloak + OpenLDAP) |
| Database | PostgreSQL (Keycloak, Guardian Mgmt API, Extensions, Notifications, Self Service) |
| Cache | Memcached (UMS Self Service), Redis (Intercom Service) |
| License | AGPL-3.0 |
| Upstream | Nubus by Univention GmbH |
