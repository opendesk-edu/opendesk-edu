<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Draw.io

## Purpose

Stateless diagramming tool (`jgraph/drawio`) for architecture diagrams,
flowcharts, UML, and network diagrams. Requires NO authentication and
persists NO data server-side. Users must export or save diagrams locally
before closing the browser tab.

## Requirements

### Requirement: Stateless operation

Draw.io SHALL load and function without any authentication or server-side
persistence.

#### Scenario: User creates diagram
- GIVEN any user (authenticated or not)
- WHEN the user navigates to the Draw.io portal tile
- THEN the editor loads at port 8080
- AND the user can create, edit, and export diagrams
- AND NO data is persisted when the browser tab is closed

#### Scenario: X-Forwarded-Host header
- GIVEN HAProxy ingress configured
- THEN `X-Forwarded-Host: drawio.opendesk.hrz.uni-marburg.de` is set
- AND Draw.io generates correct internal URLs

### Requirement: Resource constraints

Draw.io SHALL be deployed with modest resource limits suitable for its
stateless nature.

#### Scenario: Resource sizing
- GIVEN the deployment
- THEN CPU request is 200m, limit is 1 core
- AND memory request is 512Mi, limit is 2Gi

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
| License | Apache-2.0 |
| Image | `jgraph/drawio:latest` |
| Port | 8080 |
| Ingress | HAProxy, `X-Forwarded-Host` header |
| Resources | 200m-1 CPU, 512Mi-2Gi memory |
