<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# OpenProject

## Purpose

Project management platform with agile boards, work packages, task tracking,
timeline planning, and Nextcloud file store integration, with OIDC authentication.

## Non-Goals

- AI-assisted project management (external tool)

## Requirements

### Requirement: Project management with agile boards

Users SHALL create projects, manage work packages, assign tasks, and track
progress using agile boards.

#### Scenario: User creates project
- GIVEN an authenticated user with project creation permissions
- WHEN the user creates a new project
- THEN the project is stored in PostgreSQL
- AND the user can add work packages and assign team members

### Requirement: Memcached for caching

OpenProject SHALL use Memcached for application-level caching.

#### Scenario: Cache configuration
- GIVEN OpenProject deployed
- THEN Memcached is available at `memcached:11211`
- AND OpenProject uses it for session and page caching

### Requirement: Object storage for attachments

OpenProject SHALL store file attachments in S3-compatible object storage.

#### Scenario: Attachment upload
- GIVEN a user uploading a file attachment to a work package
- WHEN the upload completes
- THEN the file is stored in the configured S3 bucket (`openproject`)


## Depends On

Keycloak (SAML 2.0), PostgreSQL, MinIO/S3, SMTP Relay

## Integrates With

Nextcloud (file store via bootstrap job), Nubus Portal (tile), OpenLDAP (LDAP group sync)
## Component Reference

| Property | Value |
|:---------|:------|
| Auth | OIDC |
| Database | PostgreSQL (`openproject` DB, `openproject_user`) |
| Cache | Memcached (`memcached:11211`) |
| Storage | S3 (bucket: `openproject`) |
| License | GPL-3.0 |
| Config | `databases.openproject.*`, `cache.openproject.*`, `objectstores.openproject.*` |
