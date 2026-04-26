"""
PropertyFinder.ae scraper — secondary/ready market listings for Dubai.
Uses Playwright sync API so it can be called via asyncio.to_thread().
"""

import asyncio
import hashlib
import logging
import re
import sys
from datetime import date, datetime
from typing import Any
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, Page, TimeoutError as PWTimeout


def _ensure_proactor_loop():
    if sys.platform == "win32":
        asyncio.set_event_loop(asyncio.ProactorEventLoop())

logger = logging.getLogger(__name__)

BASE_URL = "https://www.propertyfinder.ae"
SEARCH_URL = "https://www.propertyfinder.ae/en/search?c=1&t=2&l=2"
MAX_PAGES = 5
PAGE_DELAY_MS = 2500


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
    match = re.search(r"/(\d{5,})(?:[/?]|$)", url)
    if match:
        return f"pf_{match.group(1)}"
    return "pf_" + hashlib.md5(url.encode()).hexdigest()[:12]


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
# Card-level parser
# ---------------------------------------------------------------------------

def _parse_listing_card(card_soup: BeautifulSoup) -> dict[str, Any]:
    listing: dict[str, Any] = {
        "source": "propertyfinder",
        "scrape_timestamp": datetime.utcnow().isoformat(),
        "emirate": "Dubai",
    }

    a_tag = card_soup.find("a", href=True)
    if a_tag:
        href = a_tag["href"]
        listing["listing_url"] = href if href.startswith("http") else urljoin(BASE_URL, href)
        listing["listing_id"] = _make_listing_id(listing["listing_url"])

    for selector in [
        {"attrs": {"data-testid": re.compile(r"card-title|listing-title", re.I)}},
        {"name": ["h2", "h3"]},
        {"class_": re.compile(r"card-title|listing-title|property-name", re.I)},
    ]:
        el = card_soup.find(**selector)
        if el:
            listing["title"] = el.get_text(strip=True)
            break

    price_el = (
        card_soup.find(attrs={"data-testid": re.compile(r"price", re.I)})
        or card_soup.find(class_=re.compile(r"price", re.I))
    )
    if price_el:
        listing["price_aed"] = _clean_price(price_el.get_text())

    features_row = card_soup.find(class_=re.compile(r"feature|attribute|spec", re.I))
    if features_row:
        for el in features_row.find_all(class_=re.compile(r"feature|attribute|spec", re.I)):
            text = el.get_text(strip=True).lower()
            if "bed" in text or "studio" in text:
                listing["bedrooms"] = re.sub(r"[^\dA-Za-z]", "", text).replace("beds", "").replace("bed", "").strip() or text
            elif "bath" in text:
                listing["bathrooms"] = re.sub(r"[^\d]", "", text) or None
            elif "sqft" in text or "sq ft" in text or "m²" in text:
                listing["size_sqft"] = _clean_float(text)

    loc_el = (
        card_soup.find(attrs={"data-testid": re.compile(r"location|address", re.I)})
        or card_soup.find(class_=re.compile(r"location|address|subtitle", re.I))
    )
    if loc_el:
        parts = [p.strip() for p in loc_el.get_text(separator=",").split(",") if p.strip()]
        listing["area"] = parts[0] if parts else None
        listing["community"] = parts[1] if len(parts) > 1 else None
        listing["building_name"] = parts[2] if len(parts) > 2 else None

    age_el = card_soup.find(string=re.compile(r"day|week|month|year|today|yesterday", re.I))
    if age_el:
        listing["days_on_market"] = _parse_days_on_market(str(age_el).strip())

    return listing


# ---------------------------------------------------------------------------
# Detail-page enrichment
# ---------------------------------------------------------------------------

