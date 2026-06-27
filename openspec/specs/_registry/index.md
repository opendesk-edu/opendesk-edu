<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Component Registry

Shared reference for all services, their dependencies, configuration keys,
and deployment ordering. This is the single source of truth for component metadata.

## Related References

- [Service Interconnection Matrix](interconnection-matrix.md) — runtime dependencies, data flows, shared infrastructure
- [Cross-Service Workflows](../integrations/cross-service-workflows/spec.md) — end-to-end user workflows spanning services
- [Test Mapping](test-mapping.md) — spec requirements mapped to test files
- [Implementation Reference](implementation-reference.md) — Helm chart/template paths

## Deployment Order

Services MUST be deployed in this order. Dependencies within the same wave
MAY be deployed in parallel.

```
Wave 0 — Infrastructure (no app depends on these):
  Storage classes, Ingress controllers, Cert-manager, Keycloak, PostgreSQL, MariaDB, Redis, MinIO

Wave 1 — Core platform (depends on Wave 0 databases/cache/storage):
  Nubus (provides IAM + Portal), OpenCloud (provides WebDAV/S3)

Wave 2 — Primary services (depend on Wave 1 for auth/portal):
  OX AppSuite, Nextcloud, SOGo, Element, XWiki, OpenProject

Wave 3 — Collaboration add-ons (depend on Wave 2 services):
  Collabora (Nextcloud delegate), CryptPad (stateless), Jitsi, Notes, Planka

Wave 4 — Education services (depend on Wave 0-1 infrastructure):
  ILIAS, Moodle, BigBlueButton, Etherpad, BookStack

Wave 5 — Support services (depend on Wave 0-1):
  Zammad, LimeSurvey, TYPO3 CMS, Self-Service Password

Wave 6 — Stateless tools (no dependencies):
  Draw.io, Excalidraw
```

## Service Index

| Service | Auth | Database | Storage | Cache | License | Alternative |
|---------|------|----------|---------|-------|---------|-------------|
| [Nubus](../services/nubus/spec.md) | OIDC (IdP) | PostgreSQL | RWX PVC | Redis | Apache-2.0 | — |
| [Nextcloud](../services/nextcloud/spec.md) | SAML 2.0 | MariaDB | S3 | Redis | AGPL-3.0 | — |
| [OpenCloud](../services/opencloud/spec.md) | OIDC | MariaDB | CephFS + S3 | Redis | Apache-2.0 | — |
| [OX AppSuite](../services/ox-appsuite/spec.md) | SAML 2.0 | MySQL | RWX PVC | — | AGPL-3.0 | — |
| [SOGo](../services/sogo/spec.md) | OIDC | PostgreSQL | — | Memcached | LGPL-3.0 | — |
| [Element](../services/element/spec.md) | OIDC | PostgreSQL | S3 | Redis | Apache-2.0 | — |
| [Jitsi](../services/jitsi/spec.md) | OIDC | — | — | — | Apache-2.0 | BigBlueButton |
| [BigBlueButton](../services/bigbluebutton/spec.md) | SAML 2.0 | PostgreSQL | RWX PVC | Redis | LGPL-3.0 | Jitsi |
| [OpenProject](../services/openproject/spec.md) | SAML 2.0 | PostgreSQL | S3 | — | GPL-3.0 | — |
| [XWiki](../services/xwiki/spec.md) | OIDC | MariaDB / PostgreSQL | — | — | LGPL-2.1 | — |
| [Collabora](../services/collabora/spec.md) | — | — | — | — | MPL-2.0 | — |
| [CryptPad](../services/cryptpad/spec.md) | — | — | — | — | AGPL-3.0 | — |
| [Notes](../services/notes/spec.md) | OIDC | PostgreSQL | S3 | Redis | AGPL-3.0 | — |
| [ILIAS](../services/ilias/spec.md) | SAML 2.0 | MariaDB Galera | S3 | — | GPL-3.0 | Moodle |
| [Moodle](../services/moodle/spec.md) | SAML 2.0 | MariaDB (external) | RWX PVC | — | GPL-3.0 | ILIAS |
| [Etherpad](../services/etherpad/spec.md) | OIDC | PostgreSQL | — | — | Apache-2.0 | — |
| [BookStack](../services/bookstack/spec.md) | SAML 2.0 | MariaDB | — | — | MIT | — |
| [Planka](../services/planka/spec.md) | OIDC | PostgreSQL | RWO PVC (1Gi) | — | AGPL-3.0 | — |
| [Zammad](../services/zammad/spec.md) | SAML 2.0 | PostgreSQL | — | Redis | AGPL-3.0 | — |
| [LimeSurvey](../services/limesurvey/spec.md) | LDAP | MariaDB | — | — | GPL-2.0 | — |
| [Draw.io](../services/drawio/spec.md) | None | — | — | — | Apache-2.0 | — |
| [Excalidraw](../services/excalidraw/spec.md) | None | — | — | — | — | — |
| [Self-Service Password](../services/self-service-password/spec.md) | LDAP | — | — | — | GPL-3.0 | — |
| [TYPO3 CMS](../services/typo3/spec.md) | OIDC | MariaDB | — | — | Apache-2.0 | — |

