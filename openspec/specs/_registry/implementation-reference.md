<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Implementation Reference

Maps spec requirements to the Helm charts, templates, and values files that
implement them. Services without a local chart use the upstream openDesk chart.

## Local Charts (helmfile/charts/)

| Service | Chart Path | Key Templates | Values |
|---------|-----------|---------------|--------|
| ILIAS | `helmfile/charts/ilias/` | `deployment.yaml`, `pvc.yaml`, `service.yaml`, `backup-cronjob.yaml`, `sso-configmap.yaml` | `helmfile/apps/ilias/values.yaml.gotmpl` |
| Moodle | `helmfile/charts/moodle/` | `deployment.yaml`, `pvc.yaml`, `service.yaml`, `ingress.yaml` | `helmfile/apps/moodle/values.yaml.gotmpl` |
| BigBlueButton | `helmfile/charts/bigbluebutton/` | `deployment.yaml`, `pvc.yaml`, `service.yaml`, `redis-deployment.yaml` | `helmfile/apps/bigbluebutton/values.yaml.gotmpl` |
| Etherpad | `helmfile/charts/etherpad/` | `deployment.yaml`, `postgresql-statefulset.yaml`, `postgresql-service.yaml`, `service.yaml` | `helmfile/apps/etherpad/values.yaml.gotmpl` |
| BookStack | `helmfile/charts/bookstack/` | `deployment.yaml`, `pvc.yaml`, `service.yaml`, `ingress.yaml` | `helmfile/apps/bookstack/values.yaml.gotmpl` |
| Planka | `helmfile/charts/planka/` | `deployment.yaml`, `pvc.yaml`, `service.yaml`, `ingress.yaml` | `helmfile/apps/planka/values.yaml.gotmpl` |
| Zammad | `helmfile/charts/zammad/` | `deployment.yaml`, `pvc.yaml`, `service.yaml`, `ingress.yaml` | `helmfile/apps/zammad/values.yaml.gotmpl` |
| LimeSurvey | `helmfile/charts/limesurvey/` | `deployment.yaml`, `pvc.yaml`, `service.yaml`, `ingress.yaml` | `helmfile/apps/limesurvey/values.yaml.gotmpl` |
| Draw.io | `helmfile/charts/drawio/` | `deployment.yaml`, `service.yaml`, `ingress.yaml` | `helmfile/apps/drawio/values.yaml.gotmpl` |
| Excalidraw | `helmfile/charts/excalidraw/` | `deployment.yaml`, `service.yaml`, `ingress.yaml` | `helmfile/apps/excalidraw/values.yaml.gotmpl` |
| Self-Service Password | `helmfile/charts/self-service-password/` | `deployment.yaml`, `service.yaml`, `ingress.yaml` | `helmfile/apps/self-service-password/values.yaml.gotmpl` |
| TYPO3 CMS | `helmfile/charts/typo3/` | `deployment.yaml`, `pvc.yaml`, `service.yaml`, `ingress.yaml` | `helmfile/apps/typo3/values.yaml.gotmpl` |
| SOGo | `helmfile/charts/sogo/` | `deployment.yaml`, `pvc.yaml`, `service.yaml`, `ingress.yaml`, `configmap.yaml` | `helmfile/apps/sogo/values.yaml.gotmpl` |
| OpenCloud | `helmfile/charts/opencloud/` | `deployment.yaml`, `pvc.yaml`, `service.yaml`, `ingress.yaml` | `helmfile/apps/opencloud/values.yaml.gotmpl` |
| Grommunio | `helmfile/charts/grommunio/` | `deployment.yaml`, `pvc.yaml`, `service.yaml`, `ingress.yaml` | `helmfile/apps/grommunio/values.yaml.gotmpl` |

## Upstream Charts (no local chart)

| Service | Upstream Source | Config Path |
|---------|----------------|-------------|
| Nubus | openDesk Nubus chart | `helmfile/apps/nubus/values.yaml.gotmpl` |
| Nextcloud | openDesk Nextcloud chart | `helmfile/apps/nextcloud/values.yaml.gotmpl` |
| OX AppSuite | openDesk Open-X-Change chart | `helmfile/apps/open-xchange/values.yaml.gotmpl` |
| Element | openDesk Element chart | `helmfile/apps/element/values.yaml.gotmpl` |
| Jitsi | openDesk Jitsi chart | `helmfile/apps/jitsi/values.yaml.gotmpl` |
| OpenProject | openDesk OpenProject chart | `helmfile/apps/openproject/values.yaml.gotmpl` |
| XWiki | openDesk XWiki chart | `helmfile/apps/xwiki/values.yaml.gotmpl` |
| Collabora | openDesk Collabora chart | `helmfile/apps/collabora/values.yaml.gotmpl` |
| CryptPad | openDesk CryptPad chart | `helmfile/apps/cryptpad/values.yaml.gotmpl` |
| Notes | openDesk Notes chart | `helmfile/apps/notes/values.yaml.gotmpl` |

## Infrastructure Charts

| Component | Chart Path | Purpose |
|-----------|-----------|---------|
| Network Policies | `helmfile/charts/network-policies/` | Kubernetes NetworkPolicy resources |
| Grafana Dashboards | `helmfile/charts/grafana-dashboards/` | Pre-built Grafana dashboards |
| Alertmanager | `helmfile/charts/alertmanager/` | Prometheus Alertmanager config |
| Promtail | `helmfile/charts/promtail/` | Log collection agent |
| Loki | `helmfile/charts/loki/` | Log aggregation backend |
| Snipr | `helmfile/charts/snipr/` | DNS record management |
| F13 | `helmfile/charts/f13/` | Feature flag service |

## Platform Templates

| Concern | Config Path |
|---------|-------------|
| Global values | `helmfile/environments/default/global.yaml.gotmpl` |
| Database credentials | `helmfile/environments/default/databases.yaml.gotmpl` |
| Object storage | `helmfile/environments/default/objectstores.yaml.gotmpl` |
| Ingress config | `helmfile/environments/default/ingress.yaml.gotmpl` |
| Root helmfile | `helmfile.yaml.gotmpl` |