def _parse_listing_detail(html: str, partial: dict[str, Any]) -> dict[str, Any]:
    soup = BeautifulSoup(html, "lxml")
    listing = dict(partial)

    type_el = soup.find(attrs={"data-testid": re.compile(r"property.?type", re.I)})
    if not type_el:
        type_el = soup.find(string=re.compile(r"apartment|villa|townhouse|penthouse|studio", re.I))
    if type_el:
        raw = type_el.get_text(strip=True) if hasattr(type_el, "get_text") else str(type_el)
        listing.setdefault("property_type", raw.lower())

    furnish_el = soup.find(string=re.compile(r"furnished|unfurnished|partly furnished", re.I))
    if furnish_el:
        listing.setdefault("furnishing_status", str(furnish_el).strip().lower())

    floor_section = soup.find(string=re.compile(r"floor", re.I))
    if floor_section and floor_section.parent:
        raw = floor_section.parent.get_text(strip=True)
        m = re.search(r"(\d+|ground|basement|low|mid|high)", raw, re.I)
        if m:
            listing.setdefault("floor_number", m.group(1))

    agent_el = (
        soup.find(attrs={"data-testid": re.compile(r"agent.?name|broker", re.I)})
        or soup.find(class_=re.compile(r"agent.?name|broker.?name", re.I))
    )
    if agent_el:
        listing.setdefault("agent_name", agent_el.get_text(strip=True))

    agency_el = (
        soup.find(attrs={"data-testid": re.compile(r"agency|company", re.I)})
        or soup.find(class_=re.compile(r"agency.?name|company.?name", re.I))
    )
    if agency_el:
        listing.setdefault("agency_name", agency_el.get_text(strip=True))

    return listing


# ---------------------------------------------------------------------------
# Sync scraper core
# ---------------------------------------------------------------------------

def _scrape_page_sync(page: Page, url: str) -> list[dict[str, Any]]:
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=30_000)
        page.wait_for_timeout(PAGE_DELAY_MS)
    except PWTimeout:
        logger.warning("Timeout loading %s", url)
        return []

    html = page.content()
    soup = BeautifulSoup(html, "lxml")

    cards = soup.find_all("article")
    if not cards:
        cards = soup.find_all(attrs={"data-testid": re.compile(r"property.?card|listing.?card", re.I)})
    if not cards:
        cards = [
            div for div in soup.find_all("div", recursive=True)
            if div.find(class_=re.compile(r"price", re.I))
            and div.find("a", href=re.compile(r"/property-for-|/en/", re.I))
        ]

    logger.info("Found %d cards on %s", len(cards), url)
    return [_parse_listing_card(c) for c in cards]


def _enrich_with_detail_sync(page: Page, listing: dict[str, Any]) -> dict[str, Any]:
    url = listing.get("listing_url")
    if not url:
        return listing
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=30_000)
        page.wait_for_timeout(1200)
        return _parse_listing_detail(page.content(), listing)
    except PWTimeout:
        logger.warning("Timeout on detail %s", url)
        return listing


def run_propertyfinder_scraper(
    search_url: str = SEARCH_URL,
    max_pages: int = MAX_PAGES,
    fetch_details: bool = True,
) -> list[dict[str, Any]]:
    """Sync entry point — call via asyncio.to_thread() from FastAPI."""
    _ensure_proactor_loop()
    all_listings: list[dict[str, Any]] = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
        )
        page = context.new_page()

        for page_num in range(1, max_pages + 1):
            page_url = search_url if page_num == 1 else f"{search_url}&page={page_num}"
            logger.info("Scraping PF page %d: %s", page_num, page_url)

            cards = _scrape_page_sync(page, page_url)
            if not cards:
                logger.info("No cards on page %d — stopping.", page_num)
                break

            if fetch_details:
                for card in cards:
                    all_listings.append(_enrich_with_detail_sync(page, card))
            else:
                all_listings.extend(cards)

        browser.close()

    logger.info("PropertyFinder scraper done. Total: %d", len(all_listings))
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
                source=data.get("source", "propertyfinder"),
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
                emirate=data.get("emirate", "Dubai"),
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
