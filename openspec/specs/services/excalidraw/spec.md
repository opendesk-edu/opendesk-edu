<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Excalidraw

## Purpose

Lightweight hand-drawn whiteboard for brainstorming and visual collaboration.
Requires NO authentication and persists NO data server-side. Users can
draw, write text, add shapes, and share via link (data encoded in URL hash).

## Requirements

### Requirement: Stateless operation

Excalidraw SHALL load and function without any authentication.

#### Scenario: User draws on whiteboard
- GIVEN any user
- WHEN the user navigates to the Excalidraw portal tile
- THEN the whiteboard loads
- AND the user can draw, write, and add shapes
- AND NO data is persisted when the browser tab is closed

## Depends On

HAProxy Ingress, Nubus Portal (tile)

## Integrates With

Nubus Portal (tile only — no data flow)

## Component Reference

| Property | Value |
|---------|-------|
| Auth | None (stateless) |
| Database | None |
| Storage | None |
| Cache | None |
| License | MIT |
