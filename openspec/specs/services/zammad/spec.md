<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Zammad

## Purpose

Multi-channel helpdesk and ticketing system for IT support, with Ruby on Rails
backend, SAML 2.0 authentication, PostgreSQL metadata, Redis for search/Faye
WebSocket push, and Elasticsearch for full-text ticket search. Supports ticket
submission via email, chat (web widget), phone (voice), and web form.

## Scope

This spec defines:
- ✅ **In scope**: Zammad helpdesk deployment, multi-channel ticketing (email, web form, chat widget, phone), Ruby on Rails backend, SAML 2.0 authentication, PostgreSQL metadata, Redis search/Faye WebSocket, Elasticsearch full-text search, agent management, SLA tracking
- ❌ **Out of scope**: General-purpose project management (see OpenProject), external knowledge base (see XWiki or BookStack), custom Zammad plugin development, voice/telephony infrastructure

## Non-Goals

- General-purpose project management (see `../openproject/spec.md`)
- External knowledge base (see `../xwiki/spec.md` or `../bookstack/spec.md`)

## Requirements

### Requirement: Multi-channel ticketing

Zammad SHALL support ticket creation and management via multiple channels:
email (via Postfix), web form, chat widget, and phone logging.

#### Scenario: User submits ticket via web form
- GIVEN an authenticated user navigating to Zammad
- WHEN the user creates a support ticket via the web form
- THEN the ticket is stored in PostgreSQL
- AND assigned to the appropriate agent/group based on configured triggers

#### Scenario: Ticket creation via email
- GIVEN an external sender emailing the helpdesk address
- WHEN Postfix receives the email
- THEN Zammad creates a ticket from the email via Postmaster filter
- AND the ticket includes the original email body and attachments

### Requirement: Elasticsearch full-text search

Zammad SHALL use Elasticsearch for fast full-text search across tickets,
articles, and knowledge base entries.

#### Scenario: Agent searches tickets
- GIVEN an agent searching for a keyword
- WHEN the search query is submitted
- THEN Elasticsearch returns matching tickets ranked by relevance
- AND results include ticket number, subject, customer name, and excerpt

#### Scenario: Elasticsearch connection
- GIVEN Zammad deployed with Elasticsearch enabled
- THEN Zammad connects to Elasticsearch on port 9200
- AND ticket indexing occurs automatically on creation/update

### Requirement: WebSocket real-time updates

Zammad SHALL push real-time updates to agents via Faye WebSocket (Redis-backed).

#### Scenario: New ticket notification
- GIVEN an agent viewing the Zammad dashboard
- WHEN a new ticket is created
- THEN the agent sees the new ticket without page refresh
- AND the WebSocket connection is maintained via Faye + Redis pub/sub

### Requirement: High timeout for long operations

Zammad SHALL be configured with extended timeouts for potentially long
operations (reporting, bulk imports, search).

#### Scenario: Long-running report
- GIVEN an agent running a complex report
- WHEN the operation takes more than 60 seconds
- THEN the HAProxy ingress does not time out
- AND `timeout-server: 3600s` and `timeout-client: 3600s` are applied

### Requirement: Persistent storage

Zammad SHALL persist ticket data, attachments, and configuration.

#### Scenario: Attachment persistence
- GIVEN a user attaching a file to a ticket
- WHEN the ticket is saved
- THEN the attachment is stored in the PVC
- AND survives pod restarts

## Depends On

Keycloak (SAML 2.0), PostgreSQL (`zammad` DB), Redis (search cache, Faye WebSocket), Elasticsearch, Postfix (email), HAProxy Ingress, Nubus Portal (tile)

## Integrates With

Nubus Portal (tile), Postfix (email tickets), Nextcloud (file attachments via Intercom), Intercom Service (cross-app SSO)

## Component Reference

| Property | Value |
|---------|-------|
| Auth | SAML 2.0 |
| Database | PostgreSQL (`zammad` DB, `zammad` user, 8Gi PVC) |
| Search | Elasticsearch (port 9200) |
| Cache | Redis (search cache + Faye WebSocket) |
| Storage | RWO PVC (`zammad-data`, 1Gi, `storageClassNames.RWO`) |
| License | AGPL-3.0 |

## SLO

**Tier**: High (critical for IT support, but can use email fallback)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Availability** | 99.5% (3.6 hours downtime/month max) | Uptime over 30-day window |
| **Latency (P95)** | <500ms (ticket page load) | Nginx access log analysis |
| **Latency (P95)** | <300ms (search query) | Elasticsearch metrics |
| **Error Rate** | <0.5% (HTTP 5xx) | Nginx access log analysis |
| **Email-to-Ticket** | <2 minutes (postfix → Zammad) | Postfix + Zammad logs |

**Alerts**:
- Zammad 5xx error rate >1% for 10 minutes → P2 alert
- Email ingestion failures >5 in 10 minutes → P1 alert
- Elasticsearch connection failures >3 in 5 minutes → P2 alert
- SAML authentication failures >5% for 5 minutes → P1 alert
- Disk usage >85% → P3 alert

**Capacity**:
- 200 concurrent agents
- 1,000 tickets per day (typical)
- 10,000 tickets per month (large institution)
- Database: 5 GB (typical), 50 GB (large institution)
- Elasticsearch: 10 GB (typical), 100 GB (large institution)

## Disaster Recovery

**Tier**: High (RPO: 1 hour, RTO: 2 hours)

**Backup Strategy**:
- **Database** (PostgreSQL): Hourly incremental + daily full backup, PITR enabled
- **Elasticsearch indices**: Daily snapshot
- **Attachments** (RWO PVC): Daily snapshot via k8up
- **Configuration**: GitOps-managed

**Recovery Order**:
1. PostgreSQL database restore - 15 min
2. Elasticsearch index restore - 20 min
3. RWO PVC attachment restore - 10 min
4. Zammad application deployment - 10 min
5. Redis cache deployment - 3 min
6. Postfix integration test - 5 min
7. SAML SP configuration verification - 5 min
8. Smoke tests (create ticket, search, email ingestion) - 10 min

**Critical Data**:
- Tickets and customer communications
- Agent assignments and workflows
- Knowledge base articles
- Email correspondence (via Postfix)
- Attachments and media files

**Failure Scenarios**:
- **Database corruption**: Restore from PITR, verify ticket data integrity
- **Elasticsearch corruption**: Restore from snapshot, rebuild search indices
- **Attachment loss**: Restore RWO PVC from snapshot, verify file checksums
- **Complete failure**: Redeploy from GitOps, restore DB + indices + attachments, re-register SAML SP
| Config | `databases.zammad.*`, `helmfile/apps/zammad/values.yaml.gotmpl` |
| Chart | Upstream `zammad/zammad` (custom values overlay) |
| Image | `ghcr.io/zammad/zammad:latest` |
| Replicas | 1 (default) |
| Resources | 200m-1 CPU, 512Mi-2Gi memory |
| Ingress | HAProxy, 3600s timeout |
| Security | `volumePermissions: true` |
