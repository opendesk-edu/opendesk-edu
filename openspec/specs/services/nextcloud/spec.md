<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Nextcloud

## Purpose

File storage, sync, and sharing platform with OIDC authentication,
PostgreSQL backend, Redis cache, and S3-compatible object storage.

## Non-Goals

- Alternative file sharing (see `../opencloud/spec.md`)
- Collabora/CryptPad integration (delegated session, see integration specs)

## Requirements

### Requirement: File storage and sync

Users SHALL upload, download, share, and synchronize files across desktop,
mobile, and web interfaces.

#### Scenario: File upload persistence
- GIVEN a user uploading a file
- WHEN the upload completes
- THEN the file is stored on the configured S3-compatible object storage
- AND the file survives pod restarts and upgrades

#### Scenario: File sharing between users
- GIVEN user A sharing a file with user B
- WHEN the share is created
- THEN user B can access the file via share link or direct access
- AND the share respects configured permissions

### Requirement: Group synchronization

Nextcloud SHALL synchronize LDAP groups from Keycloak federation on a
configurable interval (default: twice daily).

#### Scenario: Direct group members synchronized
- GIVEN users who are direct members of Nextcloud-authorized LDAP groups
- WHEN the sync interval elapses
- THEN those users are granted Nextcloud access

#### Scenario: Nested group members excluded
- GIVEN users who are members of nested subgroups
- WHEN group sync runs
- THEN those users are NOT granted access

## Component Reference

| Property | Value |
|:---------|:------|
| Auth | OIDC |
| Database | PostgreSQL (`nextcloud` DB, `nextcloud_user`) |
| Cache | Redis (`redis-headless:6379`) |
| Storage | S3 (MinIO) + RWX PVC |
| License | AGPL-3.0 |
| Config | `databases.nextcloud.*`, `cache.nextcloud.*` |
