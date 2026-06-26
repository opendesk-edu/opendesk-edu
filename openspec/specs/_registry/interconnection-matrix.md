<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Service Interconnection Matrix

Maps runtime dependencies, data flows, and shared infrastructure between services.
A cell contains the relationship type; empty means no direct interaction.

## Legend

- **AUTH** — Uses service for authentication
- **DATA** — Reads/writes data to/from service
- **TOKEN** — Obtains auth token via silent login (Intercom)
- **DELEGATE** — Delegates functionality to service
- **MAIL** — Sends/receives mail through service
- **LDAP** — Reads/writes LDAP directory entries
- **SHARED** — Shares infrastructure dependency (DB, cache, storage)

## Matrix

| | KC | NC | OC | OX | SG | EL | NB | OP | XW | IL | MD | BB | EP | BS | PK | ZM | LS | SP | CP | DI | EX | T3 | NT |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Keycloak** | — | AUTH | AUTH | AUTH | AUTH | AUTH | AUTH | AUTH | AUTH | AUTH | AUTH | AUTH | AUTH | AUTH | AUTH | AUTH | AUTH | AUTH | — | — | — | AUTH | AUTH |
| **Nextcloud** | | — | DATA | DATA | DATA | DATA | PORTAL | DATA | NEWS | DATA | | | | | | | | | FILE | | | | |
| **OpenCloud** | | | — | DATA | DATA | | PORTAL | | | | | | | | | | | | | | | | |
| **OX AppSuite** | | | | — | DELEGATE | | PORTAL | DATA | NEWS | | | | | | | | | | | | | | | |
| **SOGo** | | | | | — | | PORTAL | | | | | | | | | | | LDAP | | | | | |
| **Element** | | | | | | — | TOKEN | | | | | | | | | | | | | | | | | |
| **Nubus** | | | | | | | — | | | | | | | | | | | | | | | | |
| **OpenProject** | | DATA | | | | | | — | | | | | | | | | | | | | | | |
| **XWiki** | | NEWS | | | | | | | — | | | | | | | | LDAP | | | | | |
| **ILIAS** | | | | | | | PORTAL | | | — | | | | | | | | | | | | | |
| **Moodle** | | | | | | | PORTAL | | | | — | | | | | | | | | | | | |
| **BBB** | | | | | | | PORTAL | | | | | — | | | | | | | | | | | |
| **Etherpad** | | | | | | | PORTAL | | | | | | — | | | | | | | | | | |
| **BookStack** | | | | | | | PORTAL | | | | | | | — | | | | | | | | | |
| **Planka** | | | | | | | PORTAL | | | | | | | | — | | | | | | | |
| **Zammad** | | | | | | MAIL | PORTAL | | | | | | | | | — | | | | | | | |
| **LimeSurvey** | | | | | | | PORTAL | | | | | | | | | | — | LDAP | | | | |
| **SSP** | | | | | | | | | | | | | | | | | | LDAP | — | | | |
| **Collabora** | | DELEGATE | | | | | | | | | | | | | | | | | | — | | | |
| **CryptPad** | | | | | | | PORTAL | | | | | | | | | | | | | | — | | |
| **Draw.io** | | | | | | | PORTAL | | | | | | | | | | | | | | | — | |
| **Excalidraw** | | | | | | | PORTAL | | | | | | | | | | | | | | | — | |
| **TYPO3** | | | | | | | PORTAL | | | | | | | | | | | | | | | — | |
| **Notes** | | | | | | | PORTAL | | | | | | | | | | | | | | | | — |

## Shared Infrastructure

### PostgreSQL (single cluster, multiple databases)

Services sharing the PostgreSQL instance: Nubus, Nextcloud, Element, Jitsi, OpenProject, XWiki, BigBlueButton, ILIAS, Moodle, Etherpad, Planka, Zammad

If the PostgreSQL cluster fails, ALL 12 services lose database connectivity simultaneously.

### MariaDB (single cluster, multiple databases)

Services sharing the MariaDB instance: Nextcloud (actually PostgreSQL in Edu), OpenCloud, SOGo, BookStack, LimeSurvey, TYPO3

