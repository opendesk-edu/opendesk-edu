<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Moodle

## Purpose

Plugin-rich learning management system (LMS) providing assignments, workshops,
gradebook, forums, quizzes, SCORM packages, and an extensive plugin ecosystem.
Authenticated via Shibboleth SAML 2.0 SP through Keycloak, deployed as a custom
Docker image (`moodle-shib`) with integrated Shibboleth SP daemon and Apache
web server.

Moodle uses an external database (MariaDB by default), persistent CephFS storage
for course files and user data, and supports backchannel logout via SAML.
The deployment includes volume permission initialization containers and a
dedicated service account for filesystem operations.

## Scope

This spec defines:
- ✅ **In scope**: Moodle LMS deployment, Shibboleth SAML 2.0 authentication, custom Docker image with Shibboleth SP integration, course management, gradebook, forums, quizzes, SCORM support, plugin ecosystem, MariaDB backend, CephFS persistent storage
- ❌ **Out of scope**: Alternative LMS (see ILIAS), Moodle plugin development (see Moodle Plugin Database), custom Moodle theme development, mobile app development

## Non-Goals

- Alternative LMS (see `../ilias/spec.md`)
- Moodle plugin development (see Moodle Plugin Database)
- Custom Moodle theme development

## Requirements

### Requirement: Shibboleth SAML 2.0 authentication

Moodle SHALL authenticate users via Shibboleth SAML 2.0 Service Provider with
SP-initiated SSO through Keycloak. The Shibboleth SP daemon runs alongside
Apache in the same container.

#### Scenario: Student accesses Moodle via portal tile
- GIVEN a student enrolled in Moodle courses
- WHEN the student navigates to the Moodle portal tile in Nubus
- THEN Moodle redirects to Keycloak via Shibboleth SP-initiated SSO
- AND upon authentication, SAML attributes map to the Moodle user profile
- AND the student sees enrolled courses on the Moodle dashboard

#### Scenario: Shibboleth SP configuration
- GIVEN Moodle deployed with Shibboleth SP enabled
- THEN the SP entity ID is `https://moodle.opendesk.<domain>/shibboleth`
- AND the IdP metadata URL is `https://id.opendesk.<domain>/realms/opendesk/protocol/saml/descriptor`
- AND SP configuration is mounted from:
  - ConfigMap `moodle-shibboleth-sp-config` → `/etc/shibboleth` (read-only)
  - Secret `moodle-shibboleth-sp-secret` → `/etc/shibboleth/certs` (read-only)
  - ConfigMap `moodle-apache-shibboleth-config` → `/etc/apache2/conf-enabled/shibboleth.conf` (read-only)

#### Scenario: XML catalog configuration
- GIVEN the Moodle container
- THEN `XML_CATALOG_FILES` is set to Shibboleth/OpenSAML XML catalogs:
  - `/usr/share/xml/shibboleth/catalog.xml`
  - `/usr/share/xml/xmltooling/catalog.xml`
  - `/usr/share/xml/opensaml/saml20-catalog.xml`
  - `/usr/share/xml/opensaml/saml11-catalog.xml`

### Requirement: External database (MariaDB)

Moodle SHALL connect to an external MariaDB database for metadata storage.

#### Scenario: Database connection
- GIVEN the external database configuration
- THEN Moodle connects to `moodle-mariadb:3306`
- AND authenticates as `moodle` user with password from `moodle-database-credentials` secret
- AND the database name is `moodle`

#### Scenario: Database credential rotation
- GIVEN a new password set in the `moodle-database-credentials` secret
- WHEN Moodle's pod restarts
- THEN Moodle reads the new password and reconnects
- AND existing course data is preserved

### Requirement: Persistent file storage

Moodle SHALL persist course files, user uploads, and plugin data on CephFS RWX storage.

#### Scenario: Course file persistence
- GIVEN an instructor uploading course materials (PDFs, videos, SCORM packages)
- WHEN the files are saved in Moodle
- THEN data is stored in the `moodle-data` PVC (mount: `/bitnami/moodle`)
- AND course content survives pod restarts and upgrades

#### Scenario: Storage class selection
- GIVEN the Moodle deployment
- THEN the PVC uses `storageClassNames.RWO` or `persistence.storages.moodle.storageClassName`
- AND access mode is `ReadWriteMany` (shared across replicas)

### Requirement: Multi-replica deployment

Moodle SHALL support multiple replicas for high availability.

