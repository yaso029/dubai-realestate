"""
Bayut.com scraper — secondary/ready market listings for Dubai.

Uses curl_cffi to impersonate Chrome's TLS fingerprint, bypassing
PerimeterX bot detection without requiring a real browser.
"""

import hashlib
import logging
import re
from datetime import date, datetime
from typing import Any
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from curl_cffi import requests as cffi_requests

logger = logging.getLogger(__name__)

BASE_URL = "https://www.bayut.com"
SEARCH_URL = "https://www.bayut.com/for-sale/property/dubai/"
MAX_PAGES = 5

HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "max-age=0",
    "Upgrade-Insecure-Requests": "1",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _clean_price(raw: str) -> float | None:
    digits = re.sub(r"[^\d.]", "", raw)
    try:
        return float(digits) if digits else None
    except ValueError:
        return None


def _clean_float(raw: str) -> float | None:
    digits = re.sub(r"[^\d.]", "", raw)
    try:
        return float(digits) if digits else None
    except ValueError:
        return None


def _make_listing_id(url: str) -> str:
    m = re.search(r"details-(\d+)", url)
    if m:
        return f"bayut_{m.group(1)}"
    return "bayut_" + hashlib.md5(url.encode()).hexdigest()[:12]


def _parse_days_on_market(raw: str) -> int | None:
    if not raw:
        return None
    raw = raw.lower().strip()
    if "today" in raw or "just" in raw:
        return 0
    if "yesterday" in raw:
        return 1
    m = re.search(r"(\d+)\s*(day|week|month|year)", raw)
    if not m:
        return None
    n, unit = int(m.group(1)), m.group(2)
    return n * {"day": 1, "week": 7, "month": 30, "year": 365}[unit]


# ---------------------------------------------------------------------------
# Card parser — uses the confirmed aria-label selectors
# ---------------------------------------------------------------------------

def _parse_article(art: BeautifulSoup) -> dict[str, Any]:
    listing: dict[str, Any] = {
        "source": "bayut",
        "scrape_timestamp": datetime.utcnow().isoformat(),
        "emirate": "Dubai",
    }

    # URL + ID
    a = art.find("a", href=re.compile(r"/property/details-\d+"))
    if a:
        href = a["href"]
        listing["listing_url"] = urljoin(BASE_URL, href)
        listing["listing_id"] = _make_listing_id(href)

    # Title (aria-label="Title" on <h2>)
    title_el = art.find(attrs={"aria-label": "Title"})
    if title_el:
        listing["title"] = title_el.get_text(strip=True)
    elif a and a.get("title"):
        listing["title"] = a["title"]

    # Price (aria-label="Price")
    price_el = art.find(attrs={"aria-label": "Price"})
    if price_el:
        listing["price_aed"] = _clean_price(price_el.get_text())

    # Beds / Baths / Area — confirmed aria-labels
    beds_el = art.find(attrs={"aria-label": "Beds"})
    if beds_el:
        listing["bedrooms"] = beds_el.get_text(strip=True)

    baths_el = art.find(attrs={"aria-label": "Baths"})
    if baths_el:
        listing["bathrooms"] = baths_el.get_text(strip=True)

    area_el = art.find(attrs={"aria-label": "Area"})
    if area_el:
        listing["size_sqft"] = _clean_float(area_el.get_text())

    # Property type (aria-label="Type")
    type_el = art.find(attrs={"aria-label": "Type"})
    if type_el:
        listing["property_type"] = type_el.get_text(strip=True).lower()

    # Location (aria-label="Location") — "Building, Community, Area, Dubai"
    loc_el = art.find(attrs={"aria-label": "Location"})
    if loc_el:
        parts = [p.strip() for p in loc_el.get_text(separator=",").split(",") if p.strip()]
        listing["building_name"] = parts[0] if parts else None
        listing["community"] = parts[1] if len(parts) > 1 else None
        listing["area"] = parts[2] if len(parts) > 2 else None

    return listing


# ---------------------------------------------------------------------------
# Detail-page enrichment (agent, agency, floor, furnishing, listing date)
# ---------------------------------------------------------------------------

