<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Cross-Service Workflows

Defines end-to-end user workflows that span multiple services. Each workflow
specifies the service chain, data flow, and failure behavior.

## Workflow: Student SSO Login → Course Access

A student logs into the portal and accesses their ILIAS courses.

```
Keycloak → Nubus Portal → [ILIAS | Moodle]
```

#### Scenario: Student accesses ILIAS via portal
- GIVEN a student with an LDAP account
- WHEN the student navigates to `portal.opendesk.hrz.uni-marburg.de`
- THEN Nubus authenticates the student via OIDC through Keycloak
- AND the portal tile for ILIAS is visible (SAML-authorized group)
- WHEN the student clicks the ILIAS tile
- THEN ILIAS performs SAML SP-initiated SSO through Keycloak (silent login via Intercom)
- AND the student accesses their enrolled courses
- AND no re-authentication prompt is shown

#### Scenario: Student accesses Moodle via portal
- GIVEN the same student
- WHEN the student clicks the Moodle tile
- THEN Moodle performs Shibboleth SP-initiated SSO through Keycloak
- AND the student accesses their Moodle courses

#### Scenario: Keycloak unavailable
- GIVEN the student attempting to log in
- WHEN Keycloak is not responding
- THEN the portal returns an error
- AND no service is accessible (all depend on Keycloak for auth)

## Workflow: Instructor Uploads Course Material to ILIAS

An instructor uploads files that are stored in S3/MinIO, accessible from ILIAS.

```
Instructor → ILIAS → S3 (MinIO)
```

#### Scenario: File upload to ILIAS with S3 storage
- GIVEN an authenticated instructor in ILIAS
- WHEN the instructor uploads a PDF to an ILIAS course
- THEN ILIAS stores the file in the `ilias-data` S3 bucket
- AND the file is accessible to enrolled students
- AND the file survives pod eviction (stored in S3, not local PVC)

## Workflow: OX AppSuite Opens Nextcloud Filepicker

An OX user selects a file from Nextcloud while composing an email.

```
OX AppSuite → Intercom Service → Keycloak (silent login) → Nextcloud WebDAV API → S3
```

#### Scenario: Filepicker cross-app workflow
- GIVEN a user authenticated in OX AppSuite
- WHEN the user clicks "Attach file" in email compose
- THEN the Filepicker opens, calling the Intercom Service
- AND Intercom performs silent login to Keycloak for a Nextcloud token
- AND the Filepicker displays Nextcloud files via WebDAV API
- WHEN the user selects a file
- THEN the file reference is attached to the email (NOT duplicated)
- AND the file remains stored in Nextcloud's S3 bucket

#### Scenario: Intercom Service unavailable
- GIVEN a user attempting to use the Filepicker
- WHEN the Intercom Service is down
- THEN the Filepicker fails to load Nextcloud files
- AND OX AppSuite remains functional for non-Filepicker operations

## Workflow: OpenProject Project File Storage

A project manager enables Nextcloud file storage for an OpenProject project.

```
OpenProject ↔ Nextcloud (via opendesk-openproject-bootstrap)
```

#### Scenario: Enable file store per project
- GIVEN both OpenProject and Nextcloud deployed
- AND the bootstrap job has established trust
- WHEN a project admin enables the file store in OpenProject settings
- THEN project members can browse Nextcloud folders from OpenProject work packages
- AND attaching a file creates a reference (not a copy) in Nextcloud
- AND file versioning follows Nextcloud's version history

## Workflow: Semester Course Provisioning

Course creation and enrollment sync from campus system to LMS.

```
HISinOne webhook → Provisioning API → ILIAS/Moodle → Keycloak (LDAP sync)
```

#### Scenario: New semester course creation
- GIVEN the semester provisioning API is triggered
- WHEN new courses are created in HISinOne
- THEN provisioning creates matching courses in ILIAS and Moodle
- AND enrolled students are synced to course rosters
- AND student accounts are verified in Keycloak/LDAP

#### Scenario: Student drops course
- GIVEN a student who drops a course in HISinOne
- WHEN the disenrollment webhook fires
- THEN the student is removed from ILIAS/Moodle course rosters
- AND access to course materials is immediately revoked

## Workflow: Helpdesk Ticket with File Attachment

A user submits a Zammad ticket with a file from Nextcloud.

```
Zammad → Intercom Service → Keycloak → Nextcloud (WebDAV) → S3
```

#### Scenario: Ticket with attachment
- GIVEN an authenticated user opening Zammad
- WHEN the user attaches a file stored in Nextcloud
- THEN Zammad accesses the file via Intercom-mediated Nextcloud API
- AND the attachment is sent via SMTP relay
- AND the file reference is preserved in Zammad's storage

## Workflow: Real-Time Chat with File Sharing

A student shares a file from Nextcloud during an Element chat.

```
Element → Intercom Service → Keycloak → Nextcloud → S3
```

#### Scenario: Share Nextcloud file in chat
- GIVEN a user in an Element chat room
- WHEN the user selects "Share from Nextcloud"
- THEN Element calls Intercom to get a Nextcloud token
- AND the file browser shows Nextcloud files
- WHEN a file is shared
- THEN Element sends the file reference (not a copy) to chat participants
- AND participants with Nextcloud access can open the original file

## Workflow: Portal Newsfeed

XWiki blog entries appear in the Nubus portal newsfeed.

```
XWiki → Intercom Service → Nubus Portal (silent login)
```

#### Scenario: Newsfeed displays XWiki posts
- GIVEN XWiki blog entries published
- WHEN the portal renders the newsfeed section
- THEN Intercom calls XWiki via silent login
- AND blog entries are displayed in the portal newsfeed
- AND clicking a post opens XWiki (with silent auth, no login prompt)

## Workflow: Group-Based Access Across Services

An LDAP group change propagates to multiple services.

```
OpenLDAP → Keycloak → [SOGo, XWiki, ILIAS, Moodle, OpenProject]
```

#### Scenario: User added to OX-authorized group
- GIVEN an administrator adding a user to an OX-authorized LDAP group
- WHEN the OX Connector processes the change
- THEN the user gains OX AppSuite access
- AND the user appears in OX address book
- AND mail delivery is configured for the user

#### Scenario: Daily group sync
- GIVEN users who are direct members of XWiki-authorized LDAP groups
- WHEN the nightly XWiki LDAP sync job runs
- THEN those users are imported into XWiki
- AND gain wiki access without manual intervention
