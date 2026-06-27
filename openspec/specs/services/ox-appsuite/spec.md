<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SP-License-Identifier: Apache-2.0
-->

# OX App Suite

## Purpose

Groupware providing email, calendar, address book, and personal task management
with SAML 2.0 authentication, MariaDB backend, Dovecot IMAP backend, and
OX Connector provisioning for academic institutions.

## Non-Goals

- Alternative groupware (see `../sogo/spec.md`)
- Email delivery infrastructure (see dovecot-postfix spec)
- Advanced email filtering (server-side Sieve rules outside scope)

## Requirements

### Requirement: Groupware core features

OX App Suite SHALL provide email, calendar, address book, and task management
with role-based access control.

#### Scenario: User logs in via SAML
- GIVEN a user accessing OX App Suite
- WHEN the user is redirected to Keycloak for SAML 2.0 authentication
- AND Keycloak validates credentials via DFN-AAI identity provider
- THEN a SAMLResponse is posted back to OX AppSuite's ACS endpoint
- AND email attribute (`mail`) is used as mailbox name
- AND display name (`displayName`) is used for user profile
- AND the user's calendar and address book are loaded

#### Scenario: Email client functionality
- GIVEN an authenticated user accessing OX AppSuite email client
- WHEN the user reads emails in INBOX
- THEN emails are retrieved via IMAP from Dovecot (`imaps://dovecot:993`)
- AND user interface displays email metadata (from, to, subject, date)
- AND attachments are served via OX AppSuite middleware
- AND emails can be replied, forwarded, or deleted

#### Scenario: Calendar event management
- GIVEN a user creating a calendar event
- WHEN the user enters event details (title, date, time, attendees)
- THEN the event is stored in MariaDB (`openxchange` database)
- AND attendees receive email invitations via Postfix SMTP
- AND attendees can accept/decline via calendar UI
- AND free/busy lookup respects attendee availability

### Requirement: MariaDB database with root access

OX App Suite SHALL connect to MariaDB with `root` access to autonomously manage
its database schema (`openxchange` database, `root` user).

#### Scenario: Database connection
- GIVEN OX App Suite deployed with MariaDB
- THEN it connects to MariaDB at `mariadb:3306` using `root` user
- AND the connection uses `root` password from `databases.oxAppSuite.password`
- AND OX AppSuite manages its own schema (creates tables, migrations autonomously)
- AND connection pool size is 50 (tunable via config)

#### Scenario: Database migration handling
- GIVEN OX App Suite upgrading to a new version
- WHEN the upgrade starts
- THEN OX AppSuite runs database migration scripts autonomously
- AND migrations are transaction-safe (roll back on failure)
- AND backup of `openxchange` database runs before migration

#### Scenario: Root privilege requirements
- GIVEN OX AppSuite's requirement for MariaDB root access
- WHEN the comparison is drawn with other services running with restricted users (like OP with dedicated users)
- Then OX AppSuite uses `root` user for schema management
- AND root access is credential-managed strong derivePassword(every per-service RWO backup schedule)
- AND constraintsationale: must manage its own schema independent of limited user constraints

### Requirement: OX Connector user provisioning

The OX Connector SHALL provision users, contexts, groups, and resources to OX App
Suite via the SOAP API when users are created or modified in OpenLDAP.

#### Scenario: New user provisioned
- GIVEN a new user created in OpenLDAP with email `jdoe@opendesk.hrz.uni-marburg.edu`
- WHEN the OX Connector detects the change via LDAP search
- THEN it creates a user context in OX App Suite via SOAP API
- AND user context is linked to LDAP entry via `uid=ldapsearch_ox,cn=users,dc=opendesk,dc=edu`
- AND mailbox `jdoe@opendesk.hrz.uni-marburg.edu` is automatically created in Dovecot
- AND the user can immediately access email and calendar

#### Scenario: User attribute sync
- GIVEN an OpenLDAP user updates their display name
- WHEN the OX Connector detects the change
- THEN it updates the corresponding user context in OX AppSuite
- AND calendar events reflect new display name
- AND address book entries are updated
- AND sync completes within 5 minutes

#### Scenario: Group synchronization
- GIVEN a user added to `opendesk-faculty` group in OpenLDAP
- WHEN the OX Connector detects the change
- THEN the user is added to corresponding OX App Suite group
- AND group-level permissions apply (e.g., calendar sharing)
- AND group sync runs every 15 minutes

### Requirement: Central contacts via OX Contacts API

Nextcloud SHALL use the OX App Suite Contacts API for contact creation and
search-as-you-type in file sharing dialogs.

#### Scenario: Unknown recipient creates contact
- GIVEN a Nextcloud user sharing a file with unknown email `prof@hrz.uni-marburg.edu`
- WHEN the share is created
- THEN Nextcloud creates a contact in OX AppSuite via the Contacts API
- AND the contact is stored in MariaDB (`openxchange` database)
- AND the contact is available in the user's address book
- AND the contact is shared across OX AppSuite instances (Enterprise/Office/University)

