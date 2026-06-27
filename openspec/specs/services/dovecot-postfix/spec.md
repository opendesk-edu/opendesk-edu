<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SP-License-Identifier: Apache-2.0
-->

# Dovecot Postfix Mail Infrastructure

## Purpose

Dovecot and Postfix provide email services for the openDesk Edu platform,
enabling users to send and receive emails through SOGo integration. This spec
defines their authentication, storage, delivery, and integration requirements.

## Non-Goals

- Email list management (use mailing list services)
- Advanced spam filtering beyond SpamAssassin/Amavis
- Webmail clients (SOGo provides webmail interface)
- Email archiving beyond retention policies

## Requirements

### Requirement: IMAP Email Access (Dovecot)

Users SHALL access their email accounts via IMAP/IMAPS through Dovecot.

#### Scenario: User authenticates via IMAP
- GIVEN a user with an email address `jdoe@opendesk.hrz.uni-marburg.edu`
- WHEN the user authenticates via IMAPS to `imaps://dovecot:993`
- THEN Dovecot validates credentials against KeycloakLDAP
- AND the user can access their `INBOX`, `Sent`, `Drafts`, `Junk`, `Trash`, `Archive` folders
- AND messages are stored in PostgreSQL/MariaDB as configured

#### Scenario: IMAP SSL/TLS configuration
- GIVEN Dovecot configured with SSL/TLS
- WHEN a user connects via IMAPS (`imaps://dovecot:993`)
- THEN Dovecot presents the `*.opendesk.hrz.uni-marburg.de` wildcard certificate
- AND the cipher suite is TLSv1.2+ with ECDHE-RSA-AES256-GCM-SHA384
- AND SSLv2/SSLv3/TLSv1.0/TLSv1.1 are disabled

### Requirement: SMTP Submission and Relaying (Postfix)

Users SHALL send emails via SMTP submission through Postfix, with relay to
external mail systems.

#### Scenario: SMTP submission with STARTTLS
- GIVEN an authenticated user with a valid login session
- WHEN the user sends an email via `smtp://postfix:587` with STARTTLS
- THEN Postfix authenticates via SASL PLAIN against KeycloakLDAP
- AND the email is relayed to recipient MX servers
- AND the `From:` header matches the authenticated user's email address

#### Scenario: SMTP delivery to local users
- GIVEN an incoming email for `jdoe@opendesk.hrz.uni-marburg.edu`
- WHEN Postfix receives the email via SMTP port 25
- THEN Postfix delivers the email to Dovecot via LMTP
- AND Dovecot stores the email in the user's `INBOX`
- AND IMAP clients can retrieve the email

### Requirement: Virus and Spam Filtering

All incoming and outgoing emails SHALL be scanned for viruses and spam.

#### Scenario: Amavis content filtering
- GIVEN an incoming email for `jdoe@opendesk.hrz.uni-marburg.edu`
- WHEN Postfix forwards the email to Amavis for filtering
- THEN Amavis scans the email via ClamAV ICAP and SpamAssassin
- AND clean emails are returned to Postfix for delivery
- AND infected emails are quarantined with `X-Infection-Found` header

#### Scenario: SpamAssassin scoring
- GIVEN an incoming email
- WHEN SpamAssassin scores the email
- THEN emails with score > 5.0 are tagged as spam
- AND emails are moved to the `Junk` folder
- AND `X-Spam-Status` header indicates spam status

### Requirement: Sieve Server-Side Filtering

Users SHALL create server-side email filtering rules via Sieve scripts.

#### Scenario: Sieve rules execution
- GIVEN a user creates a Sieve script with filtering rules (e.g., "move ILIAS emails to Courses folder")
- WHEN an email arrives matching the rule conditions
- THEN Dovecot executes the Sieve script
- AND the email is automatically moved to the specified folder
- AND SOGo displays the filter rules in settings UI

### Requirement: Email Quota Management

User mailboxes SHALL have quota limits to prevent abuse.

#### Scenario: Quota enforcement
- GIVEN a user with disk quota 5GB
- WHEN the user's mailbox size exceeds 4.75GB (95% limit)
- THEN Dovecot sends quota warning email to the user
- AND incoming emails are rejected with "Over quota" error
- AND SOGo displays quota status in UI

### Requirement: Mail Store Persistence

Email data SHALL be stored persistently with backup capabilities.

