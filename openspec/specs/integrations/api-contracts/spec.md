<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# API Contracts

## Purpose

Formal API contract stubs for key integration points between services.
These define the expected request/response shapes, authentication flows,
and error handling for inter-service communication.

Contracts are organized by integration domain. Each contract specifies
the HTTP method, path, request body, response body, authentication
mechanism, and error codes.

## Non-Goals

- Internal library API documentation (see individual service docs)
- Full OpenAPI/Swagger specs (these are high-level contracts for integration testing)
- Client SDK generation (contracts are reference only)

---

## Contract: Keycloak OIDC Token Endpoint

**Service**: Keycloak → All OIDC clients
**Endpoint**: `POST /realms/opendesk/protocol/openid-connect/token`
**Auth**: Client credentials or authorization code

### Request (Authorization Code)

```json
{
  "grant_type": "authorization_code",
  "code": "<authorization_code>",
  "redirect_uri": "https://<service>.opendesk.<domain>/callback",
  "client_id": "<client_id>",
  "client_secret": "<client_secret>"
}
```

### Response (Success)

```json
{
  "access_token": "<opaque-access-token>",
  "token_type": "Bearer",
  "expires_in": 300,
  "refresh_token": "<opaque-refresh-token>",
  "refresh_expires_in": 1800,
  "id_token": "<opaque-id-token>"
}
```

### Standard Claims (id_token)

```json
{
  "sub": "uuid-of-user",
  "email": "user@example.com",
  "email_verified": true,
  "preferred_username": "jdoe",
  "displayName": "John Doe",
  "realm_access": { "roles": ["student", "opendesk-user"] },
  "resource_access": { "opendesk-nextcloud": { "roles": ["user"] } }
}
```

### Error Codes

| Code | Condition |
|------|-----------|
| 400 | `invalid_grant` — expired or invalid authorization code |
| 401 | `unauthorized_client` — invalid client credentials |
| 400 | `unsupported_grant_type` — grant type not enabled for client |

---

## Contract: Keycloak SAML 2.0 SP-Initiated SSO

**Service**: Keycloak → All SAML 2.0 SPs (ILIAS, Moodle, BBB, Nextcloud, OX, etc.)
**Binding**: HTTP-POST redirect

### SP-Initiated Flow

1. User accesses SP → SP generates `AuthnRequest` → redirect to Keycloak
2. Keycloak authenticates user → generates `SAMLResponse` → POST back to SP ACS URL

### AuthnRequest (SP → IdP)

```xml
<samlp:AuthnRequest
  ID="_id-abc123"
  Version="2.0"
  IssueInstant="2026-01-15T10:00:00Z"
  ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
  AssertionConsumerServiceURL="https://<service>/Shibboleth.sso/SAML2/POST">
  <saml:Issuer>https://<service>/shibboleth</saml:Issuer>
  <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified"/>
</samlp:AuthnRequest>
```

### SAMLResponse (IdP → SP) — Key Attributes

| Attribute | Source | Used By |
|-----------|--------|---------|
| `mail` | Keycloak user email | All SPs |
| `displayName` | Keycloak display name | ILIAS, Moodle |
| `eduPersonAffiliation` | Keycloak realm role | ILIAS |
| `uid` | Keycloak username | Moodle, BBB |
|   `preferred_username` | Keycloak username | Nextcloud OIDC |

### SAML POST Metadata Endpoint (DFN-AAI Federation)

**Service**: Keycloak → DFN-AAI IdP Registration
**Endpoint**: `POST /admin/realms/opendek/services`
**Auth**: UMC admin (basic auth) or Keycloak admin client credentials

**Request via UMC (Univention Management Console)**
```http
POST /univention/portal/saml2/idp/metadata HTTP/1.1
Content-Type: application/x-www-form-urlencoded
Authorization: Basic umd01:<umc-master-password>
```

