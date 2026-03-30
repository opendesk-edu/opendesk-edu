#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Keycloak client wrapper for role/group retrieval in the Semester Provisioning flow.

EN: Lightweight, testable interface to fetch roles and campus groups from Keycloak.
DE: Leichte, testbare Schnittstelle zum Abrufen von Rollen und Campus-Gruppen aus Keycloak.
"""

from typing import List, Optional
from pydantic import BaseModel


class KeycloakConfig(BaseModel):
    base_url: str
    realm: str
    token: str


class KeycloakRole(BaseModel):
    id: Optional[str] = None
    name: str


class KeycloakClient:
    """Wrapper around Keycloak REST API interactions.

    EN: Minimal client used by the synchronizer. In production, this would call
    the Keycloak REST endpoints. For tests, this class should be mocked or
    extended to provide deterministic data.
    DE: Minimaler Client für die Synchronisierung. In der Produktion würden hier
    die Keycloak REST-Endpunkte aufgerufen. Für Tests sollte diese Klasse gemockt
    oder erweitert werden, um deterministische Daten bereitzustellen.
    """

    def __init__(self, config: KeycloakConfig):
        self.config = config

    def get_roles(
        self,
    ) -> List[KeycloakRole]:  # pragma: no cover - to be mocked in tests
        raise NotImplementedError("Must be implemented by subclass or test mock")

    def get_groups(self) -> List[str]:  # pragma: no cover - to be mocked in tests
        raise NotImplementedError("Must be implemented by subclass or test mock")
