<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Component Registry

Shared reference for all services, their dependencies, and configuration keys.
This is the single source of truth for component metadata.

## Service Index

| Service | Auth | Database | Storage | Cache | License | Alternative |
|---------|------|----------|---------|-------|---------|-------------|
| [Nubus](../services/nubus/spec.md) | OIDC (IdP) | PostgreSQL | RWX PVC | Redis | Apache-2.0 | — |
| [Nextcloud](../services/nextcloud/spec.md) | SAML 2.0 | MariaDB | S3 | Redis | AGPL-3.0 | — |
| [OpenCloud](../services/opencloud/spec.md) | SAML 2.0 | MariaDB | S3 | — | AGPL-3.0 | — |
| [OX AppSuite](../services/ox-appsuite/spec.md) | SAML 2.0 | MySQL | RWX PVC | — | AGPL-3.0 | — |
| [SOGo](../services/sogo/spec.md) | OIDC | MariaDB | — | Redis | LGPL-3.0 | — |
| [Element](../services/element/spec.md) | OIDC | PostgreSQL | S3 | Redis | Apache-2.0 | — |
| [Jitsi](../services/jitsi/spec.md) | OIDC | — | — | — | Apache-2.0 | BigBlueButton |
| [BigBlueButton](../services/bigbluebutton/spec.md) | SAML 2.0 | PostgreSQL | RWX PVC | Redis | LGPL-3.0 | Jitsi |
| [OpenProject](../services/openproject/spec.md) | SAML 2.0 | PostgreSQL | S3 | — | GPL-3.0 | — |
| [XWiki](../services/xwiki/spec.md) | OIDC | PostgreSQL | — | — | LGPL-2.1 | — |
| [Collabora](../services/collabora/spec.md) | — | — | — | — | MPL-2.0 | — |
| [CryptPad](../services/cryptpad/spec.md) | — | — | — | — | AGPL-3.0 | — |
| [Notes](../services/notes/spec.md) | OIDC | — | — | — | AGPL-3.0 | — |
| [ILIAS](../services/ilias/spec.md) | SAML 2.0 | PostgreSQL | S3 | — | GPL-3.0 | Moodle |
| [Moodle](../services/moodle/spec.md) | SAML 2.0 | PostgreSQL | RWX PVC | — | GPL-3.0 | ILIAS |
| [Etherpad](../services/etherpad/spec.md) | OIDC | PostgreSQL | — | — | Apache-2.0 | — |
| [BookStack](../services/bookstack/spec.md) | SAML 2.0 | MariaDB | — | — | MIT | — |
| [Planka](../services/planka/spec.md) | OIDC | PostgreSQL | — | — | AGPL-3.0 | — |
| [Zammad](../services/zammad/spec.md) | SAML 2.0 | PostgreSQL | — | Redis | AGPL-3.0 | — |
| [LimeSurvey](../services/limesurvey/spec.md) | LDAP | MariaDB | — | — | GPL-2.0 | — |
| [Draw.io](../services/drawio/spec.md) | None | — | — | — | Apache-2.0 | — |
| [Excalidraw](../services/excalidraw/spec.md) | None | — | — | — | — | — |
| [Self-Service Password](../services/self-service-password/spec.md) | LDAP | — | — | — | GPL-3.0 | — |
| [TYPO3 CMS](../services/typo3/spec.md) | OIDC | MariaDB | — | — | Apache-2.0 | — |

## Auth Methods

| Method | Services | Spec |
|--------|----------|------|
| OIDC | Nubus, SOGo, Element, XWiki, Planka, Etherpad, Notes, TYPO3 | [OIDC](../auth/oidc/spec.md) |
| SAML 2.0 | Nextcloud, OX AppSuite, OpenCloud, BigBlueButton, ILIAS, Moodle, BookStack, Zammad, OpenProject | [SAML](../auth/saml/spec.md) |
| LDAP | LimeSurvey, Self-Service Password | [LDAP](../auth/ldap/spec.md) |
| None | Draw.io, Excalidraw, Collabora, CryptPad | — |

## Shared Databases

| Database | Engine | Services | Config Key |
|----------|--------|----------|------------|
| `nubus` | PostgreSQL | Nubus | `databases.nubus.*` |
| `nextcloud` | MariaDB | Nextcloud | `databases.nextcloud.*` |
| `opendesk-opencloud` | MariaDB | OpenCloud | `databases.opendesk_opencloud.*` |
| `oxappsuite` | MySQL | OX AppSuite | `databases.ox_appsuite.*` |
| `sogo` | MariaDB | SOGo | `databases.sogo.*` |
| `element` | PostgreSQL | Element | `databases.element.*` |
| `bigbluebutton` | PostgreSQL | BigBlueButton | `databases.bbb.*` |
| `openproject` | PostgreSQL | OpenProject | `databases.openproject.*` |
| `xwiki` | PostgreSQL | XWiki | `databases.xwiki.*` |
| `ilias` | PostgreSQL | ILIAS | `databases.ilias.*` |
| `moodle` | PostgreSQL | Moodle | `databases.moodle.*` |
| `etherpad` | PostgreSQL | Etherpad | `databases.etherpad.*` |
| `bookstack` | MariaDB | BookStack | `databases.bookstack.*` |
| `planka` | PostgreSQL | Planka | `databases.planka.*` |
| `zammad` | PostgreSQL | Zammad | `databases.zammad.*` |
| `limesurvey` | MariaDB | LimeSurvey | `databases.limesurvey.*` |
| `typo3` | MariaDB | TYPO3 | `databases.typo3.*` |

## Shared Storage

| Bucket/Claim | Type | Services |
|-------------|------|----------|
| `nextcloud-data` | S3 | Nextcloud, Element |
| `opendesk-opencloud-data` | CephFS RWX | OpenCloud |
| `ilias-data` | S3 | ILIAS |
| `bbb-recordings` | CephFS RWX | BigBlueButton |
| `moodle-data` | CephFS RWX | Moodle |
| `seaweedfs-all-in-one-data` | CephFS RWX | SeaweedFS |

## Mutual Exclusivity

| Service A | Service B | Reason |
|-----------|-----------|--------|
| Jitsi | BigBlueButton | Both provide video conferencing |
