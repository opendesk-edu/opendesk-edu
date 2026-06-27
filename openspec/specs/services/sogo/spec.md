<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# SOGo (Alternative to OX App Suite)

## Purpose

Email, calendar, and address book groupware with modern UI, tight OpenLDAP
address book integration, OIDC authentication, PostgreSQL backend, IMAP/SMTP
via Dovecot and Postfix, Sieve email filtering, and Memcached session caching.
Optimized for simplicity and LDAP-native environments.

## Scope

This spec defines:
- ✅ **In scope**: SOGo groupware deployment, email/calendar/contact/task management, OIDC authentication, PostgreSQL backend, IMAP/SMTP via Dovecot-Postfix, Sieve email filtering, Memcached session caching, LDAP-native integration
- ❌ **Out of scope**: OX AppSuite features (see ox-appsuite spec), Exchange ActiveSync (native LDAP sync only), coexistence with OX AppSuite (mutually exclusive)

## Non-Goals

- OX AppSuite features (see `../ox-appsuite/spec.md`)
- Exchange ActiveSync (native LDAP sync only)

## Requirements

### Requirement: Mutual exclusivity with OX AppSuite

SOGo and OX AppSuite SHALL NOT be deployed simultaneously.

#### Scenario: Only one groupware active
- GIVEN both SOGo and OX AppSuite charts available
- WHEN the environment configuration is applied
- THEN exactly one groupware service is deployed

### Requirement: OIDC authentication with refresh tokens

SOGo SHALL authenticate via OIDC with Keycloak client ID `sogo`,
including refresh token support for long-lived sessions.

#### Scenario: User accesses SOGo
- GIVEN an authenticated user
- WHEN the user navigates to the SOGo portal tile
- THEN the user is authenticated via OIDC
- AND the initial authentication redirects through Keycloak
- AND subsequent requests use the refresh token (no re-login needed within token lifetime)

#### Scenario: Refresh token rotation
- GIVEN a user with an active SOGo session
- WHEN the OIDC access token expires
- THEN SOGo uses the refresh token to obtain a new access token
- AND the user's session continues without re-authentication

#### Scenario: OIDC configuration
- GIVEN SOGo with OIDC enabled (`sogo.oidc.enabled: true`)
- THEN the OpenID-Connect configuration URL points to Keycloak's well-known endpoint
- AND the client ID is `sogo`
- AND scope includes `openid profile email`
- AND `SOGoOpenIdEnableRefreshToken` is `YES`
- AND `SOGoOpenIdTokenCheckInterval` is `3600` (token check every hour)

### Requirement: IMAP access via Dovecot

SOGo SHALL access mailboxes via IMAPS through Dovecot as the IMAP server.

#### Scenario: IMAP mailbox access
- GIVEN a user with an email account in SOGo
- WHEN the user connects via IMAP (e.g., Thunderbird, Apple Mail)
- THEN the connection routes to Dovecot at `imaps://dovecot:993`
- AND mail folders (Inbox, Sent, Drafts) are synchronized
- AND SOGo shows the same folder structure as the mail client

#### Scenario: IMAP over TLS
- GIVEN a user connecting via IMAPS
- WHEN the connection is established
- THEN TLS encryption is enforced by Dovecot
- AND the connection certificate is signed by the platform CA

### Requirement: SMTP mail delivery via Postfix

SOGo SHALL send and receive email through Postfix as the SMTP server.

#### Scenario: Sending email via SMTP
- GIVEN a user composing an email in SOGo
- WHEN the user clicks Send
- THEN the email is relayed to Postfix at `smtp://postfix:587`
- AND Postfix handles DNS MX record resolution and delivery

#### Scenario: Receiving email
- GIVEN an external sender sending mail to the user's address
- WHEN the mail arrives at Postfix
- THEN Postfix delivers it to Dovecot
- AND SOGo shows the new mail in the Inbox

#### Scenario: SMTP submission with STARTTLS
- GIVEN a client connecting to Postfix on port 587
- THEN STARTTLS is available
- AND the connection is upgraded to TLS before mail submission

### Requirement: Sieve email filtering via Dovecot

SOGo SHALL delegate server-side email filtering to Dovecot Sieve.

#### Scenario: Sieve script management
- GIVEN an administrator configuring email filters
- WHEN Sieve scripts are uploaded to Dovecot
- THEN SOGo displays the filter rules in the settings UI
- AND incoming mail is automatically sorted/filtered per script rules