**Request Body**
```
sp_name=dfn-aai&
sp_url=https://idp.opendesk.hrz.uni-marburg.de/auth/realms/opendek/saml&
sp_logout=https://idp.opendesk.hrz.uni-marburg.de/auth/realms/opendek/protocol/saml
```

**Response (200 — SP Metadata)**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor entityID="https://idp.opendesk.hrz.uni-marburg.de/auth/realms/opendek"
  xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata">
  <md:IDPSSODescriptor WantAuthnRequestsSigned="true"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="https://idp.opendesk.hrz.uni-marburg.de/auth/realms/opendek/protocol/saml"/>
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data><ds:X509Certificate>MIIC...Cert...</ds:X509Certificate></ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>
  </md:IDPSSODescriptor>
</md:EntityDescriptor>
```

**Fed Attributes (eduGAIN Standard)**

| Attribute | Source | Federation Category |
|-----------|--------|---------------------|
| `eduPersonPrincipalName` | `preferred_username@opendesk.hrz.uni-marburg.de` | Required |
| `eduPersonAffiliation` | `student@opendesk.hrz.uni-marburg.edu` | Required |
| `eduPersonEntitlement` | `urn:mace:opendesk.edu:member` | Optional |
| `mail` | Keycloak user email | Required |
| `displayName` | Keycloak display name | Optional |

---

## Contract: Intercom Silent Login

**Service**: Intercom → Consuming service (OX, Nextcloud, Element)
**Endpoint**: `POST https://<intercom>/api/silent-login`
**Auth**: Shared secret (HMAC-SHA256)

### Request

```json
{
  "consumer": "opendesk-ox",
  "shared_secret": "<pre-shared-secret>",
  "target_service": "opendesk-opencloud"
}
```

### Response (Success — 200)

```json
{
  "target_url": "https://<target-service>/index.html",
  "token": "<opaque-session-token>",
  "expires_in": 300
}
```

### Error Codes

| Code | Condition |
|------|-----------|
| 401 | Invalid or expired shared secret |
| 403 | Consumer not authorized for target service |
| 502 | Target service unreachable |
| 504 | Target service response timeout |

### Redis Token Caching

The Intercom caches silent login tokens in Redis with:
- Key: `intercom:token:<consumer>:<target>`
- TTL: 300 seconds (5 minutes)
- On cache hit: return cached token without contacting target service
- On cache miss: perform silent login, cache result

---

## Contract: Nubus Portal Navigation

**Service**: Nubus Portal → All consuming services
**Endpoint**: `GET https://ums-portal-server/portal/navigation.json`
**Auth**: HTTP Basic (`opendesk_username` / `secrets.centralnavigation.apiKey`)

### Response (200)

```json
{
  "entries": [
    {
      "id": "nextcloud",
      "name": "Nextcloud",
      "url": "https://nextcloud.opendesk.<domain>",
      "icon": "data:image/svg+xml;base64,...",
      "description": "File storage and sharing"
    },
    {
      "id": "ilias",
      "name": "ILIAS",
      "url": "https://ilias.opendesk.<domain>",
      "icon": "data:image/svg+xml;base64,...",
      "description": "Learning management system"
    }
  ]
}
```

### Integration Point

Services embed the navigation bar by fetching this JSON at startup.
The response is cached per-service. When a service is disabled (not deployed),
it is excluded from the response by the Nubus Portal server.

---

## Contract: WOPI Discovery and CheckFileInfo

**Service**: Nextcloud/OpenCloud → Collabora
**Discovery**: `GET https://<collabora>/hosting/discovery`
**CheckFileInfo**: `GET https://<collaboro>/cool/wopi/files/<fileId>?access_token=<token>`

### Discovery Response (200)