## Auth Methods

| Method | Services | Spec |
|--------|----------|------|
| OIDC | Nubus, SOGo, OpenCloud, Element, XWiki, Planka, Etherpad, Notes, TYPO3 | [OIDC](../auth/oidc/spec.md) |
| SAML 2.0 | Nextcloud, OX AppSuite, BigBlueButton, ILIAS, Moodle, BookStack, Zammad, OpenProject | [SAML](../auth/saml/spec.md) |
| LDAP | LimeSurvey, Self-Service Password | [LDAP](../auth/ldap/spec.md) |
| None | Draw.io, Excalidraw, Collabora, CryptPad | — |

## Shared Databases

| Database | Engine | Services | Config Key |
|----------|--------|----------|------------|
| `nubus` | PostgreSQL | Nubus | `databases.nubus.*` |
| `nextcloud` | MariaDB | Nextcloud | `databases.nextcloud.*` |
| `opendesk-opencloud` | MariaDB | OpenCloud | `databases.opendesk_opencloud.*` |
| `oxappsuite` | MySQL | OX AppSuite | `databases.ox_appsuite.*` |
| `sogo` | PostgreSQL | SOGo | `databases.sogo.*` |
| `element` | PostgreSQL | Element | `databases.element.*` |
| `bigbluebutton` | PostgreSQL | BigBlueButton | `databases.bbb.*` |
| `openproject` | PostgreSQL | OpenProject | `databases.openproject.*` |
| `xwiki` | MariaDB / PostgreSQL | XWiki | `databases.xwiki.*` |
| `ilias` | MariaDB Galera | ILIAS | `databases.ilias.*` |
| `moodle` | MariaDB (external) | Moodle | `databases.moodle.*` |
| `etherpad` | PostgreSQL | Etherpad | `databases.etherpad.*` |
| `bookstack` | MariaDB | BookStack | `databases.bookstack.*` |
| `planka` | PostgreSQL | Planka | `databases.planka.*` |
| `zammad` | PostgreSQL | Zammad | `databases.zammad.*` |
| `limesurvey` | MariaDB | LimeSurvey | `databases.limesurvey.*` |
| `typo3` | MariaDB | TYPO3 | `databases.typo3.*` |

## Shared Storage

| Bucket/Claim | Type | Access | Services | Backup |
|-------------|------|--------|----------|--------|
| `nextcloud-data` | S3 | RWX | Nextcloud, Element | k8up (RWX) |
| `opendesk-opencloud-data` | CephFS | RWX | OpenCloud | k8up (RWX) |
| `ilias-data` | S3 | RWX | ILIAS | k8up (RWX) |
| `bbb-recordings` | CephFS | RWX | BigBlueButton | k8up (RWX) |
| `moodle-data` | CephFS | RWX | Moodle | k8up (RWX) |
| `notes-data` | S3 | RWX | Notes | k8up (RWX) |
| `planka-data` | RWO PVC | RWO | Planka | Excluded (`k8up.io/exclude: "true"`) |
| `seaweedfs-all-in-one-data` | CephFS | RWX | SeaweedFS | k8up (RWX) |
| Database PVCs (29) | Ceph RBD | RWO | Per-service DBs | Excluded (`k8up.io/exclude: "true"`) |

## Mutual Exclusivity

