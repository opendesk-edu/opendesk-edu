<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# ILIAS

## Purpose

Full-featured learning management system (LMS) providing course management,
assessments, forums, SCORM support, learning modules, and file storage for
course materials. Authenticated via Shibboleth SAML 2.0 SP through Keycloak,
with a Lucene-based search backend, automated setup, and MariaDB Galera
cluster support for high-availability database deployments.

## Scope

This spec defines:
- ✅ **In scope**: ILIAS LMS deployment, Shibboleth SAML 2.0 authentication, course management, assessments, forums, SCORM support, learning modules, file storage, Lucene search backend, MariaDB Galera HA support
- ❌ **Out of scope**: Alternative LMS (see Moodle), ILIAS course content authoring (instructor responsibility), custom ILIAS plugin development (see ILIAS docs)

## Non-Goals

- Alternative LMS (see `../moodle/spec.md`)
- ILIAS course content authoring (instructor responsibility)
- Custom ILIAS plugin development (see ILIAS documentation)

## Requirements

### Requirement: Shibboleth SAML 2.0 authentication

ILIAS SHALL authenticate users via Shibboleth SAML 2.0 Service Provider with
SP-initiated SSO through Keycloak. The Shibboleth SP daemon runs alongside
Apache in the same container.

#### Scenario: Student accesses ILIAS via portal tile
- GIVEN a student enrolled in ILIAS courses
- WHEN the student navigates to the ILIAS portal tile in Nubus
- THEN ILIAS redirects to Keycloak via Shibboleth SP-initiated SSO
- AND upon authentication, ILIAS receives SAML attributes:
  - `mail` (primary email for ILIAS account)
  - `displayName` (display name)
  - `eduPersonAffiliation` (role: student/staff/admin)
  - `eduPersonScopedAffiliation` (institutional scope)
- AND the student sees enrolled courses on the ILIAS dashboard

#### Scenario: Federated user first login via DFN-AAI
- GIVEN a federated user with a valid DFN-AAI identity
- WHEN the user logs in via SAML
- THEN ILIAS creates a local account from the SAML assertion
- AND the user's SAML identity is linked to the ILIAS account

#### Scenario: Shibboleth SP configuration
- GIVEN ILIAS deployed with Shibboleth SP enabled
- THEN the Shibboleth SP daemon is configured via:
  - `/etc/shibboleth/shibboleth.xml` (SP metadata, entity ID, key location)
  - `/etc/shibboleth/shibboleth.conf` (Apache module config)
- AND SP certificates are mounted from the `ilias-shibboleth-certs` secret
- AND Shibboleth XML catalog files are available in `/usr/share/xml/`

### Requirement: Init container setup

ILIAS SHALL use an init container to perform initial setup before the main
application starts. The init container runs the same image with `/bin/sh /setup.sh`.

#### Scenario: Fresh deployment setup
- GIVEN a fresh ILIAS deployment with `autoSetup: true`
- WHEN the init container starts
- THEN ILIAS connects to the database and initializes the schema
- AND the `setup.sql` dump is loaded
- AND the init container exits before the main container starts

#### Scenario: Setup skip on existing installation
- GIVEN an ILIAS deployment where the database already contains ILIAS data
- WHEN `autoSetup: "0"` is set
- THEN the init container skips database initialization
- AND the existing data is preserved across pod restarts

#### Scenario: Upgrade handling
- GIVEN an ILIAS deployment being upgraded
- WHEN `autoUpdate: "0"` is set
- THEN the init container skips version updates
- AND the existing ILIAS version is preserved

### Requirement: MariaDB Galera cluster for high availability

ILIAS SHALL support MariaDB Galera Cluster for database high availability
as an alternative to single MariaDB.

#### Scenario: Galera cluster deployment
- GIVEN `mariadbgalera.enabled: true`
- WHEN the deployment is applied
- THEN a MariaDB Galera StatefulSet is deployed
- AND write operations are replicated across all Galera nodes
- AND the `innodb_flush_log_at_trx_commit` is set to `2` (Galera requirement)

#### Scenario: Galera SST authentication
- GIVEN Galera cluster running
- WHEN Stateful Sync occurs (new node joining)
- THEN the SST uses `mariabackup` method
- AND the backup credentials are configured via `rootUser.password`

### Requirement: Persistent data storage

ILIAS SHALL persist two data volumes across pod restarts.

#### Scenario: Course content persistence
- GIVEN an instructor uploading course files
- WHEN the files are saved in ILIAS
- THEN data is stored in the `ilias-data` PVC (mount: `/var/www/html/data`)
- AND course content, assessments, and forums survive pod eviction