```xml
<?xml version="1.0" encoding="utf-8"?>
<wopi-discovery>
  <app name="Collabora Writer">
    <action ext="odt" name="edit" urlsrc="https://<collabora>/browser/coolwriter.html"/>
    <action ext="docx" name="edit" urlsrc="https://<collabora>/browser/coolwriter.html"/>
  </app>
  <app name="Collabora Calc">
    <action ext="ods" name="edit" urlsrc="https://<collabora>/browser/coolcalc.html"/>
    <action ext="xlsx" name="edit" urlsrc="https://<collabora>/browser/coolcalc.html"/>
  </app>
  <app name="Collabora Impress">
    <action ext="odp" name="edit" urlsrc="https://<collabora>/browser/coolimpress.html"/>
    <action ext="pptx" name="edit" urlsrc="https://<collabora>/browser/coolimpress.html"/>
  </app>
</wopi-discovery>
```

### CheckFileInfo Response (200)

```json
{
  "BaseFileName": "document.odt",
  "OwnerId": "user-uuid",
  "Size": 12345,
  "UserId": "user-uuid",
  "UserCanWrite": true,
  "Version": "etag-value",
  "LastModifiedTime": "2026-01-15T10:30:00Z"
}
```

### CheckFileInfo Request Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `access_token` | Yes | OAuth token from WOPI host |
| `fileId` | Yes | Unique file identifier from host |

### GetFile Endpoint (for document content)

```
GET https://<collabora>/cool/wopi/files/<fileId>/contents?access_token=<token>
```

### PutFile Endpoint (for saving changes)

```
POST https://<collaboro>/cool/wopi/files/<fileId>/contents?access_token=<token>
Content-Type: application/octet-stream
```

**Response (Success — 200)**
```json
{
  "LastModifiedTime": "2026-01-15T11:45:00Z"
}
```

### SaveChild Endpoint (for creating new documents)

**Service**: Host → Collabora → Creates new document in same folder

```
POST https://<collabora>/cool/wopi/files/<fileId>/children?access_token=<token>
Content-Type: application/json
```

**Request Body**
```json
{
  "name": "New Document.odt",
  "url": ""
}
```

**Response (Success — 200)**
```json
{
  "Name": "New Document.odt",
  "Url": "https://<host>/index.php/apps/files?dir=/path/new-document.odt",
  "HostEditUrl": "",
  "HostViewUrl": "",
  "WriteRequired": true
}
```

---

---

## Contract: BBB Greenlight Room API

**Service**: Greenlight (Moodle custom) → BBB Backend
**Endpoint**: `POST https://<bbb-server>/api/create`
**Auth**: `BIGBLUEBUTTON_SECRET` checksum

### Request

```
POST /api/create?name=Room+Name&meetingID=room-uuid
  &checksum=<sha1(meetingID+BIGBLUEBUTTON_SECRET)>
```

### Response (Success — 200)

```xml
<response>
  <returncode>SUCCESS</returncode>
  <meetingID>room-uuid</meetingID>
  <internalMeetingID>internal-uuid</internalMeetingID>
  <attendeePW>attendee-password</attendeePW>
  <moderatorPW>moderator-password</moderatorPW>
  <createTime>1705312200000</createTime>
</response>
```

### Error Response

```xml
<response>
  <returncode>FAILED</returncode>
  <messageKey>checksumError</messageKey>
  <message>You did not pass the correct checksum</message>
</response>
```

---

## Contract: LDAP Bind and Search

**Service**: All LDAP consumers → OpenLDAP
**Endpoint**: `ldap://openldap:389` (or `ldaps://openldap:636`)
**Auth**: Bind DN + password

### Bind

```
BIND DN: "uid=ldapsearch_nextcloud,cn=users,dc=opendesk,dc=edu"
BIND PW: <secret>
```

### Search (group members)

```
BASE: "ou=groups,dc=opendesk,dc=edu"
SCOPE: sub
FILTER: "(cn=opendesk-users)"
ATTRS: "member"
```

### Search (user lookup)

