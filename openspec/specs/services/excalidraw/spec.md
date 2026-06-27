<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Excalidraw

## Purpose

Lightweight hand-drawn whiteboard for brainstorming and visual collaboration.
Requires **NO authentication** and persists **NO data server-side**. Users can
draw, write text, add shapes, and share via link (whiteboard data encoded in
URL fragment/hash). Stateful: only session state in client-side memory.

## Scope

This spec defines:
- ✅ **In scope**: Hand-drawn style whiteboard editor, stateless deployment (no authentication), client-side rendering, shareable via URL fragment/hash encoding, single-user drawing sessions
- ❌ **Out of scope**: Persistent whiteboard storage (use CryptPad, Miro, etc.), multi-user real-time collaboration (use Draw.io, Miro, etc.), authentication/authorization (public access only)

## Non-Goals

- Persistent whiteboard storage (use CryptPad, Miro, etc.)
- Multi-user real-time collaboration (use Draw.io, Miro, etc.)

## Requirements

### Requirement: Stateless whiteboard access

Excalidraw SHALL load and function without any authentication. No user login or
registration is required.

#### Scenario: User opens whiteboard
- GIVEN any user (authenticated or anonymous)
- WHEN the user navigates to `excalidraw.opendesk.hrz.uni-marburg.de`
- THEN the whiteboard loads without authentication
- AND the user can draw, write text, add shapes, export as PNG

### Requirement: No server-side persistence

Excalidraw SHALL NOT persist whiteboard data on the server. All data is stored
client-side (in browser memory or encoded in URL fragment).

#### Scenario: Whiteboard data loss on refresh
- GIVEN a user drawing on the whiteboard
- WHEN the user refreshes the browser page
- THEN the whiteboard drawing is lost (no server storage)
- AND the user must start fresh

#### Scenario: Shareable link (URL fragment encoding)
- GIVEN a user on an Excalidraw whiteboard
- WHEN the user shares the URL (includes URL fragment/hash)
- THEN recipients can access the whiteboard with the same drawing
- AND the drawing is encoded in the URL fragment (`#json={...}`)

### Requirement: Export functionality

Excalidraw SHALL support exporting whiteboards as image files.

#### Scenario: Export as PNG
- GIVEN a user with a completed whiteboard drawing
- WHEN the user clicks "Export" → "PNG"
- THEN Excalidraw generates a PNG file
- AND the user downloads the file to their local device

## Component Reference

| Component | Purpose | Replicas | Storage |
|-----------|---------|----------|---------|
| Excalidraw Web | Static HTML/JS frontend | 1 | None (stateless) |

## Security Context

| Component | RunAsUser | Capabilities | Seccomp |
|-----------|-----------|--------------|---------|
| Excalidraw Web | 1001 (nginx) | drop: ALL | RuntimeDefault |

## Configuration Reference

| Property | Value |
|----------|-------|
| Auth | None (public access) |
| Ingress host | `excalidraw.opendesk.hrz.uni-marburg.de` |
| Chart | Custom `helmfile/charts/excalidraw/` |

## Known Quirks

- **No persistence**: This is intentional — Excalidraw is for ephemeral
  brainstorming. Use CryptPad for persistent shared whiteboards.
- **URL fragment encoding**: Whiteboard data is encoded in the URL fragment.
  Very large drawings may hit URL length limits - in this case, export as PNG.

## Depends On

HAProxy Ingress

## Integrates With

Nubus Portal (tile only — no data flow)

## SLO

**Tier**: Low (stateless whiteboard, public access, no data flow)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Availability** | 99.0% (7.2 hours downtime/month max) | Uptime over 30-day window |
| **Latency (P95)** | <300ms (page load) | Nginx access log analysis |
| **Error Rate** | <1% (HTTP 5xx) | Nginx access log analysis |

**Alerts**:
- Excalidraw 5xx error rate >2% for 10 minutes → P3 alert
- Pod crash loop >3 in 5 minutes → P3 alert

**Capacity**:
- 1,000 concurrent users (stateless, easily scalable)
- 10,000 page loads per day

## Disaster Recovery

**Tier**: Low (RPO: N/A - stateless, RTO: 30 min)

**Backup Strategy**:
- **Configuration**: GitOps-managed
- **User data**: NONE (stateless service, all data client-side)

**Recovery Order**:
1. Excalidraw application deployment - 5 min
2. Smoke tests (page load, whiteboard rendering) - 5 min
3. User access restoration - 5 min

**Critical Data**:
- None (stateless service)

**Failure Scenarios**:
- **Pod crash**: Kubernetes auto-restart
- **Complete failure**: Redeploy from GitOps (no data to restore)
