<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Notes (Docs)

## Purpose

Collaborative note-taking application with OIDC authentication and PostgreSQL
backend.

## Requirements

### Requirement: Note creation and sharing

Users SHALL create, edit, and share notes with real-time collaboration.

#### Scenario: User creates a note
- GIVEN an authenticated user
- WHEN the user navigates to the Notes portal tile
- THEN the user is authenticated via OIDC
- AND can create and edit notes
