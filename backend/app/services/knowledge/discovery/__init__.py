"""Knowledge discovery services."""

from app.services.knowledge.discovery.domains import (
    DomainService,
    get_domain_id,
    merge_domains,
)

__all__ = ["DomainService", "get_domain_id", "merge_domains"]
