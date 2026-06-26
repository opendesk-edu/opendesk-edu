<!--
SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
SPDX-License-Identifier: Apache-2.0
-->

# Federation (DFN-AAI / eduGAIN)

## Purpose

SAML federation support for German universities via the DFN-AAI identity
federation and eduGAIN, enabling users from federated institutions to
authenticate with their home institution credentials.

## Non-Goals

- Keycloak as SAML IdP for federation (use Shibboleth IdP)
- Non-DFN federation configurations

## Requirements

### Requirement: DFN-AAI Service Provider registration

The platform SHALL operate as a SAML SP within the DFN-AAI federation,
generating standard SAML metadata for federation registration.

#### Scenario: Federated user authenticates
- GIVEN a user from a federated university
- WHEN the user selects their home institution on the discovery service
- THEN the user is redirected to their university's Shibboleth IdP
- AND upon authentication, the user is redirected back to the platform
- AND SAML attributes are released to the platform

### Requirement: eduGAIN attribute support

The platform SHALL support the following standard eduGAIN attributes for
federated identity mapping:

#### Scenario: eduGAIN attribute mapping
- GIVEN a federated authentication event with SAML attributes
- THEN the following attributes SHALL be recognized and mapped:
  - `eduPersonAffiliation` to internal group memberships
  - `mail` to the user's email address
  - `displayName` to the user's display name
  - `persistentId` to a stable unique identifier

#### Scenario: Unrecognized attributes ignored
- GIVEN a federated authentication event with unrecognized attributes
- THEN unrecognized attributes SHALL be ignored
- AND the authentication SHALL NOT fail

### Requirement: External Shibboleth IdP support

The platform SHALL support connecting to an external Shibboleth IdP as an
additional identity provider in Keycloak, for universities that operate their
own IdP alongside the platform.

#### Scenario: External IdP login
- GIVEN Keycloak configured with an external Shibboleth IdP broker
- WHEN a user selects the external IdP on the login page
- THEN the user is redirected to the external Shibboleth IdP
- AND upon authentication, the external IdP sends a SAML assertion to Keycloak
- AND Keycloak maps the assertion to a local user session

## Service Registry

Federation affects: Keycloak (IdP broker), all SAML SP applications (ILIAS,
Moodle, BigBlueButton, BookStack, Zammad).
