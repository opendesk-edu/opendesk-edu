<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SP-License-Identifier: Apache-2.0
-->

# Spec Writing Methodology

## Purpose

This spec defines the methodology for writing openDesk Edu OpenSpecs, ensuring
consistency, completeness, and testability across all specifications.

## Non-Goals

- Formal requirements engineering processes (too heavyweight for agile)
- Spec authoring toolchain (choose any editor, no tool mandate)
- Spec approval process (delegated to maintainers, not in scope)

## Requirements

### Requirement: RFC 2119 Keywords

All requirements SHALL use RFC 2119 keywords (SHALL, MUST, SHOULD, MAY) to
indicate requirement levels.

#### Scenario: Requirement leveling
- GIVEN a description of a feature or behavior
- WHEN converting to a formal requirement
- THEN mandatory behaviors use `SHALL` or `MUST`
- AND recommended behaviors use `SHOULD`
- AND optional behaviors use `MAY`
- AND禁止性的要求 use `SHALL NOT` or `MUST NOT`

#### Scenario: Requirement consistency
- GIVEN multiple related requirements
- WHEN reviewing for consistency
- THEN all requirements use RFC 2119 keywords
- AND `SHALL` is used for *require* not *may be*
- AND `MAY` is used for *optional* not *should sometimes*

### Requirement: Given-When-Then Testability

All requirements SHALL have at least one testable scenario using Given-When-Then
(Gherkin) format.

#### Scenario: Minimum testable scenario
- GIVEN a requirement (e.g., "Users SHALL authenticate via OIDC")
- WHEN writing the requirement
- THEN at least one scenario is provided (e.g., "User authenticates via OIDC")
- AND the scenario starts with "GIVEN"
- AND followed by "WHEN"
- AND followed by "THEN"
- AND optionally followed by "AND" for additional assertions

#### Scenario: Scenario completeness
- GIVEN a requirement with complex behavior
- WHEN writing scenarios
- THEN happy path scenarios are covered (normal operation)
- AND error scenarios are covered (unexpected inputs, failures)
- AND edge cases are covered (boundary values, null inputs)
- AND each scenario is independently testable

### Requirement: Modular Scoped Specs

Each spec SHALL cover a single bounded domain or service behavior.

#### Scenario: Single responsibility
- GIVEN a spec file to create
- WHEN selecting the spec scope
- THEN the spec covers one domain (auth, services, platform, integrations)
- AND the spec does not mix multiple unrelated domains
- AND the spec can be understood independently

#### Scenario: Domain decomposition
- GIVEN a complex service (e.g., Keycloak with IAM, OIDC, SAML features)
- WHEN splitting across multiple specs
- THEN Keycloak IAM spec covers identity management
- AND Keycloak OIDC spec covers OIDC endpoint behavior
- AND Keycloak SAML spec covers SAML SP-SSO behavior
- AND each spec remains modular and focused

### Requirement: Depends On / Integrates With Cross-References

Each spec SHALL explicitly state dependencies and integration points.

#### Scenario: Depends On specification
- GIVEN a spec that requires other services or infrastructure
- WHEN writing the spec
- THEN a "Depends On" section is included
- AND each dependency is listed with specific host:port references
- AND secret references are specified (e.g., `secret.service.passwordKey`)
- AND infrastructure dependencies are listed (e.g., ingress class, storage class)

#### Scenario: Integrates With specification
- GIVEN a spec that integrates with other services
- WHEN writing the spec
- THEN an "Integrates With" section is included
- AND API contracts are referenced (with links or IDs)
- AND service dependencies are listed (with integration context)
- AND shared resources are documented (databases, storage, caches)

### Requirement: Component Reference Table

Each spec SHALL include a Component Reference table with key implementation
details.

#### Scenario: Required Component Reference fields
- GIVEN a spec for a service
- WHEN writing the Component Reference
- THEN the table includes: Auth, Database, Cache, Storage, Ports
- AND the table includes License, Config, Chart, Health
- AND values are concrete (host:port, secret references, version numbers)

#### Scenario: Component Reference accuracy
- GIVEN a Component Reference table
- WHEN the service is deployed
- THEN the listed values match the actual deployment
- AND secret keys match the actual Kubernetes secret keys
- AND chart paths are valid and exist in helmfile/charts/

### Requirement: SPDX License Headers

All spec files SHALL include SPDX license headers at the top of the file.

#### Scenario: License header format
- GIVEN a new spec file
- WHEN creating the file
- THEN the first lines are HTML comments with SPDX tags
- AND the format is:
  ```
  <!--
  SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
  SPDX-License-Identifier: Apache-2.0
  -->
  ```

#### Scenario: License header consistency
- GIVEN all spec files
- WHEN reviewing license headers
- THEN all files use the same license (Apache-2.0 for specs)
- AND the copyright year is current (e.g., "2026")
- AND the copyright text is "openDesk Edu Contributors"
- AND no custom licenses are introduced