#### Scenario: Contact search-as-you-type
- GIVEN a user typing "prof" in Nextcloud file sharing dialog
- WHEN the user types each character
- THEN Nextcloud queries OX AppSuite Contacts API via HTTP
- AND API returns matching contacts with partial matches
- AND results include email, display name, and avatar
- AND search completes within 200ms

### Requirement: Dovecot IMAP backend integration

OX App Suite SHALL use Dovecot as the email backend, with SASL authentication
via LDAP and OAuth token validation.

#### Scenario: IMAP email retrieval
- GIVEN an OX AppSuite user accessing email
- WHEN the email client makes an IMAP connection
- THEN OX AppSuite connects to Dovecot via IMAPS (`imaps://dovecot:993`)
- AND authentication uses SASL PLAIN with LDAP bind
- OR authentication uses OAuth token validated via Keycloak
- AND email content is retrieved from Dovecot mail storage

#### Scenario: Email delivery via Postfix
- GIVEN an incoming email for `jdoe@opendesk.hrz.uni-marburg.edu`
- WHEN Postfix receives the email via SMTP port 25
- THEN Postfix delivers the email to Dovecot via LMTP
- AND Dovecot stores the email in the user's INBOX
- AND OX AppSuite retrieves the email via IMAP

#### Scenario: OAuth-protected IMAP
- Given an OX AppSuite user renewing OAuth token
- When the user's session is accessed
- Then OX AppSuite includes JWT bearer token in IMAP login token
- And Dovecot authenticates token via SASL OAUTHBEARER
- And token is validated via Keycloak introspection endpoint

### Requirement: Postfix-OX mail delivery

OX App Suite SHALL use Postfix for mail delivery with dedicated Postfix-OX instance
for performance and isolation.

#### Scenario: Outbound email delivery
- GIVEN a user composing an email in OX AppSuite
- WHEN the user clicks "Send"
- THEN OX AppSuite submits email to Postfix-OX via SMTP
- AND Postfix-OX relays email to recipient MX servers
- AND emails for `*@hrz.uni-marburg.edu` are delivered by local relay
- AND queue size is monitored for overflow

#### Scenario: Postfix-OX configuration
- GIVEN OX AppSuite deployed with Postfix-OX
- THEN Postfix-OX is configured for SASL authentication (LDAP)
- AND maximum message size is 50 MB (configurable)
- AND relay domains include `opendesk.hrz.uni-marburg.edu`
- AND DKIM signing is enabled (optional, DFN-AAI requirement)

### Requirement: Storage and persistence

OX App Suite SHALL store data in MariaDB and RWX PVC for email storage.

#### Scenario: Email storage
- GIVEN an OX AppSuite deployment
- THEN email messages are stored in MariaDB (`openxchange` database) for metadata
- AND email attachments are stored in RWX PVC `ox-appsuite-data` (100Gi)
- AND email storage persists across pod restarts
- AND email storage is included in k8up backup schedule (RWX supported)

#### Scenario: Database persistence
- GIVEN OX AppSuite's MariaDB database
- THEN database is stored in MariaDB's RWX PVC `mariadb-galera-data`
- AND database persists across MariaDB pod restarts
- AND Galera replication provides high availability
- AND database backups run nightly via k8up

### Requirement: Health and monitoring

OX App Suite SHALL be healthy and monitorable with health endpoints and metrics.

#### Scenario: Health checks
- GIVEN OX AppSuite deployment
- WHEN the container responds on HTTP port 80 (health check)
- THEN the pod is marked healthy
- AND health endpoint returns `/status` with `{"status":"ok"}` when MariaDB is reachable
- AND readiness probe validates MariaDB and Dovecot connectivity

#### Scenario: Metrics and monitoring
- GIVEN Prometheus configured for scraping
- WHEN Prometheus scrapes OX AppSuite metrics
- THEN metrics include IMAP login rate, SOAP API latency, cache hit rate
- AND Grafana dashboard displays email delivery rate, user count, storage usage
- AND alerts fire when SOAP API latency exceeds 1 second

### Requirement: Central navigation integration

OX App Suite SHALL integrate with Nubus Portal for centralized navigation.

#### Scenario: Portal tile navigation
- GIVEN OX AppSuite deployed
- THEN a tile is displayed in Nubus Portal navigation bar
- AND tile URL is `https://ox-appsuite.opendesk.hrz.uni-marburg.de/appsuite/`
- AND tile icon is the OX AppSuite logo (data:image/svg+xml;base64)
- AND tile description is "Email and calendar groupware"
- AND clicking the tile redirects to OX AppSuite main page