```
BASE: "ou=users,dc=opendesk,dc=edu"
SCOPE: sub
FILTER: "(uid=jdoe)"
ATTRS: "cn", "mail", "uid", "displayName", "eduPersonAffiliation"
```

### Bind Fields Convention

All LDAP clients use `(uid, mail)` as `bindFields` for user lookup.

---

## Contract: S3 Object Storage

**Service**: Nextcloud, OpenCloud, Element, Notes, ILIAS → MinIO
**Endpoint**: `https://minio:9000`
**Auth**: Access key + secret key

### Bucket Operations

| Operation | Method | Path | Headers |
|-----------|--------|------|---------|
| Put object | PUT | `/<bucket>/<path>` | `Content-Length`, `Content-Type` |
| Get object | GET | `/<bucket>/<path>` | — |
| Delete object | DELETE | `/<bucket>/<path>` | — |
| List objects | GET | `/<bucket>?list-type=2` | — |

### Per-Service Buckets

| Service | Bucket | Notes |
|---------|--------|-------|
| Nextcloud | `nextcloud-data` | Primary storage, path-style |
| OpenCloud | `opendesk-opencloud` | CS3 sync target |
| Element | `element-media` | Media files, attachments |
| Notes | `notes-attachments` | Note attachments |
| ILIAS | `ilias-data` | Course files, SCORM packages |
| OpenProject | `openproject-files` | Project file storage |

---

## Contract: ClamAV ICAP Scan

**Service**: Nextcloud → ClamAV
**Endpoint**: `icap://clamav-icap:1344/avscan`
**Auth**: None (internal network)

### ICAP Request

```
REQMOD icap://clamav-icap:1344/avscan ICAP/1.0
Host: clamav-icap
Encapsulated: req-header=0, null-body=0
```

### Response (Clean — 204)

```
ICAP/1.0 204 No Content
```

### Response (Infected — 200)

```
ICAP/1.0 200 OK
X-Infection-Found: Type=0; Resolution=2; Threat=W97M.Downloader;
X-Virus-ID: W97M.Downloader
```

Nextcloud quarantines the file when `X-Infection-Found` header is present.

---

## Contract: Notify Push WebSocket

**Service**: Nextcloud Notify Push → Browser clients
**Endpoint**: `wss://<nextcloud>/push`
**Auth**: Nextcloud session cookie or OIDC token

### Connection

```
GET /push HTTP/1.1
Upgrade: websocket
Connection: Upgrade
Cookie: <nextcloud-session-cookie>
```

### Message Format (Server → Client)

```json
{
  "envelope": {
    "type": "notify",
    "appid": "nextcloud",
    "subject": "files",
    "subject_params": [],
    "message": "Shared with you",
    "object_type": "files",
    "object_id": "12345",
    "user_id": "jdoe"
  },
  "notifications": [
    {
      "notification_id": 42,
      "app": "files_sharing",
      "subject": "Shared with you",
      "object_type": "files",
      "object_id": "12345"
    }
  ]
}
```

---

## Contract: Dovecot IMAP

**Service**: SOGo, Postfix → Dovecot IMAP Server
**Endpoint**: `imap://dovecot:143` (STARTTLS) or `imaps://dovecot:993` (SSL)
**Auth**: Clear-text password from KeycloakLDAP → Password change via `SECRET=${MASTER_PASSWORD}`

### IMAP Connection

```
A capability
* CAPABILITY IMAP4rev1 STARTTLS AUTH=PLAIN AUTH=LOGIN AUTH=CRAM-MD5 QRESYNC
C LOGIN jdoe <password>
* OK [CAPABILITY IMAP4rev1 STARTTLS AUTH=PLAIN ...] Logged in
C SELECT INBOX
* 1 EXISTS
* 1 RECENT
* OK [UNSEEN 1] Message 1 is first unseen
C FETCH 1 RFC822
* 1 FETCH (RFC822 {500}
...
)
C LOGOUT
```

### IMAP Folders

