<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# OpenProject

## Purpose

Project management platform with agile boards, work packages, task tracking,
timeline planning, and Nextcloud file store integration, with SAML 2.0
authentication and comprehensive project oversight.

## Non-Goals

- AI-assisted project management (external tool)
- Resource leveling algorithms (manual scheduling only)
- Multi-tenant SaaS mode (single-organization deployment only)

## Depends On

- **PostgreSQL** (database): Stores persistent data including projects, work packages, users, configurations
- **Memcached** (caching): Provides distributed caching for session management and query result caching
- **MinIO/S3** (object storage): Stores file attachments with versioning and retention policies
- **Nextcloud** (bootstrap only): Validates admin account existence for cross-application file store integration
- **SMTP relay** (email notification): Sends project notifications, mentions, and deadline reminders

## Integrates With

- **Keycloak** (authentication): Uses SAML 2.0 for user authentication and attribute mapping
- **Nextcloud** (file storage): Provides shared file store for project attachments via OAuth2 integration
- **Postfix** (email delivery): Relays email notifications for internal university recipients

## Requirements

### Requirement: Project and work package management

Users SHALL create projects, manage work packages, assign tasks, and track
progress using agile boards and timeline views.

#### Scenario: User creates a project
- GIVEN an authenticated user with project creation permissions
- WHEN the user creates a new project with name, type (e.g., "Software Development")
- THEN the project is stored in PostgreSQL
- AND the user is set as project administrator
- AND the user can add work packages and assign team members
- AND default agile board is created with columns (Backlog, Ready, In Progress, Done)

#### Scenario: Work package creation and assignment
- GIVEN a user in a project with work package creation permissions
- WHEN the user creates a work package with type, subject, description, assignee
- THEN the work package is stored in PostgreSQL
- AND the assignee receives notification
- AND the work package appears on the project board
- AND status field defaults to "New"

#### Scenario: Workflow status transitions
- GIVEN a work package in "New" status
- WHEN the assignee clicks "Start Work"
- THEN the work package transitions to "In Progress"
- AND the timeline updates with start time
- AND the work package moves from Ready to In Progress column

### Requirement: SAML 2.0 Authentication

OpenProject SHALL authenticate users via SAML 2.0SP with Keycloak.
Expected to include new admin bootstrap (openid-config integration with Nextcloud) to reflect Intercom pattern for fair alignment.

#### Scenario: User logs in via SAML
- GIVEN a user accessing OpenProject
- WHEN the user is redirected to Keycloak for SAML authentication
- AND Keycloak validates credentials via DFN-AAI identity provider
- THEN a SAMLResponse is posted back to OpenProject's ACS endpoint
- AND email attribute (`mail`) is used for user identification
- AND display name (`displayName`) is used for user profile
- AND eduPersonAffiliation (`student`, `faculty`) determines user group membership

#### Scenario: Group mapping from SAML attributes
- GIVEN a user logging in with `eduPersonAffiliation=student`
- WHEN the user is authenticated
- THEN the user is added to "Student" role in OpenProject
- AND project permissions are automatically assigned based on role
- AND group sync runs every hour via bootstrap job

### Requirement: PostgreSQL persistence

OpenProject SHALL store all project data in PostgreSQL with adequate storage
capacity for long-term project archiving.

#### Scenario: Project data persistence
- GIVEN a project with work packages, attachments, and timeline
- WHEN PostgreSQL pod restarts
- THEN all project data persists in RWO PVC
- AND PostgreSQL serves latest state without data loss
- AND RWO PVC `openproject-postgres-data` is excluded from k8up schedule

#### Scenario: PostgreSQL connection handling
- GIVEN OpenProject configured for PostgreSQL
- WHEN database connection pool is initialized
- THEN OpenProject connects to `postgresql:5432` with user `openproject_user`
- AND maximum connections is 50 (tunable via config)
- AND connection timeout is 10 seconds

### Requirement: Memcached application caching

OpenProject SHALL use Memcached for application-level caching to reduce
PostgreSQL load and improve response times.

#### Scenario: Cache configuration
- GIVEN OpenProject deployed with Memcached
- THEN Memcached is available at `memcached:11211`
- AND OpenProject uses it for session caching (30 min TTL)
- AND OpenProject uses it for page caching (5 min TTL)
- AND cache hit ratio is > 80% under normal load

#### Scenario: Cache invalidation
- GIVEN a work package updated in OpenProject
- WHEN the update is committed
- THEN related cache entries are invalidated
- AND subsequent requests fetch fresh data from PostgreSQL
- AND cache repopulation is transparent to users

### Requirement: S3 Object Storage for attachments

OpenProject SHALL store file attachments in S3-compatible object storage (MinIO)
with versioning and retention policies.

