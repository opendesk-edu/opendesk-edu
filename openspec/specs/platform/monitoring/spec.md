<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Monitoring

## Purpose

Prometheus metrics collection, Grafana dashboards, and Alertmanager alert routing.

## Non-Goals

- Log aggregation (see `../backup/spec.md` — Loki/Promtail are logging, not monitoring)
- Uptime monitoring (external system: kuvasz-uptime)

## Requirements

### Requirement: Prometheus metrics collection

The platform SHALL deploy Prometheus to scrape metrics from instrumented services.

#### Scenario: Service health monitoring
- GIVEN services exposing `/metrics` endpoints in Prometheus format
- WHEN Prometheus scrapes configured targets
- THEN metrics are stored in the time-series database
- AND dashboards display real-time service health

### Requirement: Custom Grafana dashboards

Education-specific Grafana dashboards SHALL be deployed via the
`grafana-dashboards` Helm chart.

#### Scenario: Dashboard availability
- GIVEN the `grafana-dashboards` chart deployed
- WHEN Grafana loads
- THEN education-specific dashboards are available for import

### Requirement: Alert routing via Alertmanager

The platform SHALL deploy Alertmanager to route alerts from Prometheus
to configured notification channels.

#### Scenario: Alert triggered
- GIVEN a Prometheus alerting rule violation (e.g., service down, high latency)
- WHEN the rule fires
- THEN Alertmanager receives the alert
- AND routes it to configured notification channels (email, webhook, etc.)
