<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# LTI Integration

## Purpose

Learning Tools Interoperability (LTI) enables embedding openDesk services as tools in LMS platforms (ILIAS, Moodle) for seamless educational workflows. Students can access embedded tools without separate authentication, maintaining active session state across platforms.

## Non-Goals

- LTI 1.x/2.x specification mechanics (handled by LTI libraries)
- Learning Analytics (Caliper) tool registration
- Deep Linking content selection (LTI 1.3+)

---

## Requirements

### Requirement: Planka LTI integration

Planka SHALL provide LTI 1.1 consumer integration for embedding Kanban boards as tools in ILIAS and Moodle course materials.

#### Scenario: LTI tool registration in ILIAS

- ILIAS SHALL configure Planka as an external tool with LTI consumer key/secret
- Tool URL: `https://planka.opendesk.hrz.uni-marburg.de`
- LTI parameters: `context_id`, `context_label`, `resource_link_id`, `resource_link_title`, `user_id`, `user_name`, `user_email.roles`

#### Scenario: LTI launch from ILIAS course

- GIVEN a student in an ILIAS course with an embedded Planka board
- WHEN the student clicks the Planka LTI tool link
- THEN ILIAS initiates an LTI launch request to Planka via OAuth signature
- AND Planka validates the LTI consumer key and OAuth signature
- AND the student is logged in as an LTI user (shared user mode: all students share one account)
- AND the student sees the embedded Kanban board in ILIAS iframe

#### Scenario: LTI launch from Moodle course

- GIVEN a learner in a Moodle activity using External Tool
- WHEN the learner opens the Planka LTI activity
- THEN Moodle initiates LTI launch request to Planka with OAuth signature
- AND Planka validates LTI authentication and retrieves context information
- AND the learner is logged into Planka as LTI user
- AND the learner can view and interact with the Kanban board

### Requirement: LTI user management

Planka SHALL use shared LTI user accounts across all LTI launches from the same LMS instance to avoid excessive user creation.

#### Scenario: First-time LTI user creation

- GIVEN the first LTI launch from ILIAS into Planka
- WHEN no existing LTI user exists for the ILIAS LTI consumer key
- THEN Planka creates a new LTI user account
- AND user name/email are mapped from LTI parameters (`user_name`, `user_email`)
- AND user role is set to `USER` (not admin, unless LTI `roles` parameter includes `Instructor`)

#### Scenario: Subsequent LTI launches reuse same account

- GIVEN an existing LTI user account for the ILIAS consumer key
- WHEN another ILIAS student launches the same Planka board via LTI
- THEN Planka authenticates and reuses the existing LTI user account
- AND no duplicate user accounts are created

#### Scenario: Instructor role mapping via LTI

- GIVEN an instructor launching Planka via LTI with `LTI_ROLES=Instructor` parameter
- WHEN Planka receives the launch request
- THEN the LTI user is granted `ADMIN` role instead of `USER`
- AND the instructor can create/modify Kanban boards in addition to viewing them

### Requirement: Data context preservation

Planka SHALL preserve LTI context IDs across launches to identify which LMS course and resource the embedded board belongs to.

#### Scenario: Context tracking

- GIVEN a Planka board embedded as LTI tool with specific `resource_link_id`
- WHEN the board is accessed via LTI launch
- THEN Planka stores the LTI `context_id` and `resource_link_id` metadata
- AND future LTI launches to the same board can reference this metadata for analytics

### Requirement: Session management

Plaka SHALL maintain LTI user sessions throughout the tool interaction while the LMS session remains active.

#### Scenario: Session persistence

- GIVEN a student actively working in an embedded Planka board
- WHILE the student adds cards, moves items, updates assignments
- THEN the LTI user session remains valid for the tool interaction duration
- AND changes persist even if the page is reloaded (via LTI re-launch with same `resource_link_id`)

### Requirement: Tool Provider (TP) vs LMS endpoint configuration

Planka SHALL operate as LTI Tool Provider (TP) that ingests Basic LTI launch requests from LMS platforms which act as LTI Tool Consumers (TCs).

#### Scenario: Planka TP endpoint configuration

- GIVEN ILIAS/L Moodle configured as LTI Consumer with Planka consumer key/secret
- WHEN LTI Consumer sends launch request to Plank's LTI endpoint
- THEN the endpoint URL is `/lti/launch` (default LTI 1.1 standard)
- AND the endpoint accepts POST requests with LTI parameters and OAuth signature verification

#### Scenario: Consumer key/secret revocation

- GIVEN an ILIAS/Moodle administrator revokes the LTI consumer key/secret
- WHEN Planka receives a launch with invalid credentials
- THEN the LTI launch is rejected with authentication error
- AND the embedded board displays LTI authentication failure message

## Depends On

- LTI libraries (Planka backend LTI integration, ILIAS/Moodle LTI providers)
- PostgreSQL (LTI consumer key/secret storage, LTI user account data)
- Keycloak (OIDC for non-LTI access, optional for LTI-LTI-AI-LTI interactions)
- HAProxy Ingress (LTI endpoint consumption)

## Integrates With

- ILIAS (LTI Consumer, LTI tool configuration, course-based context)
- Moodle (LTI Consumer, External Tool activities)
- OpenProject (alternative project management for more complex workflows)

## Known Quirks

- **Shared user mode**: Planka LTI uses shared user accounts per LTI consumer key, not per-student users. This simplifies user management but limits individual tracking within the tool.
- **LTI 1.1 only**: Planka supports LTI 1.1 (BasicLTI) only, not LTI 1.3+ Deep Linking or LTI 2.0.
- **Role mapping**: Only basic role mapping supported (`Instructor` → admin, no explicit mapping for `Learner`, `TeachingAssistant`, etc.).
- **No grade passback**: Planka does not implement LTI gradebook services (grade passback would be used for analytics only).

## Configuration Reference

| Property | Value |
|----------|-------|
| LTI version | 1.1 (BasicLTI) |
| Planka LTI endpoint | `https://planka.opendesk.hrz.uni-marburg.de/lti/launch` |
| LTI consumer key storage | `secrets.planka.lti_consumer_key` |
| LTI consumer secret storage | `secrets.planka.lti_consumer_secret` |
| LTI user mapping | One shared account per LTI consumer key |
| Default LTI user role | `USER` |
| LTI context tracking | `context_id`, `context_label`, `resource_link_id` stored in board metadata |
| OAuth signature requirement | Yes, provider_key, signature, signature_version, oauth_nonce, timestamp |
