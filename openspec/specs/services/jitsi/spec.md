<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Jitsi

## Purpose

Open-source video conferencing for online meetings, supporting screen sharing,
and Jigasi SIP integration for phone dial-in.

## Non-Goals

- Alternative video conferencing (see `../bigbluebutton/spec.md`)
- TURN server configuration (external infrastructure)

## Requirements

### Requirement: Video conferencing via OIDC

Jitsi Meet SHALL authenticate participants via OIDC.

#### Scenario: User joins meeting
- GIVEN an authenticated user clicking a Jitsi meeting link
- WHEN the user connects
- THEN the user is authenticated via OIDC
- AND can participate in audio/video

#### Scenario: Screen sharing
- GIVEN a user in an active Jitsi meeting
- WHEN the user shares their screen
- THEN other participants see the shared screen in real-time

### Requirement: Jigasi SIP integration

Jigasi SHALL allow participants to join meetings via phone call when a SIP server
and SIP trunk are configured.

#### Scenario: Phone dial-in
- GIVEN Jigasi configured with a SIP connection
- WHEN a participant dials the configured phone number
- THEN the participant joins the meeting via audio-only