#### Scenario: Sieve connection
- GIVEN SOGo with Sieve enabled
- WHEN the Sieve service is configured at `sieve://dovecot:4190`
- THEN the server-side filtering service is available

### Requirement: OpenLDAP address book synchronization

SOGo SHALL use OpenLDAP as its primary address book, synchronizing
user contact information via LDAP bind queries.

#### Scenario: Address book populated from LDAP
- GIVEN a user in the OpenLDAP directory with `cn`, `uid`, `mail` attributes
- WHEN the user accesses the SOGo address book
- THEN contact data is fetched from OpenLDAP
- AND changes in LDAP propagate to the SOGo address book
- AND `bindFields` match: `(uid, mail)`

#### Scenario: LDAP read-only
- GIVEN SOGo's LDAP integration configured
- THEN `bind_password` is set to `"disabled"`
- AND `write_disabled` is set to `true`
- AND SOGo cannot modify LDAP entries (address book is LDAP-authoritative)

### Requirement: Calendar management

SOGo SHALL provide calendar management with event creation, editing,
free/busy lookup, and sharing.

#### Scenario: Calendar event persistence
- GIVEN a user creating a calendar event
- WHEN the event is saved
- THEN the event is stored in PostgreSQL
- AND the event is visible in the SOGo calendar view
- AND free/busy information is calculated correctly

#### Scenario: Calendar event sharing
- GIVEN a user sharing a calendar
- WHEN the shared calendar's event changes
- THEN attendees see the updated event
- AND alarm notifications are sent via email

#### Scenario: Free/busy lookup
- GIVEN a user scheduling a meeting with other SOGo users
- WHEN the user checks attendee availability
- THEN SOGo queries all attendees' calendars
- AND free/busy slots are displayed for time slot selection

### Requirement: Memcached session caching

SOGo SHALL use Memcached for session data caching to improve performance
on concurrent sessions.

#### Scenario: Session store access
- GIVEN SOGo with Memcached configured at `memcached:11211`
- WHEN a session is created or accessed
- THEN session data is cached in Memcached
- AND sessions survive pod restarts if Memcached data persists

#### Scenario: Memcached unavailability
- GIVEN Memcached service down
- WHEN SOGo accesses session data
- THEN sessions fall back to database storage
- AND the user remains authenticated (no logout)

### Requirement: Multi-user source configuration

SOGo SHALL support configuring multiple address book sources beyond LDAP.

#### Scenario: Single LDAP address book source
- GIVEN SOGo with `SOGoUserSources`
- WHEN exactly one source of type `ldap` is configured
- THEN all address book lookups query OpenLDAP
- AND the source is labeled "Users"

### Requirement: Health probes

SOGo SHALL expose liveness and readiness probes.

#### Scenario: Service health check
- GIVEN SOGo deployed and running
- THEN the container responds on port 80
- AND unhealthy pods are restarted by Kubernetes

## Depends On

**Authentication**:
- Keycloak OIDC (`https://keycloak.opendesk.hrz.uni-marburg.de/auth/realms/opendek/.well-known/openid-configuration`, client: `sogo`, secret: `sogo-oidc-client-secret` from `sogo-sogo` secret)
- OpenLDAP (`ldap://openldap:389`, bind: `uid=ldapsearch_sogo,cn=users,dc=opendesk,dc=edu`, password: `secret.sogo.ldap_password`)

**Data Store**:
- PostgreSQL (`sogo` DB, host: `postgresql:5432`, user: `sogo_user`, password: `secret.sogo.psql_password`)
- Redis (`redis:6379`, password: `secret.sogo.redis_password`) / Memcached (`memcached:11211`)

**Mail**:
- Dovecot IMAP (`imaps://dovecot:993`, se else: `secret.sogo.imap_password`)
- Postfix SMTP (submission: `smtp://postfix:587` STARTTLS, se else: `secret.sogo.smtp_password`)
- Dovecot Sieve (`sieve://dovecot:4190`)

**Infrastructure**:
- HAProxy Ingress (HAProxy route, ingress class: `haproxy`)
- Nubus Portal (navigation tile, navigation.json endpoint)

## Integrates With

