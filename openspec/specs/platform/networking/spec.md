<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Networking

## Purpose

Ingress routing, DNS resolution, outbound proxy, and TLS certificate
management.

## Non-Goals

- Internal service-to-service DNS (CoreDNS default)
- VPN or tunnel configuration

## Requirements

### Requirement: HAProxy ingress routing

The platform SHALL use HAProxy Ingress as the primary ingress controller,
routing external HTTPS traffic to backend services.

#### Scenario: Host-based routing
- GIVEN an Ingress resource with a host rule for `nextcloud.opendesk.hrz.uni-marburg.de`
- WHEN a request arrives matching the host header
- THEN HAProxy routes the request to the Nextcloud service
- AND TLS termination is performed at the ingress

#### Scenario: Snippet annotations enabled
- GIVEN applications using HAProxy snippet annotations
- THEN `allowSnippetAnnotations=true` SHALL be configured on the ingress controller
- AND `admissionWebhooks.allowSnippetAnnotations=true` SHALL also be enabled

#### Scenario: Large header support
- GIVEN applications with large HTTP headers (e.g., UDM REST API)
- THEN HAProxy SHALL be configured with `tune.bufsize 65536` and `tune.http.maxhdr 256`
- AND requests are not rejected with 431 Request Header Fields Too Large

### Requirement: TLS via cert-manager

The platform SHALL manage TLS certificates via cert-manager, with support for
providing a pre-existing certificate secret.

#### Scenario: Automatic certificate issuance
- GIVEN cert-manager installed and a `Certificate` resource with the domain
- WHEN the Ingress is created
- THEN cert-manager issues a TLS certificate
- AND the certificate is stored in a Kubernetes secret referenced by the Ingress

#### Scenario: Pre-existing certificate
- GIVEN a TLS certificate stored in a Kubernetes secret
- WHEN certificate management is disabled in configuration
- THEN the Ingress references the provided secret
- AND no cert-manager Certificate resource is deployed

### Requirement: Outbound proxy for internet access

Pods requiring internet access SHALL route through the HTTP proxy.

#### Scenario: Pod accesses external URL
- GIVEN a pod configured with the HTTP proxy
- WHEN the pod makes an outbound HTTPS request
- THEN the request routes through `http://www-proxy2.uni-marburg.de:3128`
- AND the proxy hostname `www-proxy2.uni-marburg.de` resolves via DNS

### Requirement: DNS CNAME chain workaround

Due to a CoreDNS limitation in the HRZ cluster, services requiring external
CNAME resolution SHALL use `hostAliases` with the ingress IP.

#### Scenario: External CNAME resolution fails
- GIVEN CoreDNS attempting to resolve an external CNAME chain
- WHEN the chain exceeds CoreDNS's resolution depth
- THEN CoreDNS returns SERVFAIL
- AND the affected service SHALL be configured with `hostAliases` pointing to the ingress IP

### Requirement: Proxy hostname resolution

The proxy hostname `www-proxy2.uni-marburg.de` resolves via DNS, but the
alias `proxy02.hrz.uni-marburg.de` does NOT.

#### Scenario: Invalid proxy alias
- GIVEN a pod configured with `proxy02.hrz.uni-marburg.de` as proxy
- WHEN the pod attempts DNS resolution
- THEN resolution fails
- AND the pod SHALL use `www-proxy2.uni-marburg.de` instead

## DNS Configuration

- Domain: `*.opendesk.hrz.uni-marburg.de` → `192.168.3.201` (ingress IP)
- Nameservers: `137.248.21.22`, `137.248.1.5`, `137.248.1.8`
- Proxy: `http://www-proxy2.uni-marburg.de:3128`

## Per-Service Ingress Timeouts

| Service | Timeout (s) | Reason |
|---------|-------------|--------|
| Collabora | 600 | Long document processing |
| Jitsi | 3600 | Long-lived WebSocket during meetings |
| Nextcloud | 600 | Large file uploads |
| Notes Y-Provider | 86400 | Long-lived Y.js WebSocket connections |
| All others | 100 | Default body timeout |

## Known Networking Issues

### ingress-nginx and HAProxy share external IP

Both `ingress-nginx` and `haproxy` ingress controllers are deployed with the
external IP `192.168.3.201`. The nginx-ingress controller does NOT process
all ingresses — only those with `ingressClassName: nginx`. Most services use
`ingressClassName: haproxy`.

#### Scenario: Ingress class mismatch
- GIVEN a service Ingress with `ingressClassName: nginx`
- WHEN the nginx ingress controller does not have the matching host rule
- THEN traffic to that host is NOT routed
- AND the service SHALL use `ingressClassName: haproxy` instead

### Nextcloud AIO probe timing

Nextcloud AIO uses `initialDelaySeconds` instead of `periodSeconds` for
readiness/startup probes, causing 10x PHP-FPM load and container restart
loops. The deployment and chart template SHALL be patched to use
`periodSeconds` with appropriate values.

### Planka ingress class annotation conflict

The upstream Planka chart sets `kubernetes.io/ingress.class: nginx` annotation
in `values.yaml`. When using HAProxy ingress, this annotation MUST be removed,
keeping only `ingressClassName: haproxy`.