### Redis (single cluster)

Services sharing the Redis instance: Nubus, Nextcloud, Element, Intercom Service, BigBlueButton, Zammad

If Redis fails: auth caching, session management, and intercom token caching break across 6 services.

### Memcached (session caching)

SOGo uses Memcached (NOT Redis) for session caching. Memcached is NOT shared with other services.

### MinIO / S3

Shared buckets used by: Nextcloud (primary), OpenCloud (WebDAV/S3), Element (media), Notes (attachments), ILIAS (course files), OpenProject (project files)

### Keycloak (OIDC/SAML IdP)

All 18 authenticated services depend on Keycloak. If Keycloak is unavailable:
- No new logins succeed
- Existing sessions remain valid until token expiry
- Silent login (Intercom) fails → cross-app workflows break

### SMTP (mail relay)

Services sending mail: OX AppSuite, SOGo, Nextcloud, OpenProject, Zammad

## Single Points of Failure

| Component | Impact Scope | Services Affected |
|-----------|-------------|-------------------|
| Keycloak | All authentication | 18 services |
| PostgreSQL | All PG-backed services | 12 services |
| MariaDB | All MariaDB-backed services | 6 services |
| Redis | Caching + session | 7 services |
| MinIO | File storage | 6 services |
| HAProxy Ingress | All external access | All services |
| Cert Manager | TLS termination | All services |
| Intercom Service | Cross-app SSO | OX, Nextcloud, Element |

## Interconnection Diagram

```mermaid
graph LR
    subgraph Identity
        KC[Keycloak]
        LDAP[OpenLDAP]
    end

    subgraph Portal
        NB[Nubus Portal]
        IC[Intercom Service]
    end

    subgraph Storage
        S3[MinIO / S3]
        PG[PostgreSQL]
        MY[MariaDB]
        RD[Redis]
    end

    subgraph Mail
        SM[SMTP Relay]
        OX_MAIL[OX Mail]
    end

    KC -->|AUTH| NB
    KC -->|AUTH| IC
    LDAP -->|SYNC| KC
    LDAP -->|SYNC| SOGo
    LDAP -->|SYNC| XWiki
    LDAP -->|SYNC| LimeSurvey
    LDAP -->|BIND| SSP

    NB -->|PORTAL TILE| ILIAS
    NB -->|PORTAL TILE| Moodle
    NB -->|PORTAL TILE| BBB
    NB -->|PORTAL TILE| Zammad
    NB -->|PORTAL TILE| Planka

    IC -->|TOKEN| OX
    IC -->|TOKEN| Element
    IC -->|NAV| Element
    IC -->|NEWS| XWiki

    OX -->|FILEPICKER via IC| NC
    OP -->|FILE STORE via IC| NC

    S3 -->|FILES| NC
    S3 -->|FILES| OC
    S3 -->|FILES| Element
    S3 -->|FILES| Notes
    S3 -->|FILES| ILIAS
    S3 -->|FILES| OP

    PG -.->|DB| NB
    PG -.->|DB| NC
    PG -.->|DB| Element
    PG -.->|DB| OP
    PG -.->|DB| XWiki
    PG -.->|DB| BBB
    PG -.->|DB| ILIAS
    PG -.->|DB| Moodle
    PG -.->|DB| Etherpad
    PG -.->|DB| Planka
    PG -.->|DB| Zammad

    RD -.->|CACHE| NB
    RD -.->|CACHE| NC
    RD -.->|CACHE| IC
    RD -.->|CACHE| Element
    RD -.->|CACHE| BBB
    RD -.->|CACHE| Zammad

    MC[Memcached] -.->|SESSION CACHE| SOGo

    SM -->|MAIL| OX_MAIL
    SM -->|MAIL| SOGo
    SM -->|MAIL| NC
    SM -->|MAIL| OP
    SM -->|MAIL| Zammad

    DC[Dovecot] -->|IMAP| SOGo
    PF[Postfix] -->|SMTP| SOGo

    CL[Collabora] -->|OFFICE DELEGATE| NC
```
