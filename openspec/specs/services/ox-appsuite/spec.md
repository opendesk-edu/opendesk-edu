<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# OX App Suite

## Purpose

Groupware providing email, calendar, address book, and personal task management
with OIDC authentication, MariaDB backend, Dovecot IMAP backend, and
OX Connector provisioning.

## Non-Goals

- Alternative groupware (see `../sogo/spec.md`)
- Email delivery infrastructure (see platform/networking — Postfix)

## Requirements

### Requirement: Groupware with MariaDB root access

OX App Suite SHALL connect to MariaDB with root access to autonomously manage
its database schema (`openxchange` database, `root` user).

#### Scenario: Database connection
- GIVEN OX App Suite deployed
- THEN it connects to MariaDB at `mariadb:3306`
- AND the connection uses `root` credentials from `databases.oxAppSuite.password`

### Requirement: OX Connector user provisioning

The OX Connector SHALL provision users, contexts, groups, and resources to OX App
Suite via the SOAP API when users are created or modified in OpenLDAP.

#### Scenario: New user provisioned
- GIVEN a new user created in OpenLDAP with an email address
- WHEN the OX Connector detects the change
- THEN it creates a user context in OX App Suite via SOAP API
- AND the user can immediately access email and calendar

### Requirement: Central contacts via OX Contacts API

Nextcloud SHALL use the OX App Suite Contacts API for contact creation and
search-as-you-type in file sharing dialogs.

#### Scenario: Unknown recipient creates contact
- GIVEN a Nextcloud user sharing a file with an unknown email address
- WHEN the share is created
- THEN Nextcloud creates a contact in OX App Suite via the Contacts API
- AND the contact is available in the user's address book

## Component Reference

| Property | Value |
|:---------|:------|
| Auth | OIDC |
| Database | MariaDB (`openxchange` DB, `root`) |
| Mail Backend | Dovecot (SASL: LDAP + OAuth) |
| MTA | Postfix-OX |
| Provisioning | OX Connector (SOAP API) |
| License | GPL-2.0 / AGPL-3.0 |
| Config | `databases.oxAppSuite.*` |