#### Scenario: Two replicas active
- GIVEN `replicaCount: 2` (default)
- WHEN the deployment is applied
- THEN 2 Moodle pods run simultaneously
- AND the ingress controller load-balances requests across replicas
- AND both pods share the same PVC (RWX required)

### Requirement: Initial setup and installation

Moodle SHALL support automated installation on first deployment.

#### Scenario: Fresh installation
- GIVEN `MOODLE_SKIP_INSTALL: "false"` (default)
- WHEN the first pod starts
- THEN Moodle runs the installer
- AND creates the admin account with `MOODLE_USERNAME`/`MOODLE_PASSWORD`
- AND configures the site name `MOODLE_SITE_NAME`

#### Scenario: Skip installation on existing deployment
- GIVEN `MOODLE_SKIP_INSTALL: "true"`
- WHEN the pod starts
- THEN Moodle skips the installation wizard
- AND connects directly to the existing database

### Requirement: Security context

Moodle SHALL run as a non-root user with dropped capabilities.

#### Scenario: Container security
- GIVEN the Moodle deployment
- THEN `runAsUser: 1001`, `runAsGroup: 1001`
- AND `fsGroup: 1001`
- AND `allowPrivilegeEscalation: false`, `privileged: false`, `runAsNonRoot: true`
- AND all capabilities are dropped (`ALL`)
- AND `seccompProfile: RuntimeDefault`

### Requirement: Health probes

Moodle SHALL expose liveness and readiness probes on port 80.

#### Scenario: Liveness probe
- GIVEN Moodle deployed and running
- THEN a TCP liveness probe on port 80 with 30s initial delay and 10s period
- AND unhealthy pods are restarted

#### Scenario: Readiness probe
- GIVEN Moodle deployed and running
- THEN a TCP readiness probe on port 80 with 5s initial delay and 5s period
- AND pods are removed from service when not ready

### Requirement: Ingress configuration

Moodle SHALL be accessible via HAProxy ingress with TLS and large file upload support.

#### Scenario: HTTPS access with large uploads
- GIVEN Moodle behind HAProxy ingress
- THEN `ssl-redirect: "true"` enforces HTTPS
- AND `proxy-body-size: "200M"` allows large course file uploads
- AND `timeout-server: "300s"` and `timeout-client: "300s"` allow slow uploads
- AND TLS is terminated via `letsencrypt-prod` cluster issuer

### Requirement: PDB for availability

Moodle SHALL have a PodDisruptionBudget to ensure availability during node maintenance.

#### Scenario: Node drain during maintenance
- GIVEN a PDB configured for Moodle
- WHEN a node is drained
- THEN at least one Moodle pod remains available
- AND students can continue accessing courses

## Depends On

Keycloak (SAML 2.0 Shibboleth SP), MariaDB (`moodle` DB, external `moodle-mariadb`), CephFS RWX PVC, HAProxy Ingress, Nubus Portal (tile), Intercom Service (cross-app SSO)

## Integrates With

Nubus Portal (tile, SSO redirect), Provisioning API (semester course provisioning, enrollment webhooks from HISinOne), SOGo (course notification emails via mail channel), Nextcloud/OpenCloud (file sharing alternative for course materials)

## Component Reference

| Property | Value |
|---------|-------|
| Auth | SAML 2.0 (Shibboleth SP, `moodle-shib` custom image) |
| Database | MariaDB (`moodle` DB, `moodle` user, external `moodle-mariadb:3306`) |
| Storage | RWX PVC (`moodle-data`, `storageClassNames.RWO`, accessMode `ReadWriteMany`) |
| Cache | None (uses PHP OPcache) |
| License | GPL-3.0 |
| Config | `databases.moodle.*`, `persistence.storages.moodle.*`, `helmfile/apps/moodle/values.yaml.gotmpl` |
| Chart | `helmfile/charts/moodle/` (local chart) |
| Image | `ghcr.io/<your-org>/moodle-shib:v1.0.0` (custom Shibboleth image) |
| Replicas | 2 (default) |
| Resources | 500m-2 CPU, 1Gi-2Gi memory |
| Security | `runAsUser: 1001`, `capabilities: drop ALL`, `seccompProfile: RuntimeDefault` |
| Health | TCP port 80 (liveness: 30s/10s, readiness: 5s/5s) |
| PDB | Yes (PodDisruptionBudget) |
| Ingress | HAProxy, 200M body size, 300s timeout |
| Volume permissions | Init container with `enabled: true` |
