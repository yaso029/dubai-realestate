"""
Client matching and ranking engine.

Takes a ClientRequirements dict and scores all active listings against it,
returning a ranked list of matches with per-criterion breakdown.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy.orm import Session

from backend.database.models import SecondaryListing, OffPlanListing


@dataclass
class ClientRequirements:
    """
    All fields are optional — only supplied fields contribute to scoring.
    Weights default to 1.0 but callers can tune them.
    """
    # Budget
    budget_min: float | None = None
    budget_max: float | None = None
    budget_weight: float = 2.0          # high weight — budget is critical

    # Size
    size_min_sqft: float | None = None
    size_max_sqft: float | None = None
    size_weight: float = 1.0

    # Bedrooms (e.g. "2", "Studio", "3+")
    bedrooms: str | None = None
    bedrooms_weight: float = 1.5

    # Property type (e.g. "apartment", "villa", "townhouse")
    property_type: str | None = None
    property_type_weight: float = 1.0

    # Location preferences (list of area/community strings, matched loosely)
    preferred_areas: list[str] = field(default_factory=list)
    area_weight: float = 1.5

    # Off-plan vs ready
    market_type: str | None = None      # "secondary", "offplan", or None (both)

    # Off-plan specific
    max_handover_year: int | None = None
    handover_weight: float = 1.0

    # Furnishing
    furnishing: str | None = None       # "furnished", "unfurnished", "partly furnished"
    furnishing_weight: float = 0.5

    # Days on market (prefer fresher listings)
    prefer_fresh: bool = False
    fresh_weight: float = 0.5


@dataclass
class MatchResult:
    listing_id: str
    source: str
    listing_type: str               # "secondary" | "offplan"
    title: str
    price_aed: float | None
    area: str | None
    community: str | None
    bedrooms: str | None
    size_sqft: float | None
    listing_url: str
    total_score: float
    max_score: float
    score_pct: float                # 0-100
    breakdown: dict[str, float]     # criterion → score contribution
    raw: dict[str, Any]             # full listing fields


def _beds_match(client_beds: str, listing_beds: str | None) -> bool:
    if not listing_beds:
        return False
    cb = client_beds.strip().lower()
    lb = str(listing_beds).strip().lower()
    if cb == lb:
        return True
    # "3+" means 3 or more
    m = re.match(r"(\d+)\+", cb)
    if m:
        threshold = int(m.group(1))
        lm = re.search(r"(\d+)", lb)
        return bool(lm and int(lm.group(1)) >= threshold)
    # numeric vs numeric
    cm = re.search(r"(\d+)", cb)
    lm = re.search(r"(\d+)", lb)
    if cm and lm:
        return int(cm.group(1)) == int(lm.group(1))
    return False


def _area_match(preferred: list[str], listing_area: str | None, listing_community: str | None) -> bool:
    if not preferred:
        return False
    combined = f"{listing_area or ''} {listing_community or ''}".lower()
    return any(p.lower() in combined for p in preferred)


def score_secondary(listing: SecondaryListing, req: ClientRequirements) -> MatchResult | None:
    breakdown: dict[str, float] = {}
    max_score = 0.0

    # Budget
    if req.budget_min is not None or req.budget_max is not None:
        max_score += req.budget_weight
        if listing.price_aed is not None:
            ok = True
            if req.budget_min and listing.price_aed < req.budget_min:
                ok = False
            if req.budget_max and listing.price_aed > req.budget_max:
                ok = False
            breakdown["budget"] = req.budget_weight if ok else 0.0
        else:
            breakdown["budget"] = 0.0

    # Bedrooms
    if req.bedrooms:
        max_score += req.bedrooms_weight
        breakdown["bedrooms"] = req.bedrooms_weight if _beds_match(req.bedrooms, listing.bedrooms) else 0.0

    # Size
    if req.size_min_sqft or req.size_max_sqft:
        max_score += req.size_weight
        if listing.size_sqft is not None:
            ok = True
            if req.size_min_sqft and listing.size_sqft < req.size_min_sqft:
                ok = False
            if req.size_max_sqft and listing.size_sqft > req.size_max_sqft:
                ok = False
            breakdown["size"] = req.size_weight if ok else 0.0
        else:
            breakdown["size"] = 0.0

    # Property type
    if req.property_type:
        max_score += req.property_type_weight
        match = (listing.property_type or "").lower().strip() == req.property_type.lower().strip()
        breakdown["property_type"] = req.property_type_weight if match else 0.0

    # Area
    if req.preferred_areas:
        max_score += req.area_weight
        breakdown["area"] = req.area_weight if _area_match(req.preferred_areas, listing.area, listing.community) else 0.0

    # Furnishing
    if req.furnishing:
        max_score += req.furnishing_weight
        match = req.furnishing.lower() in (listing.furnishing_status or "").lower()
        breakdown["furnishing"] = req.furnishing_weight if match else 0.0

    # Freshness
    if req.prefer_fresh:
        max_score += req.fresh_weight
        dom = listing.days_on_market
        if dom is not None:
            breakdown["freshness"] = req.fresh_weight * max(0.0, 1 - dom / 30)
        else:
            breakdown["freshness"] = 0.0

    if max_score == 0:
        max_score = 1.0

    total = sum(breakdown.values())
    return MatchResult(
        listing_id=listing.listing_id,
        source=listing.source,
        listing_type="secondary",
        title=listing.title or "",
        price_aed=listing.price_aed,
        area=listing.area,
        community=listing.community,
        bedrooms=listing.bedrooms,
        size_sqft=listing.size_sqft,
        listing_url=listing.listing_url,
        total_score=total,
        max_score=max_score,
        score_pct=round(total / max_score * 100, 1),
        breakdown=breakdown,
        raw={
            "bathrooms": listing.bathrooms,
            "property_type": listing.property_type,
            "furnishing_status": listing.furnishing_status,
            "floor_number": listing.floor_number,
            "building_name": listing.building_name,
            "agent_name": listing.agent_name,
            "agency_name": listing.agency_name,
            "days_on_market": listing.days_on_market,
        },
    )


def score_offplan(listing: OffPlanListing, req: ClientRequirements) -> MatchResult | None:
    breakdown: dict[str, float] = {}
    max_score = 0.0

    # Budget (starting_price_aed)
    if req.budget_min is not None or req.budget_max is not None:
        max_score += req.budget_weight
        if listing.starting_price_aed is not None:
            ok = True
            if req.budget_min and listing.starting_price_aed < req.budget_min:
                ok = False
            if req.budget_max and listing.starting_price_aed > req.budget_max:
                ok = False
            breakdown["budget"] = req.budget_weight if ok else 0.0
        else:
            breakdown["budget"] = 0.0

    # Handover year
    if req.max_handover_year:
        max_score += req.handover_weight
        if listing.handover_year is not None:
            breakdown["handover"] = req.handover_weight if listing.handover_year <= req.max_handover_year else 0.0
        else:
            breakdown["handover"] = 0.0

    # Area
    if req.preferred_areas:
        max_score += req.area_weight
        breakdown["area"] = req.area_weight if _area_match(req.preferred_areas, listing.area, listing.community) else 0.0

    if max_score == 0:
        max_score = 1.0

    total = sum(breakdown.values())
    return MatchResult(
        listing_id=f"op_{listing.id}",
        source="bayut_offplan",
        listing_type="offplan",
        title=listing.project_name or "",
        price_aed=listing.starting_price_aed,
        area=listing.area,
        community=listing.community,
        bedrooms=None,
        size_sqft=None,
        listing_url=listing.listing_url,
        total_score=total,
        max_score=max_score,
        score_pct=round(total / max_score * 100, 1),
        breakdown=breakdown,
        raw={
            "developer_name": listing.developer_name,
            "handover_year": listing.handover_year,
            "payment_plan_details": listing.payment_plan_details,
            "unit_types_available": listing.unit_types_available,
            "completion_percentage": listing.completion_percentage,
        },
    )


def match_listings(
    req: ClientRequirements,
    db: Session,
    top_n: int = 10,
    min_score_pct: float = 0.0,
) -> list[MatchResult]:
    """
    Score all active listings against the requirements and return top_n ranked results.
    Filters by market_type if specified ('secondary' or 'offplan').
    """
    results: list[MatchResult] = []

    include_secondary = req.market_type in (None, "secondary")
    include_offplan = req.market_type in (None, "offplan")

    if include_secondary:
        for listing in db.query(SecondaryListing).filter(SecondaryListing.is_active == True).all():
            r = score_secondary(listing, req)
            if r and r.score_pct >= min_score_pct:
                results.append(r)

    if include_offplan:
        for listing in db.query(OffPlanListing).filter(OffPlanListing.is_active == True).all():
            r = score_offplan(listing, req)
            if r and r.score_pct >= min_score_pct:
                results.append(r)

    results.sort(key=lambda x: x.score_pct, reverse=True)
    return results[:top_n]