#### Scenario: ILIAS data persistence
- GIVEN ILIAS running with the data volumes mounted
- WHEN ILIAS creates or modifies ILIAS-specific data files
- THEN the files are stored in the `ilias-iliasdata` PVC (mount: `/var/iliasdata/ilias`)
- AND configuration data persists across upgrades

### Requirement: Lucene full-text search

ILIAS SHALL provide full-text search via an integrated Lucene backend
(ILServer), running as a sidecar Service with its own PVC.

#### Scenario: Search index operations
- GIVEN ILIAS deployed with the RPC Server sidecar
- WHEN a user performs a search query in ILIAS
- THEN the request is proxied to the Lucene RPC Server on port `11111`
- AND the Lucene index is stored in the `lucene` PVC (RWO, 4Gi default)
- AND large file indexing is limited by `IndexMaxFileSizeMB` (default 500MB)

#### Scenario: Search service availability
- GIVEN the Lucene RPC Server service running
- WHEN the ILIAS application makes an RPC call
- THEN the service is reachable at `RELEASE-NAME-ilias-rpc:11111`
- AND search results are returned within the configured timeout

### Requirement: Daily cron jobs

ILIAS SHALL run automated maintenance tasks via CronJob resources.

#### Scenario: ILIAS maintenance cron job
- GIVEN the cronjob enabled (`cronjob.enabled: true`)
- WHEN the cronjob runs (daily at 02:00 UTC)
- THEN maintenance tasks execute using the same ILIAS image
- AND the cronjob can connect to the database

#### Scenario: SSO redirect check
- GIVEN the SSO check cronjob enabled (`ssoCheck.enabled: true`)
- WHEN the cronjob runs (every 15 minutes by default)
- THEN it performs an HTTP request to verify SSO redirect functionality
- AND alerts are raised on redirect failure (ConcurrentPolicy: Forbid)

### Requirement: PHP runtime configuration

ILIAS SHALL be tunable via PHP configuration directives.

#### Scenario: Memory and upload limits
- GIVEN ILIAS deployed with PHP config overrides
- THEN `memory_limit` is set to `4096M`
- AND `max_upload_size` is set to `200M`
- AND `max_execution_time` and `max_input_time` are set to `900`
- AND the OPcache is enabled with `memory_consumption=128`

#### Scenario: HTTPS auto-detection
- GIVEN ILIAS behind HAProxy ingress with `X-Forwarded-Proto: https`
- THEN `auto_https_detect_enabled` is set to `1`
- AND ILIAS generates correct internal URLs using HTTPS

### Requirement: Security context

ILIAS SHALL run as a non-root user with dropped capabilities.

#### Scenario: Container security
- GIVEN the ILIAS deployment
- THEN `runAsUser: 33` (www-data)
- AND `runAsGroup: 33`
- AND `allowPrivilegeEscalation: false`
- AND all Linux capabilities are dropped
- AND `seccompProfile: RuntimeDefault` is applied

## Depends On

Keycloak (SAML 2.0 Shibboleth SP), MariaDB/MariaDB Galera (primary DB), MinIO/S3 (course files), Redis (optional caching), HAProxy Ingress, Nubus Portal (tile configuration), Intercom Service (silent login), Dovecot (IMAP for SOGo interop)

## Integrates With

Nubus Portal (portal tile, SSO redirect), Provisioning API (semester course provisioning, enrollment webhooks from HISinOne), SOGo (email integration via Dovecot IMAP), OpenCloud (file sharing alternative), Intercom Service (cross-app SSO for Filepicker workflows)

## Component Reference

| Property | Value |
|---------|-------|
| Auth | SAML 2.0 (Shibboleth SP, custom image `ilias-shibboleth`) |
| Database | MariaDB Galera (`ilias` DB, `ilias_user`) or MariaDB single (`ilias`) |
| Storage | RWX PVC (`ilias-data` 4Gi + `ilias-iliasdata` 4Gi) + S3 (`ilias-data` bucket) |
| Cache | Redis (optional) |
| Search | Lucene RPC Server (`srsolutions/ilias-ilserver:9-openjdk17-jre`, port 11111) |
| License | GPL-3.0 |
| Config | `databases.ilias.*`, `helmfile/apps/ilias/values.yaml.gotmpl` |
| Chart | `helmfile/charts/ilias/` (local chart, v0.1.0) |
| Init | Init container runs `/setup.sh` with DB connection, setup.sql, and client.ini.php |
| Cronjobs | Maintenance (02:00 daily), SSO check (every 15min, disabled by default) |
| Health | TCP liveness probe on port 80, readiness probe on port 80 |