def _enrich_detail(session: cffi_requests.Session, listing: dict[str, Any]) -> dict[str, Any]:
    url = listing.get("listing_url")
    if not url:
        return listing
    try:
        r = session.get(url, headers=HEADERS, impersonate="chrome124", timeout=30)
        soup = BeautifulSoup(r.text, "lxml")

        # Agent name
        agent_el = soup.find(attrs={"aria-label": re.compile(r"^Agent Name$", re.I)})
        if not agent_el:
            agent_el = soup.find(attrs={"aria-label": re.compile(r"agent", re.I)})
        if agent_el:
            listing.setdefault("agent_name", agent_el.get_text(strip=True))

        # Agency name
        agency_el = soup.find(attrs={"aria-label": re.compile(r"agency|company", re.I)})
        if agency_el:
            listing.setdefault("agency_name", agency_el.get_text(strip=True))

        # Furnishing
        furnish_el = soup.find(attrs={"aria-label": re.compile(r"furnish", re.I)})
        if furnish_el:
            listing.setdefault("furnishing_status", furnish_el.get_text(strip=True).lower())
        else:
            for el in soup.find_all(string=re.compile(r"furnished|unfurnished|partly", re.I)):
                listing.setdefault("furnishing_status", str(el).strip().lower())
                break

        # Floor
        floor_el = soup.find(attrs={"aria-label": re.compile(r"floor", re.I)})
        if floor_el:
            listing.setdefault("floor_number", floor_el.get_text(strip=True))

        # Listing date
        date_el = soup.find(attrs={"aria-label": re.compile(r"date added|listed", re.I)})
        if date_el:
            raw = date_el.get_text(strip=True)
            listing.setdefault("days_on_market", _parse_days_on_market(raw))

    except Exception as exc:
        logger.warning("Detail fetch failed for %s: %s", url, exc)
    return listing


# ---------------------------------------------------------------------------
# Main scraper entry point (sync — called via asyncio.to_thread)
# ---------------------------------------------------------------------------

def run_bayut_scraper(
    search_url: str = SEARCH_URL,
    max_pages: int = MAX_PAGES,
    fetch_details: bool = False,
) -> list[dict[str, Any]]:
    """
    Returns a list of property dicts ready for DB upsert.
    Runs synchronously — call via asyncio.to_thread() from FastAPI.
    """
    all_listings: list[dict[str, Any]] = []
    session = cffi_requests.Session()

    for page_num in range(1, max_pages + 1):
        page_url = search_url if page_num == 1 else f"{search_url}?page={page_num}"
        logger.info("Scraping Bayut page %d: %s", page_num, page_url)

        try:
            r = session.get(page_url, headers=HEADERS, impersonate="chrome124", timeout=30)
        except Exception as exc:
            logger.warning("Request failed on page %d: %s", page_num, exc)
            break

        soup = BeautifulSoup(r.text, "lxml")
        articles = soup.find_all("article")
        logger.info("Found %d listing cards on page %d", len(articles), page_num)

        if not articles:
            logger.info("No cards — stopping pagination.")
            break

        for art in articles:
            card = _parse_article(art)
            if not card.get("listing_id"):
                continue
            if fetch_details:
                card = _enrich_detail(session, card)
            all_listings.append(card)

    session.close()
    logger.info("Bayut scraper done. Total: %d listings", len(all_listings))
    return all_listings


# ---------------------------------------------------------------------------
# DB upsert
# ---------------------------------------------------------------------------

def upsert_listings(listings: list[dict[str, Any]], db_session) -> tuple[int, int]:
    from backend.database.models import SecondaryListing

    new_count = updated_count = 0
    for data in listings:
        lid = data.get("listing_id")
        if not lid:
            continue
        existing = db_session.query(SecondaryListing).filter_by(listing_id=lid).first()
        if existing:
            for field, value in data.items():
                if hasattr(existing, field) and value is not None:
                    setattr(existing, field, value)
            existing.scrape_timestamp = datetime.utcnow()
            updated_count += 1
        else:
            row = SecondaryListing(
                listing_id=lid,
                source="bayut",
                listing_url=data.get("listing_url", ""),
                title=data.get("title"),
                price_aed=data.get("price_aed"),
                size_sqft=data.get("size_sqft"),
                bedrooms=data.get("bedrooms"),
                bathrooms=data.get("bathrooms"),
                property_type=data.get("property_type"),
                furnishing_status=data.get("furnishing_status"),
                floor_number=data.get("floor_number"),
                building_name=data.get("building_name"),
                community=data.get("community"),
                area=data.get("area"),
                emirate="Dubai",
                agent_name=data.get("agent_name"),
                agency_name=data.get("agency_name"),
                days_on_market=data.get("days_on_market"),
                scrape_timestamp=datetime.utcnow(),
            )
            if data.get("listing_date"):
                try:
                    row.listing_date = date.fromisoformat(data["listing_date"])
                except ValueError:
                    pass
            db_session.add(row)
            new_count += 1

    db_session.commit()
    return new_count, updated_count