| Folder | Usage | Service |
|--------|-------|---------|
| `INBOX` | Incoming messages | SOGo, Postfix |
| `Sent` | Sent messages | SOGo |
| `Drafts` | Draft messages | SOGo |
| `Junk` | Spam folder | SOGo, SpamAssassin |
| `Trash` | Deleted messages | SOGo |
| `Archive` | Archived messages | SOGo |

### IMAP SSL/TLS Configuration

**Certificate**: `*.opendesk.hrz.uni-marburg.de` wildcard cert from `secrets.tls`
**Cipher Suite**: TLSv1.2+ with ECDHE-RSA-AES256-GCM-SHA384

---

## Contract: Postfix SMTP (Submission)

**Service**: SOGo, other mail services → Postfix SMTP Server
**Endpoint**: `smtp://postfix:25` (STARTTLS) or `smtps://postfix:465` (SSL)
**Auth**: SASL PLAIN from KeycloakLDAP

### SMTP Submission

```
EHLO opendesk.hrz.uni-marburg.edu
EHLO opendesk.hrz.uni-marburg.edu
STARTTLS
MAIL FROM:<jdoe@opendesk.hrz.uni-marburg.edu>
RCPT TO:<recipient@external.edu>
DATA
Subject: Test Message
From: jdoe@opendesk.hrz.uni-marburg.edu
To: recipient@external.edu

This is a test message.
.
QUIT
```

### SMTP Authentication

```
AUTH PLAIN AGpkb2UAbXlwYXNzd29yZA==
```

Where `AGpkb2UAbXlwYXNzd29yZA==` is Base64(`\0jdoe\0mypassword`)

### Postfix Queue Management

| Queue | Description |
|-------|-------------|
| `incoming` | Messages received from network |
| `active` | Messages being delivered |
| `deferred` | Temporary delivery failures |
| `corrupt` | Unreadable queue files |
| `hold` | Messages on hold (admin) |

### Postfix Filters

**SpamAssassin** - Spam scoring, moves to `$JUNK` folder
**Amavis** - Content filtering, attaches `X-Spam-Status` headers

---

## Depends On

- Keycloak (OIDC token endpoint)
- Intercom Service (silent login relay)
- All OIDC/SAML client services

## Integrates With

- [Cross-Service Workflows](../cross-service-workflows/spec.md) (end-to-end flows using these contracts)
- [Service specs](../../services/) (individual service authentication requirements)
- `../_registry/interconnection-matrix.md` (AUTH and TOKEN relationship types)

## Contract Index

| Contract | Protocol | Services Involved |
|----------|----------|-------------------|
| Keycloak OIDC Token | HTTPS | All OIDC clients (9 services) |
| Keycloak SAML 2.0 SP-SSO | SAML 2.0 | All SAML SPs (8 services) |
| SAML POST Metadata (DFN-AAI) | HTTPS + XML | Keycloak → DFN-AAI IdP |
| Intercom Silent Login | HTTPS | OX, Nextcloud, Element |
| Nubus Navigation | HTTPS | All portal-integrated services |
| WOPI Discovery + CheckFileInfo | HTTPS | Collabora ↔ OpenCloud, Nextcloud, XWiki |
| WOPI SaveChild | HTTPS | OpenCloud/Nextcloud/XWiki → Collabora |
| BBB Room API | HTTPS | BBB backend |
| LDAP Bind/Search | LDAP | LimeSurvey, SSP, SOGo, XWiki, Keycloak |
| S3 Operations | S3 API | Nextcloud, OpenCloud, Element, Notes, ILIAS, OpenProject |
| ClamAV ICAP Scan | ICAP | Nextcloud |
| Dovecot IMAP | IMAP/IMAPS | SOGo, Postfix |
| Postfix SMTP Submission | SMTP/SMTPS | SOGo, other mail services |
| Notify Push WebSocket | WebSocket | Nextcloud |
