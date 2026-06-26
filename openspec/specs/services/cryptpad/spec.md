<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# CryptPad

## Purpose

End-to-end encrypted collaborative editor for diagrams.net documents, accessed
through Nextcloud. CryptPad does NOT require separate authentication.

## Non-Goals

- Standalone CryptPad deployment (always accessed via Nextcloud)

## Requirements

### Requirement: Encrypted diagram editing

CryptPad SHALL edit .drawio files within Nextcloud with end-to-end
encryption.

#### Scenario: User edits diagram in Nextcloud
- GIVEN a user opening a .drawio file in Nextcloud
- WHEN the user clicks to edit
- THEN CryptPad loads within Nextcloud
- AND the document is encrypted end-to-end
- AND server-side access to document content is not possible

## Component Reference

| Property | Value |
|---------|:------|
| Auth | Via Nextcloud session |
| Storage | RWO PVC |
| License | AGPL-3.0 |
