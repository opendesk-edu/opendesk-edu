<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# XWiki

## Purpose

Knowledge management and wiki platform with OIDC authentication, LDAP group
synchronization, and PostgreSQL or MariaDB backend. Supports multi-wiki
setups, LDAP profile picture sync, group-based access control, and optional
Collabora ODT/DOCX export (enterprise). The page title follows the pattern
"Wissen - $docTitle - <productName>".

XWiki uses a dual authentication strategy: OIDC for user login via Keycloak,
and LDAP for group synchronization and user import. OIDC and LDAP users are
linked via the `LDAPUserImport` LDAPUserImportConfigClass.

## Non-Goals

- Meeting scheduling (see Nordeck widget in Element)
- Chat/messaging (see Element/Synapse)

## Requirements

### Requirement: OIDC authentication with Keycloak

XWiki SHALL authenticate users via OIDC with Keycloak client `opendesk-xwiki`.
The auth service is set to `keycloak-bridge-auth`.

#### Scenario: User logs in via OIDC
- GIVEN a user accessing XWiki
- WHEN the user logs in
- THEN XWiki redirects to Keycloak via OIDC
- AND OIDC scopes include `openid` and `opendesk-xwiki-scope`
- AND the client secret method is `client_secret_basic`
- AND the OIDC user info is fetched via GET request

#### Scenario: Matrix ID mapping from OIDC
- GIVEN OIDC login with username claim
- THEN the Matrix user localpart is `opendesk_username` (lowercase)
- AND the Matrix user subject is `opendesk_username` (cleaned)

#### Scenario: OIDC-OIDC user linking
- GIVEN the `LDAPUserImport.addOIDCObject: 1` configuration
- WHEN an OIDC user logs in
- AND an LDAP user with matching UID exists
- THEN the XWiki accounts are linked
- AND group membership from LDAP is applied

### Requirement: LDAP group synchronization

XWiki SHALL synchronize LDAP groups and users daily, mapping specific groups
to XWiki admin roles.

#### Scenario: Group import from LDAP
- GIVEN `triggerGroupImport: 1` and `triggerGroupsUpdate: 1`
- WHEN the LDAP group sync runs
- THEN groups matching `(objectClass=opendeskKnowledgemanagementGroup)(opendeskKnowledgemanagementEnabled=TRUE)` are imported
- AND the admin group is mapped: `XWikiAdminGroup = cn=managed-by-attribute-KnowledgemanagementAdmin`

#### Scenario: Group cache expiration
- GIVEN `groupcache_expiration: 300`
- THEN the LDAP group cache is refreshed every 300 seconds (5 minutes)

#### Scenario: User import restrictions
- GIVEN `usersAllowedToImport: globalAdmin`
- THEN only global administrators can trigger manual LDAP user imports from the UI

### Requirement: LDAP profile synchronization

XWiki SHALL sync user profiles (name, email, photo) from LDAP.

#### Scenario: Profile fields mapping
- GIVEN `fields_mapping: "last_name=sn,first_name=givenName,email=mailPrimaryAddress"`
- WHEN a user logs in
- THEN XWiki maps LDAP attributes to profile fields

#### Scenario: Profile photo sync
- GIVEN `update_photo: 1` and `photo_attribute: jpegPhoto`
- WHEN a user's LDAP photo changes
- THEN XWiki updates the user's profile picture from LDAP

### Requirement: Central navigation integration

XWiki SHALL integrate with the Nubus Portal navigation bar via the
workplaceServices endpoint.

#### Scenario: Navigation bar rendering
- GIVEN `workplaceServices.navigationEndpoint` pointing to Nubus
- THEN XWiki fetches `navigation.json` and renders the central navigation bar
- AND the theme navbar is styled with `navbar height: 64px`

#### Scenario: Portal branding
- GIVEN the Flamingo Themes Iceberg skin configured
- THEN `brand-primary` is set to the platform primary color
- AND the logo is loaded as SVG base64
- AND the page title prefix is "Wissen" (German for "Knowledge")

### Requirement: SMTP mail delivery

XWiki SHALL send email notifications via Postfix (port 587, STARTTLS).

#### Scenario: Email notification
- GIVEN a user subscribed to page notifications
- WHEN a page is modified
- THEN XWiki sends a notification email via Postfix
- AND the sender address is `no-reply@<mailDomain>`
- AND email grace time is 5 seconds (`notifications.emails.live.graceTime: 5`)

### Requirement: Database flexibility (PostgreSQL or MariaDB)

XWiki SHALL support both PostgreSQL and MariaDB as its database backend,
selected via `databases.xwiki.type`.

#### Scenario: PostgreSQL backend
- GIVEN `databases.xwiki.type: "postgresql"`
- THEN the PostgreSQL-specific image variant is used
- AND the database password uses `secrets.postgresql.xwikiUser`

#### Scenario: MariaDB backend
- GIVEN `databases.xwiki.type: "mariadb"`
- THEN the MariaDB-specific image variant is used
- AND the database password uses `secrets.mariadb.rootPassword`

### Requirement: Enterprise features (conditional)

XWiki SHALL support enterprise-specific features when `OPENDESK_ENTERPRISE=true`.

#### Scenario: Enterprise license
- GIVEN enterprise keys configured
- THEN Java opts include `-Dlicenses=<openDesk>,<proApplications>`
- AND the enterprise UI flavor is used

#### Scenario: Collabora ODT/DOCX export
- GIVEN enterprise mode
- THEN Collabora Code integration is enabled (`isEnabled: 1`)
- AND ODT/DOCX export is available via `http://collabora:9980`

## Depends On

Keycloak (OIDC, client: `opendesk-xwiki`), PostgreSQL or MariaDB, OpenLDAP, Postfix, Nubus Portal (navigation), Collabora (enterprise ODT export)

## Integrates With

Nubus Portal (central navigation, tile), Intercom Service (newsfeed), OpenLDAP (group sync, profile photo), Postfix (email notifications), Collabora (enterprise ODT/DOCX export)

## Component Reference

| Property | Value |
|---------|-------|
| Auth | OIDC (client: `opendesk-xwiki`) + LDAP (group sync, profile) |
| Database | PostgreSQL or MariaDB (`xwiki` DB, configurable) |
| Storage | RWO PVC |
| Cache | None |
| License | LGPL-2.1 |
| Config | `databases.xwiki.*`, `ldap.*`, `secrets.keycloak.clientSecret.xwiki`, `helmfile/apps/xwiki/values.yaml.gotmpl` |
| Chart | Upstream `xwiki` (OCI: `opencode.de`) |
| Image | Two variants: `xwiki-mariadb` and `xwiki-postgres` |
| Security | `runAsUser: 100`, `runAsGroup: 101`, `capabilities: drop ALL` |
| Java Opts | Custom (license keys, self-signed CA truststore) |
| Theme | Flamingo Themes Iceberg, brand-primary color |
| Replicas | `replicas.xwiki` (default 1) |
| LDAP bind | `uid=ldapsearch_xwiki,cn=users,<baseDn>`, `groupcache_expiration: 300` |
