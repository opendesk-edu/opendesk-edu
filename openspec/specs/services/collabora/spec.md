<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Collabora Online

## Purpose

Online office document editing (ODT, XLSX, PPTX, DOCX) accessed through
Nextcloud. Collabora does NOT require separate authentication — the session
is delegated from Nextcloud.

## Non-Goals

- Standalone Collabora deployment (always accessed via Nextcloud)

## Requirements

### Requirement: Session delegation from Nextcloud

Collabora SHALL receive authentication from Nextcloud without requiring users
to re-authenticate.

#### Scenario: User edits document in Nextcloud
- GIVEN a user opening an Office document in Nextcloud
- WHEN the user clicks "Edit in Collabora"
- THEN Collabora loads within Nextcloud
- AND the user's Nextcloud session is used for authorization
- AND no separate login is required

### Requirement: Real-time collaborative editing

Multiple users SHALL edit the same document simultaneously without conflicts.

#### Scenario: Concurrent editing
- GIVEN two users with access to the same document in Nextcloud
- WHEN both users edit simultaneously
- THEN changes are merged in real-time by Collabora
- AND no conflict resolution errors occur

## Depends On

Nextcloud (delegates office editing)

## Integrates With

Nextcloud (WOPI delegate for document editing)