**API Contracts**:
- [Keycloak OIDC Token](../../integrations/api-contracts/spec.md#contract-keycloak-oidc-token-endpoint) — authentication
- [Dovecot IMAP](../../integrations/api-contracts/spec.md#contract-dovecot-imap) — email access
- [Postfix SMTP](../../integrations/api-contracts/spec.md#contract-postfix-smtp-submission) — email sending
- [LDAP Bind/Search](../../integrations/api-contracts/spec.md#contract-ldap-bind-and-search) — address book sync
- [Nubus Navigation](../../integrations/api-contracts/spec.md#contract-nubus-portal-navigation) — portal tile

**Services**:
- Nubus Portal (tile: display, url: `https://sogo.opendesk.hrz.uni-marburg.de/SOGo/`, icon, description)
- Postfix (mail relay for outgoing SMTP via `smtp://postfix:587` STARTTLS)
- Dovecot (IMAP access for incoming mail via `imaps://dovecot:993`)
- OpenLDAP (address book auto-population from `ou=contacts,dc=opendesk,dc=edu`)
- SMTP Relay (mail delivery to `*@hrz.uni-marburg.edu` via `opendesk-email` transport)
- ILIAS (course notification emails via mail channel, notifications@opendesk.hrz.uni-marburg.edu)

## Component Reference

| Property | Value |
|---------|-------|
| Auth | OIDC (client: `sogo`, issuer: Keycloak) |
| Database | PostgreSQL (`sogo` DB, `sogo_user`) |
| Cache | Memcached (`memcached:11211`) |
| IMAP | Dovecot (`imaps://dovecot:993`) |
| SMTP | Postfix (`smtp://postfix:587`, STARTTLS on 587) |
| Sieve | Dovecot (`sieve://dovecot:4190`) |
| License | LGPL-3.0 |
| Config | `databases.sogo.*`, `helmfile/apps/sogo/values.yaml.gotmpl` |
| Chart | `helmfile/charts/sogo/` (local chart) |
| Health | Port 80 |
| SSO via | Shibboleth → Keycloak SAML (disabled in edu — uses OIDC instead) |
| LDAP bind | OpenLDAP (`ou=users,dc=opendesk,dc=edu`), bindDN `uid=sogo,ou=services` |
| Dovecot integration | IMAP, Sieve, Managed Folders, Shared Namespace |

## SLO

**Tier**: Critical (email is essential for communication)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Availability** | 99.9% (43.2 min downtime/month max) | Uptime over 30-day window |
| **Latency (P95)** | <500ms (webmail page load) | Apache access log analysis |
| **Latency (P95)** | <200ms (IMAP operation) | Dovecot metrics |
| **Error Rate** | <0.1% (HTTP 5xx) | Apache access log analysis |
| **Sieve Filter Success** | >99% (email filtering) | Sieve log analysis |

**Alerts**:
- SOGo 5xx error rate >0.5% for 5 minutes → P1 alert
- IMAP connection failures >3 in 5 minutes → P1 alert
- LDAP bind failures >2% for 5 minutes → P1 alert
- Memcached connection errors >3 in 5 minutes → P2 alert
- Database connection pool exhausted → P2 alert

**Capacity**:
- 5,000 concurrent webmail users
- 50,000 IMAP connections (total)
- 100,000 emails per day (typical institution)
- Database: 5 GB (typical), 50 GB (large institution)

## Disaster Recovery

**Tier**: Critical (RPO: 15 min, RTO: 30 min)

**Backup Strategy**:
- **Database** (PostgreSQL): Hourly incremental + daily full backup, PITR enabled
- **Memcached state**: Stateless (no backup needed)
- **Configuration**: GitOps-managed
- **Mail data**: Backed up via Dovecot-Postfix infrastructure (see dovecot-postfix spec)

**Recovery Order**:
1. PostgreSQL database restore - 10 min
2. SOGo application deployment - 5 min
3. Apache + PHP-FPM configuration verification - 3 min
4. OIDC client configuration verification - 2 min
5. LDAP bind test - 2 min
6. Dovecot IMAP connection test - 3 min
7. Memcached connection test - 2 min
8. Smoke tests (login, send email, calendar sync) - 3 min

**Critical Data**:
- User preferences and calendar entries
- Address book contacts
- Email filters (Sieve scripts)
- Session data (Memcached)
- OIDC client configuration

**Failure Scenarios**:
- **Database corruption**: Restore from PITR, verify user data integrity
- **Apache failure**: Kubernetes auto-restart, verify configuration
- **Complete failure**: Redeploy from GitOps, restore DB, verify all integrations
- **OIDC misconfiguration**: Re-register client in Keycloak, verify SSO flow