### Requirement: Purpose and Non-Goals Sections

Each spec SHALL include Purpose and Non-Goals sections at the beginning.

#### Scenario: Purpose clarity
- GIVEN a spec to write
- WHEN writing the Purpose section
- THEN the section describes *what* the spec covers in 1-2 sentences
- AND the scope is clearly bounded
- AND the audience is identified (e.g., "platform operators", "developers")

#### Scenario: Non-Goals delineation
- GIVEN a spec's purpose defined
- WHEN writing the Non-Goals section
- THEN the section explicitly states what is NOT covered
- AND each non-goal is a single line
- AND non-goals are relevant decoys (not obviously unrelated)

### Requirement: Spec File Naming Convention

Spec files SHALL follow a consistent naming convention.

#### Scenario: Service spec naming
- GIVEN a spec for a service (e.g., ILIAS)
- WHEN creating the spec file
- THEN the filename is `openspec/specs/services/<service>/spec.md`
- AND the directory name matches the service name (lowercase, hyphenated)
- AND the filename is always `spec.md`

#### Scenario: Platform spec naming
- GIVEN a spec for a platform feature (e.g., monitoring)
- WHEN creating the spec file
- THEN the filename is `openspec/specs/platform/<category>/<spec>/spec.md`
- AND the category is one of: deployment, networking, storage, security, monitoring
- AND the spec name is descriptive (e.g., `operations/`, `glossary/`, `api-contracts/`)

### Requirement: Tax гемера стоит JSON output Format

API contracts and shared data structures SHALL be documented with JSON examples.

#### Scenario: JSON example completeness
- GIVEN an API contract or data structure
- WHEN documenting it
- THEN a JSON example is provided
- AND required fields are marked (e.g., comments or description)
- AND optional fields are identified
- AND data types are explicit (string, number, boolean, array, object)

#### Scenario: JSON example validity
- GIVEN a JSON example
- WHEN validated with a JSON parser
- THEN the example is valid JSON
- AND no syntax errors exist (missing quotes, trailing commas)
- AND the example is copy-pasteable for testing

## Depends On

- METHODOLOGY.md (AI-assisted development methodology)
- existing-spec/* (reference implementations for patterns)

## Integrates With

**Platform Specs**:
- Services/* (all service specs follow this methodology)
- Platform/* (all platform specs follow this methodology)
- Integrations/* (all integration specs follow this methodology)

**Development Processes**:
- CHANGELOG contribution guide (spec updates)
- CI workflows (spec validation, linting, testing)

## Component Reference

| Property | Value |
|---------|-------|
| Spec Format | Markdown (CommonMark) |
| Templating | Helm template syntax for values references |
| License | Apache-2.0 (all specs) |
| Headers | SPDX license header at top of every file |
| Sections | Purpose, Non-Goals, Requirements, Depends On, Integrates With, Component Reference |
| Requirement Keywords | RFC 2119 (SHALL/MUST/SHOULD/MAY) |
| Testability | Given-When-Then scenarios per requirement |
| Cross-References | Markdown links with path-relative URLs |
| Naming | `openspec/specs/<domain>/<category|service>/spec.md` |
| Line Length | 80-120 characters (no hard line breaks) |
| Formatting | 2-space indentation for nested lists, bullet points for lists |
| Language | English (lowercase for acronyms in text, uppercase for beginnings) |
| Config | `.editorconfig`, `.yamllint`, `.markdownlint` (if applicable) |
| Chart | N/A (this is a methodology spec) |
| Health | N/A (mentor review required) |

## Spec Writing Checklist

Before submitting a spec, verify:

- [ ] SPDX license header at top of file (correct year, Apache-2.0)
- [ ] Purpose section clearly describes scope (1-2 sentences)
- [ ] Non-Goals section explicitly lists out-of-scope items
- [ ] Requirements use RFC 2119 keywords (SHALL/MUST/SHOULD/MAY)
- [ ] Each requirement has at least one Given-When-Then scenario
- [ ] Scenarios are testable and cover happy/error edge cases
- [ ] Depends On section lists specific host:port/secret references
- [ ] Integrates With section lists API contracts and service integrations
- [ ] Component Reference table has Auth, Database, Cache, Storage, Ports, License, Config, Chart, Health
- [ ] No bare URLs (use Markdown links with descriptive text)
- [ ] No "TODO" or "FIXME" comments (use change proposals in `/openspec/changes/`)
- [ ] Code examples are valid JSON/YAML/curl commands (no syntax errors)
- [ ] Secret references follow `secret.service.passwordKey` pattern
- [ ] No hard-coded credentials or example values that look real
- [ ] File naming follows `openspec/specs/<domain>/<category|service>/spec.md`
- [ ] Line length reasonable (80-120 characters, no hard breaks)
- [ ] Consistent indentation (2 spaces for nested lists, bullets for lists)