#### Scenario: PostgreSQL mail store
- GIVEN PostgreSQL configured as mail store
- WHEN emails are stored in PostgreSQL
- THEN email data persists across pod restarts
- AND RWO PVC `postfix-postgres-data` is excluded from k8up schedule
- AND `pg_dump` backup runs nightly via cronjob

#### Scenario: MariaDB mail store (optional)
- GIVEN MariaDB configured as mail store (alternative config)
- WHEN emails are stored in MariaDB
- THEN email data persists across pod restarts
- AND RWO PVC `mariadb-data` is excluded from k8up schedule
- AND `mysqldump` backup runs nightly via cronjob

### Requirement: Health and Monitoring

Dovecot and Postfix SHALL be healthy and monitorable.

#### Scenario: Dovecot health checks
- GIVEN Dovecot deployment
- WHEN the container responds on IMAP port 143 (health check) and 993 (readiness probe)
- THEN the pod is marked healthy
- AND unhealthy pods are restarted by Kubernetes

#### Scenario: Postfix health checks
- GIVEN Postfix deployment
- WHEN the container responds on SMTP port 25 (health check) and 587 (readiness probe)
- THEN the pod is marked healthy
- AND unhealthy pods are restarted by Kubernetes

#### Scenario: Mail queue monitoring
- GIVEN Postfix mail queues
- WHEN Prometheus scrapes Postfix metrics
- THEN metrics include queue sizes for incoming, active, deferred, corrupt, deferred queues
- AND Grafana dashboard displays queue statistics
- AND alerts fire when queues exceed threshold

## Depends On

**Authentication**:
- KeycloakLDAP (`ldap://openldap:389`, bind: `uid=postfix,cn=users,dc=opendesk,dc=edu`, password: `secret.postfix.ldap_password`)

**Data Store**:
- PostgreSQL (`postfix` DB, host: `postgresql.opendesk.svc.cluster.local:5432`, user: `postfix_user`, password: `secret.postfix.psql_password`) OR MariaDB (`postfix` DB, host: `mariadb:3306`, user: `postfix_user`, password: `secret.postfix.mysql_password`)
- RWO PVC: `postfix-postgres-data` (5Gi, storage class: `ceph-rbd-ssd`, excluded from k8up schedule) - defer to vendor.

**Infrastructure**:
- HAProxy Ingress (HAProxy route, ingress class: `haproxy`)

## Integrates With

**API Contracts**:
- [Dovecot IMAP](../../integrations/api-contracts/spec.md#contract-dovecot-imap) — email access
- [Postfix SMTP](../../integrations/api-contracts/spec.md#contract-postfix-smtp-submission) — email sending
- [LDAP Bind/Search](../../integrations/api-contracts/spec.md#contract-ldap-bind-and-search) — authentication

**Services**:
- SOGo (IMAP client for accessing email, Forwards DOVECOT for Sieve phone and etc)
- ClamAV (ICAP REQMOD/RESMOD for virus scanning)
- Amavis (content filtering, attaches `X-Spam-Status` and `X-Virus-ID` headers)
- SpamAssassin (spam scoring, moves to `Junk` folder)
- Postfix (delivery to Dovecot via LMTP, relay to external MX servers)
- PostgreSQL/MariaDB (mail store persistence)
- HAProxy Ingress (expose SMTP/IMAP endpoints to cluster)

## Component Reference

| Property | Value |
|---------|-------|
| Auth | KeycloakLDAP |
| IMAP | Dovecot (`imaps://dovecot:993`, STARTTLS on 143) |
| SMTP | Postfix (`smtp://postfix:25` for incoming, `smtp://postfix:587` STARTTLS for submission) |
| LMTP | Postfix → Dovecot (`lmtp://dovecot:24`) |
| Antivirus | ClamAV ICAP (`icap://clamav-icap:1344/avscan`) |
| Spam Filter | Amavis + SpamAssassin |
| Sieve | Dovecot ManageSieve (`sieve://dovecot:4190`) |
| Database | PostgreSQL (`postfix` DB) or MariaDB (`postfix` DB) |
| License | Dovecot (LGPL-2.1), Postfix (IBM Public License v1.0) |
| Config | `databases.postfix.*`, `imu auth.cred.*`, `helmfile/apps/dovecot/values.yaml.gotmpl`, `helmfile/apps/postfix/values.yaml.gotmpl` |
| Chart | `helmfile/charts/dovecot/` and `helmfile/charts/postfix/` (local charts) |
| Health | IMAP 143/993, SMTP 25/587 |
