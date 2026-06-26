<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# TYPO3 CMS

## Purpose

Enterprise content management system for institutional websites, department
pages, and public-facing content. Authenticated via OIDC with MariaDB
backend. Supports multi-site setups, extension ecosystem, and rich text
editing.

## Requirements

### Requirement: OIDC authentication

TYPO3 CMS SHALL authenticate editors and administrators via OIDC.

#### Scenario: Editor accesses TYPO3
- GIVEN an authenticated user with TYPO3 permissions
- WHEN the user navigates to the TYPO3 portal tile
- THEN the user is authenticated via OIDC
- AND can create and manage content

### Requirement: Content persistence

TYPO3 SHALL store all content and configuration in MariaDB.

#### Scenario: Content persistence
- GIVEN an editor creating or modifying content
- WHEN changes are saved
- THEN content is stored in MariaDB
- AND persists across pod restarts

## Depends On

Keycloak (OIDC), MariaDB (`typo3` DB), HAProxy Ingress, Nubus Portal (tile)

## Integrates With

Nubus Portal (tile)

## Component Reference

| Property | Value |
|---------|-------|
| Auth | OIDC |
| Database | MariaDB (`typo3` DB, `typo3` user) |
| Storage | None |
| Cache | None |
| License | Apache-2.0 |
| Config | `databases.typo3.*` |
