<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# TYPO3 CMS

## Purpose

Enterprise content management system for institutional websites, department pages,
and public-facing content, with OIDC authentication and MariaDB backend.

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

## Component Reference

| Property | Value |
|---------|:------|
| Auth | OIDC |
| Database | MariaDB (`typo3` DB, `typo3_user`) |
| License | Apache-2.0 |
| Config | `databases.typo3.*` |
