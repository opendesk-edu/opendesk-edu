<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Excalidraw

## Purpose

Lightweight hand-drawn whiteboard for brainstorming and visual collaboration.
Requires NO authentication and persists NO data server-side.

## Requirements

### Requirement: Stateless operation

Excalidraw SHALL load and function without any authentication.

#### Scenario: User draws on whiteboard
- GIVEN any user
- WHEN the user navigates to the Excalidraw portal tile
- THEN the whiteboard loads
- AND the user can draw, write, and share in real-time
- AND NO data is persisted when the browser tab is closed

## Depends On

None (stateless)

## Integrates With

Nubus Portal (tile only — no data flow)
