"""Membership tier/hierarchy utilities."""

# Common tier hierarchies by provider
TIER_HIERARCHIES = {
    "revolut": {
        "standard": 1,
        "premium": 2,
        "metal": 3,
        "ultra": 4,
    },
    "amex": {
        "everyday": 1,
        "gold": 2,
        "platinum": 3,
        "centurion": 4,
    },
    "lloyds": {
        "club": 1,
        "platinum": 2,
        "premier": 3,
    },
    "hsbc": {
        "advance": 1,
        "premier": 2,
    },
    "barclays": {
        "blue": 1,
        "platinum": 2,
    },
    "o2": {
        "standard": 1,
        "priority": 2,
    },
    "netflix": {
        "basic": 1,
        "standard": 2,
        "premium": 3,
    },
    "spotify": {
        "free": 1,
        "premium": 2,
        "family": 2,  # Same tier as premium, different use case
    },
    "amazon": {
        "prime": 1,
    },
    "aa": {
        "membership": 1,
    },
    "rac": {
        "membership": 1,
    },
    "virgin": {
        "media": 1,
        "volt": 2,
    },
    "costco": {
        "membership": 1,
    },
}

# Default tier mapping for unknown providers
DEFAULT_TIER_MAP = {
    "free": 0,
    "basic": 1,
    "standard": 1,
    "starter": 1,
    "essential": 1,
    "club": 1,
    "plus": 2,
    "premium": 2,
    "gold": 2,
    "platinum": 3,
    "metal": 3,
    "ultra": 4,
    "elite": 4,
    "centurion": 4,
}


def get_plan_tier(provider_name: str, plan_name: str) -> int:
    """
    Get tier level for a membership plan.
    
    Args:
        provider_name: Provider name (e.g., "Revolut")
        plan_name: Plan name (e.g., "Premium")
        
    Returns:
        Tier level (1 = lowest, higher = better). Returns 1 if unknown.
    """
    if not provider_name or not plan_name:
        return 1
    
    provider_key = provider_name.lower().strip()
    plan_key = plan_name.lower().strip()
    
    # Check provider-specific hierarchy
    if provider_key in TIER_HIERARCHIES:
        return TIER_HIERARCHIES[provider_key].get(plan_key, 1)
    
    # Use default mapping
    return DEFAULT_TIER_MAP.get(plan_key, 1)


def is_upgrade(current_tier: int, suggested_tier: int) -> bool:
    """Check if suggested tier is an upgrade (higher tier)."""
    return suggested_tier > current_tier


def is_downgrade(current_tier: int, suggested_tier: int) -> bool:
    """Check if suggested tier is a downgrade (lower tier)."""
    return suggested_tier < current_tier


def get_tier_name(tier: int) -> str:
    """Get human-readable tier name."""
    tier_names = {
        0: "Free",
        1: "Basic/Standard",
        2: "Premium/Gold",
        3: "Platinum/Metal",
        4: "Ultra/Elite",
    }
    return tier_names.get(tier, "Unknown")

