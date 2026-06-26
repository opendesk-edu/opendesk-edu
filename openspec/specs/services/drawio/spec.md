<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Draw.io

## Purpose

Stateless diagramming tool for architecture diagrams, flowcharts, and UML. Requires
NO authentication and persists NO data server-side.

## Requirements

### Requirement: Stateless operation

Draw.io SHALL load and function without any authentication or server-side
persistence.

#### Scenario: User creates diagram
- GIVEN any user (authenticated or not)
- WHEN the user navigates to the Draw.io portal tile
- THEN the editor loads
- AND the user can create, edit, and export diagrams
- AND NO data is persisted when the browser tab is closed

#### Scenario: No server-side storage
- GIVEN a user who created a diagram
- WHEN the browser tab is closed
- THEN the diagram is NOT stored on the server
- AND the user MUST save or export before closing

## Component Reference

| Property | Value |
|---------|:------|
| Auth | None (stateless) |
| Database | None |
| Storage | None |
| License | Apache-2.0 |
