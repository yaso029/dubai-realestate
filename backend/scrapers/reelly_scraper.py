"""
Off-plan scraper — Reelly API (api.reelly.io)
Authenticates via email/password then paginates /projectsExternalSearch.
1,898+ projects available; scrape as many pages as needed.
"""

import logging
import re
from datetime import datetime
from typing import Any

import httpx

logger = logging.getLogger(__name__)

API_BASE = "https://api.reelly.io/api:sk5LT7jx"
EMAIL    = "agentyassinammary@gmail.com"
PASSWORD = "Penta@2024$$"


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

def _login() -> str:
    r = httpx.post(
        f"{API_BASE}/auth/login0",
        json={"email": EMAIL, "password": PASSWORD},
        timeout=15,
    )
    r.raise_for_status()
    return r.json()["authToken"]


# ---------------------------------------------------------------------------
# Field helpers
# ---------------------------------------------------------------------------

def _parse_handover_year(completion_date: str | None, completion_time: int | None) -> int | None:
    if completion_date:
        m = re.search(r"(20\d{2})", str(completion_date))
        if m:
            return int(m.group(1))
    if completion_time and completion_time > 0:
        try:
            return datetime.utcfromtimestamp(completion_time / 1000).year
        except (OSError, OverflowError):
            pass
    return None


def _parse_min_price(starting_price: list | None, min_price: int | None) -> float | None:
    if min_price and min_price > 0:
        return float(min_price)
    if starting_price:
        for sp in starting_price:
            p = sp.get("Price_from_AED")
            if p and p > 0:
                return float(p)
    return None


def _parse_max_price(starting_price: list | None, max_price: int | None) -> float | None:
    if max_price and max_price > 0:
        return float(max_price)
    if starting_price:
        prices = [sp.get("Price_to_AED") or sp.get("Price_from_AED") for sp in starting_price]
        prices = [p for p in prices if p and p > 0]
        if prices:
            return float(max(prices))
    return None


# ---------------------------------------------------------------------------
# Main scraper (sync — called via asyncio.to_thread)
# ---------------------------------------------------------------------------

def _build_project_url(project_id: int) -> str:
    return f"https://find.reelly.io/projects/{project_id}"


def run_reelly_scraper(max_pages: int = 999) -> list[dict[str, Any]]:
    """
    Fetch all off-plan projects from the Reelly API.
    Paginates until the API reports no nextPage or max_pages is reached.
    Fetches each project's detail page to get the correct platform URL.
    """
    logger.info("Reelly scraper starting (max_pages=%d)", max_pages)

    try:
        token = _login()
        logger.info("Reelly login successful")
    except Exception as exc:
        logger.error("Reelly login failed: %s", exc)
        return []

    headers  = {"authToken": token}
    client   = httpx.Client(headers=headers, timeout=20)
    all_listings: list[dict[str, Any]] = []

    try:
        page = 1
        while page <= max_pages:
            logger.info("Fetching Reelly page %d", page)
            try:
                r = client.get(
                    f"{API_BASE}/projectsExternalSearch",
                    params={"search_field": "", "page": page},
                )
            except Exception as exc:
                logger.warning("Request failed on page %d: %s", page, exc)
                break

            if r.status_code != 200:
                logger.warning("Non-200 on page %d: %d", page, r.status_code)
                break

            data   = r.json()
            result = data.get("result_1", data)
            items  = result.get("items", []) if isinstance(result, dict) else []

            if not items:
                logger.info("No items on page %d — stopping", page)
                break

            for item in items:
                reelly_id = item.get("id")
                if not reelly_id:
                    continue

                website_link = _build_project_url(reelly_id)

                completion_date = item.get("Completion_date") or ""
                sale_status_val = item.get("sale_status") or ""

                listing: dict[str, Any] = {
                    "source":               "reelly",
                    "listing_id":           f"reelly_{reelly_id}",
                    "listing_url":          website_link,
                    "project_name":         item.get("Project_name"),
                    "developer_name":       item.get("Developers_name"),
                    "area":                 item.get("Area_name"),
                    "community":            item.get("Area_name"),
                    "emirate":              "Dubai",
                    "starting_price_aed":   _parse_min_price(
                        item.get("Starting_price"), item.get("min_price")
                    ),
                    "handover_year":        _parse_handover_year(
                        completion_date, item.get("Completion_time")
                    ),
                    "completion_date_text": completion_date,
                    "sale_status":          sale_status_val,
                    "scrape_timestamp":     datetime.utcnow().isoformat(),
                    "payment_plan_details": f"Max Commission: {item.get('max_commission', 0)}%",
                    "cover_image_url":      (item.get("cover") or {}).get("url"),
                    "max_commission":       item.get("max_commission"),
                }
                all_listings.append(listing)

            logger.info("Page %d: %d projects (running total: %d)", page, len(items), len(all_listings))

            if not result.get("nextPage"):
                logger.info("No more pages after page %d", page)
                break

            page += 1

    finally:
        client.close()

    logger.info("Reelly scraper done — %d projects total", len(all_listings))
    return all_listings


# ---------------------------------------------------------------------------
# DB upsert (unchanged signature — called by main.py)
# ---------------------------------------------------------------------------

def upsert_offplan_listings(listings: list[dict[str, Any]], db_session) -> tuple[int, int]:
    from datetime import date
    from backend.database.models import OffPlanListing

    new_count = updated_count = 0

    for data in listings:
        url = data.get("listing_url")
        if not url:
            continue

        existing = db_session.query(OffPlanListing).filter_by(listing_url=url).first()
        if existing:
            for field in [
                "project_name", "developer_name", "area", "community",
                "starting_price_aed", "handover_year", "payment_plan_details",
                "completion_date_text", "sale_status", "cover_image_url", "max_commission",
            ]:
                val = data.get(field)
                if val is not None:
                    setattr(existing, field, val)
            existing.scrape_timestamp = datetime.utcnow()
            updated_count += 1
        else:
            row = OffPlanListing(
                listing_url=url,
                source=data.get("source", "reelly"),
                project_name=data.get("project_name"),
                developer_name=data.get("developer_name"),
                handover_year=data.get("handover_year"),
                completion_percentage=data.get("completion_percentage"),
                starting_price_aed=data.get("starting_price_aed"),
                unit_types_available=data.get("unit_types_available"),
                payment_plan_details=data.get("payment_plan_details"),
                completion_date_text=data.get("completion_date_text"),
                sale_status=data.get("sale_status"),
                cover_image_url=data.get("cover_image_url"),
                max_commission=data.get("max_commission"),
                community=data.get("community"),
                area=data.get("area"),
                emirate=data.get("emirate", "Dubai"),
                scrape_timestamp=datetime.utcnow(),
            )
            db_session.add(row)
            new_count += 1

    db_session.commit()
    logger.info("Upsert done — %d new, %d updated", new_count, updated_count)
    return new_count, updated_count
