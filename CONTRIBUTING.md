<!--
SPDX-FileCopyrightText: 2023 Bundesministerium des Innern und für Heimat, PG ZenDiS "Projektgruppe für Aufbau ZenDiS"
SPDX-License-Identifier: Apache-2.0
-->

# Contributing to openDesk Edu

Thanks for your interest in contributing! Please read the [project's workflow documentation](./docs/developer/workflow.md)
for standards like commit messages and branching conventions.

## Helm vs. Operators vs. Manifests

Due to DVS requirements:

- we have to use [Helm charts](https://helm.sh/) (that can consist of Manifests).
- we should avoid stand-alone Manifests.
- we do not use Operators and CRDs.

In order to align the Helm files from various sources into the unified deployment of openDesk we make use of
[Helmfile](https://github.com/helmfile/helmfile).

## Educational Services

When contributing to the educational services (ILIAS, Moodle, BigBlueButton, OpenCloud):

- Each service has its own Helm chart under `helmfile/charts/<service>/`
- App-level values are in `helmfile/apps/<service>/`
- Follow the existing SAML/OIDC integration patterns
- Test SSO flows before submitting PRs

## Tooling

New tools should not be introduced without first discussing it with the team. We should avoid adding unnecessary complexity.

## In doubt? Ask!

When in doubt please [open an issue](https://github.com/tobias-weiss-ai-xr/opendesk-edu/issues) and start a discussion.