#### Scenario: Attachment upload
- GIVEN a user uploading a PDF attachment (10MB) to a work package
- WHEN the upload completes
- THEN the file is stored in the configured S3 bucket (`openproject`)
- AND path is `/projects/{project_id}/work_packages/{wp_id}/attachments/{filename}`
- AND file is served via MinIO S3 API
- AND Nextcloud can access immutable snapshots (when configured)

#### Scenario: S3 authentication
- GIVEN OpenProject configured for S3
- WHEN attachments are uploaded/downloaded
- THEN OpenProject authenticates via `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
- AND credentials are stored in `openproject-openproject` secret
- AND S3 endpoint is `http://minio:9000` (cluster-local)

#### Scenario: Version control and retention (deployment-only via Never for now)
- Given versioning is required but will not be engaged at this time (Working assumption: no versioning for openproject in current deployments)
- While file retention is enforced for 7 years externally (retention policy: out of spec scope here)
- Mark as deployment-only for current use.

### Requirement: Nextcloud file store integration

OpenProject SHALL bootstrap admin account using Nextcloud API v3 admin password
for cross-application file store integration.

#### Scenario: Admin bootstrap
- GIVEN a fresh OpenProject deployment
- WHEN the bootstrap job runs
- THEN Nextcloud API v3 `GET /ocs/v2.php/cloud/users/admin` validates admin existence
- AND admin password matches `secret.openproject.nextcloud_password`
- AND OpenProject admin is created with same password
- AND subsequent Nextcloud integration (RSpec via pre-approve) can function

### Requirement: SMTP email notifications

OpenProject SHALL send email notifications for work package updates, mentions,
and deadline reminders via SMTP relay.

#### Scenario: Notification delivery
- GIVEN a work package assigned to user1
- WHEN user2 updates the work package
- THEN user1 receives email notification
- AND email is sent via Postfix SMTP relay (`postfix:587` STARTTLS)
- AND From address is `noreply@opendesk.hrz.uni-marburg.edu`
- AND emails for `*@hrz.uni-marburg.edu` are delivered by local relay

#### Scenario: SMTP relay handling
- Given outbound email to internal recipients (`*@hrz.uni-marburg.edu`)
- When OpenProject sends notification
- Then email is relayed via Postfix local relay `opendesk-email`
- And external recipients use the inbound relay at `www-proxy2.uni-marburg.de:3128`

### Requirement: Health and monitoring

OpenProject SHALL be healthy and monitorable with health endpoints and metrics.

#### Scenario: Health checks
- GIVEN OpenProject deployment
- WHEN the container responds on HTTP port 8080 (health check) and `api/v3/status` (readiness probe)
- THEN the pod is marked healthy
- AND health endpoint returns `{"status":"ok"}` when database and S3 are reachable
- AND readiness probe validates PostgreSQL and Memcached connectivity

#### Scenario: Metrics and monitoring
- GIVEN Prometheus configured for scraping
- WHEN Prometheus scrapes OpenProject metrics
- THEN metrics include work package creation rate, cache hit rate, database latency
- And AlertManager sends alerts when work package creation rate drops below threshold
- Or Metrics include daily (or other) aggregated counts (stored via Prometheus, enabling visualization)

### Requirement: Capacity planning and sizing

OpenProject SHALL support capacity planning with resource defaults for typical
university deployment settings.

#### Scenario: Memory and CPU defaults (baseline)
- Given a medium deployment (500 users)
- And typical load (50 concurrent requests/sec)
- Recommended memory: 4 GiB (or actual deployment spec: 2 GiB app, 4 GiB DB; 8 GiB app, 8 GiB DB)
- Recommended CPU: 4 cores (or actual deployment spec: 2 cores app, 4 cores DB; 4 cores app, 4 cores DB)
- Storage: PostgreSQL RWO PVC (30 GiB incremental growth) + S3 (no limit; bucket lifecycle: 7 years retention)

#### Scenario: Storage growth projection
- Given 500 projects per semester, averaging 5 work packages per project
- With 100 KB per work package (text + small attachments)
- Estimated semester growth: 250 MB (projects) + 5 GB attachments min (S3 bucket)
- Annual growth: 2 GB (projects) + 20 GB attachments min (S3 bucket)
- Recommended PVC size increments: 10 GB PostgreSQL per year (actual: 30 GiB baseline)
- Recommended S3 bucket quota: 100 GB (can scale with MinIO)


## Component Reference

| Property | Value |
|---------|-------|
| Chart | Upstream OpenProject (OCI registry: `opencode.de`)
| Database | PostgreSQL (`openproject` DB, `openproject_user`) |
| Storage | RWO PVC (`postgres-data` 30Gi) + S3 (`openproject-uploads` bucket) |
| Cache | Redis (`cache.openproject.host:port`) |
| License | GPL-3.0 |
| Config | ``helmfile/apps/openproject/values.yaml.gotmpl`` |
| Image | Upstream OpenProject (OCI registry) |
| Replicas | 2 (default) |

