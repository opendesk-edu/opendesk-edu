<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# BigBlueButton

## Purpose

Teaching-optimized video conferencing alternative to Jitsi with built-in
recording, whiteboard, breakout rooms, session timers, and SAML authentication.

## Non-Goals

- Standard video conferencing (see `../jitsi/spec.md`)
- GPU transcription (planned v1.2)

## Requirements

### Requirement: Teaching-oriented video conferencing

BigBlueButton SHALL support recording, whiteboard annotation, breakout rooms,
and session management optimized for teaching scenarios.

#### Scenario: Instructor starts recording
- GIVEN an instructor starting a recorded BBB session
- WHEN the session begins
- THEN the session is recorded
- AND the recording is stored on persistent RWX storage
- AND the recording is accessible via the BBB playback URL

#### Scenario: Breakout rooms
- GIVEN an instructor with a large class
- WHEN the instructor creates breakout rooms
- THEN students are assigned to separate rooms for group work
- AND the instructor can move between rooms

### Requirement: Redis cache dependency

BigBlueButton SHALL require a Redis instance for session management.

#### Scenario: Redis connection
- GIVEN BigBlueButton deployed
- THEN Redis SHALL be available at `redis-headless:6379`
- AND BBB SHALL fail to start without Redis connectivity

### Requirement: Mutual exclusivity with Jitsi

BigBlueButton and Jitsi SHALL NOT be deployed simultaneously.

#### Scenario: Only one video service active
- GIVEN both BBB and Jitsi available
- WHEN the environment is applied
- THEN exactly one video conferencing service is deployed

## Component Reference

| Property | Value |
|:---------|:------|
| Auth | SAML 2.0 (Shibboleth SP) |
| Database | PostgreSQL (`bigbluebutton` DB, `bbb_user`) |
| Cache | Redis (`redis-headless:6379`) |
| Storage | RWX PVC (recordings) |
| License | LGPL-3.0 |
| Config | `databases.bbb.*`, `cache.bbb.*` |
| Alternative to | Jitsi |
