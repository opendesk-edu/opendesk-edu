<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Draw.io (jgraph/drawio)

## Purpose

Stateless diagramming tool (`jgraph/drawio`) for architecture diagrams,
flowcharts, UML, and network diagrams. Requires **NO authentication** and
persists **NO data server-side**. Users must export or save diagrams locally
before closing the browser tab.

## Non-Goals

- Persistent diagram storage (use Nextcloud, Git repositories, etc.)
- Real-time collaboration (use Miro, Excalidraw, etc.)

## Requirements

### Requirement: Stateless diagram editor

Draw.io SHALL load and function entirely in the browser without any authentication
or server-side persistence.

#### Scenario: User creates diagram
- GIVEN any user (authenticated or anonymous)
- WHEN the user navigates to `drawio.opendesk.hrz.uni-marburg.de`
- THEN the editor loads at HTTP port 8080 (internal)
- AND HAProxy ingress routes traffic to port 8080
- AND the user can create, edit, and export diagrams
- AND NO data is persisted when the browser tab is closed

#### Scenario: Local export for persistence
- GIVEN a user with a completed diagram
- WHEN the user wants to save the diagram
- THEN the user MUST export or save to local device (File → Download as PNG/SVG/XML)
- OR save to Nextcloud / Git repo

### Requirement: X-Forwarded-Host for internal URL generation

Draw.io relies on the `X-Forwarded-Host` HTTP header to generate correct internal
URLs (for tools, plugins, etc.).

#### Scenario: HAProxy ingress header
- GIVEN HAProxy ingress routing to Draw.io
- THEN the HAProxy configuration sets `X-Forwarded-Host: drawio.opendesk.hrz.uni-marburg.de`
- AND Draw.io generates correct internal URLs (no broken links)

## Component Reference

| Component | Purpose | Replicas | Storage |
|-----------|---------|----------|---------|
| Draw.io Web | Static HTML/JS frontend (nginx) | 1 | None (stateless) |

## Security Context

| Component | RunAsUser | Capabilities | Seccomp |
|-----------|-----------|--------------|---------|
| Draw.io Web | 1001 (nginx) | drop: ALL | RuntimeDefault |

## Configuration Reference

| Property | Value |
|----------|-------|
| Auth | None (public access) |
| Ingress host | `drawio.opendesk.hrz.uni-marburg.de` |
| Container port | 8080 |
| Image | `jgraph/drawio:latest` |
| CPU request/limit | 200m-1 core |
| Memory request/limit | 512Mi-2Gi |

## Known Quirks

- **No persistence by design**: Draw.io is stateless. Users MUST export/save
  diagrams locally. Use Nextcloud or Git repositories for shared storage.
- **HTTP port 8080**: Draw.io uses HTTP (not HTTPS) internally. HAProxy ingress
  terminates TLS and forwards to port 8080 with `X-Forwarded-Host`.

## Depends On

HAProxy Ingress (with `X-Forwarded-Host` header)

## Integrates With

Nubus Portal (tile only — no data flow), Nextcloud (external export target)