| Service A | Service B | Reason |
|-----------|-----------|--------|
| Jitsi | BigBlueButton | Both provide video conferencing |
| OpenCloud | Nextcloud | Both provide file sharing |
| SOGo | OX AppSuite | Both provide groupware (email/calendar) |

## Health Check Catalog

| Service | Readiness Path | Liveness Path | Startup Path | Port |
|---------|---------------|---------------|-------------|------|
| Nubus | `/univention/portal/` | `/univention/portal/` | — | 8080 |
| Nextcloud | `/status.php` | `/status.php` | `/status.php` | 8080 |
| OpenCloud | `/status.php` | `/status.php` | — | 8080 |
| OX AppSuite | `/appsuite/api` | `/appsuite/api` | — | 8080 |
| SOGo | `/SOGo/index.html` | — | — | 20080 |
| Element | — | — | — | 80 |
| Jitsi | — | — | — | — |
| BigBlueButton | — | — | — | — |
| OpenProject | `/api/v3/status` | `/api/v3/status` | — | 8080 |
| XWiki | `/xwiki/bin/view/Main/WebHome` | `/xwiki/bin/view/Main/WebHome` | — | 8080 |
| Collabora | — | — | — | 9980 |
| CryptPad | `/cryptpad/` | `/cryptpad/` | — | 3000 |
| Notes | — | — | — | 3000 |
| ILIAS | `/ilias/` | — | — | 80 |
| Moodle | `/moodle/` | — | — | 8080 |
| Etherpad | `/` | — | — | 9001 |
| BookStack | `/` | — | — | 8080 |
| Planka | `/api/health` | `/api/health` | — | 3000 |
| Zammad | `/api/v1/health_check` | — | — | 3000 |
| LimeSurvey | — | — | — | 80 |
| Draw.io | — | — | — | 8080 |
| Excalidraw | — | — | — | 80 |
| Self-Service Password | `/` | — | — | 80 |
| TYPO3 CMS | `/` | — | — | 80 |

## Deployment Dependency Graph

```mermaid
graph TD
    subgraph Wave 0 [Infrastructure]
        SC[Storage Classes]
        IC[Ingress Controller]
        CM[Cert Manager]
        KC[Keycloak]
        PG[PostgreSQL]
        MY[MariaDB]
        RD[Redis]
        MC[Memcached]
        S3[MinIO / S3]
    end

    subgraph Wave 1 [Core Platform]
        NB[Nubus]
        OC[OpenCloud]
    end

    subgraph Wave 2 [Primary Services]
        OX[OX AppSuite]
        NC[Nextcloud]
        SG[SOGo]
        EL[Element]
        XW[XWiki]
        OP[OpenProject]
    end

    subgraph Wave 3 [Collaboration Add-ons]
        CL[Collabora]
        CP[CryptPad]
        JT[Jitsi]
        NT[Notes]
        PK[Planka]
    end

    subgraph Wave 4 [Education Services]
        IL[ILIAS]
        MD[Moodle]
        BB[BigBlueButton]
        EP[Etherpad]
        BS[BookStack]
    end

    subgraph Wave 5 [Support Services]
        ZM[Zammad]
        LS[LimeSurvey]
        T3[TYPO3 CMS]
        SP[Self-Service Password]
    end

    subgraph Wave 6 [Stateless Tools]
        DI[Draw.io]
        EX[Excalidraw]
    end

    KC --> NB
    PG --> NB
    RD --> NB
    MY --> OC
    S3 --> OC
    NB --> OX
    NB --> NC
    MY --> NC
    RD --> NC
    S3 --> NC
    PG --> EL
    S3 --> EL
    NB --> SG
    PG --> SG
    MC --> SG
    PG --> XW
    NB --> OP
    PG --> OP
    S3 --> OP
    NC --> CL
    NB --> CP
    KC --> JT
    KC --> NT
    KC --> PK
    PG --> PK
    NB --> IL
    PG --> IL
    S3 --> IL
    NB --> MD
    PG --> MD
    KC --> BB
    PG --> BB
    RD --> BB
    KC --> EP
    PG --> EP
    KC --> BS
    MY --> BS
    NB --> ZM
    PG --> ZM
    RD --> ZM
    MY --> LS
    KC --> T3
    MY --> T3
    MY --> SP

