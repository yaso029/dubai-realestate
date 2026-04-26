import asyncio
import logging
import sys
import time
from contextlib import asynccontextmanager
from datetime import datetime

from dotenv import load_dotenv
load_dotenv()

# Must be set before uvicorn starts its own loop so that every thread
# Playwright spawns also gets a ProactorEventLoop (Windows requirement).
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import httpx
from fastapi import FastAPI, Depends, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database.db import init_db, get_db
from backend.database.models import ScrapeLog
from backend.api.intake_routes import router as intake_router
from backend.api.intake_form_routes import router as intake_form_router
from backend.scrapers.bayut_scraper import run_bayut_scraper, upsert_listings as bayut_upsert
from backend.scrapers.propertyfinder_scraper import run_propertyfinder_scraper, upsert_listings as pf_upsert
from backend.scrapers.reelly_scraper import run_reelly_scraper, upsert_offplan_listings
from backend.scheduler.jobs import start_scheduler, stop_scheduler
from backend.matching.engine import ClientRequirements, match_listings, MatchResult
from backend.reports.generator import generate_match_report

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("Database initialised.")
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="Dubai Real Estate Intelligence API",
    version="0.2.0",
    lifespan=lifespan,
)

app.include_router(intake_router)
app.include_router(intake_form_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Background job helpers
# ---------------------------------------------------------------------------

async def _run_scrape_job(source: str, log_id: int, db: Session, max_pages: int, fetch_details: bool):
    log = db.query(ScrapeLog).get(log_id)
    try:
        if source == "bayut":
            listings = await asyncio.to_thread(run_bayut_scraper, max_pages=max_pages, fetch_details=fetch_details)
            new_c, upd_c = bayut_upsert(listings, db)
        elif source == "propertyfinder":
            listings = await asyncio.to_thread(run_propertyfinder_scraper, max_pages=max_pages, fetch_details=fetch_details)
            new_c, upd_c = pf_upsert(listings, db)
        elif source == "reelly":
            listings = await asyncio.to_thread(run_reelly_scraper, max_pages=max_pages)
            new_c, upd_c = upsert_offplan_listings(listings, db)
        else:
            raise ValueError(f"Unknown source: {source}")

        log.finished_at = datetime.utcnow()
        log.listings_found = len(listings)
        log.listings_new = new_c
        log.listings_updated = upd_c
        log.status = "success"
        db.commit()
        logger.info("%s scrape done — %d new, %d updated", source, new_c, upd_c)
    except Exception as exc:
        logger.exception("%s scrape failed", source)
        log.finished_at = datetime.utcnow()
        log.status = "error"
        log.error_message = str(exc)
        db.commit()


def _start_scrape(source: str, background_tasks: BackgroundTasks, db: Session,
                  max_pages: int, fetch_details: bool) -> dict:
    log = ScrapeLog(source=source, status="running")
    db.add(log)
    db.commit()
    db.refresh(log)
    background_tasks.add_task(_run_scrape_job, source, log.id, db, max_pages, fetch_details)
    return {"message": f"{source} scrape started", "log_id": log.id,
            "max_pages": max_pages, "fetch_details": fetch_details}


# ---------------------------------------------------------------------------
# Routes — health
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


# ---------------------------------------------------------------------------
# Routes — manual scrape triggers
# ---------------------------------------------------------------------------

@app.post("/scrape/bayut")
async def scrape_bayut(
    background_tasks: BackgroundTasks,
    max_pages: int = 2,
    fetch_details: bool = False,
    db: Session = Depends(get_db),
):
    """Trigger a Bayut scrape. Runs in background; check /scrape/logs for status."""
    return _start_scrape("bayut", background_tasks, db, max_pages, fetch_details)


@app.post("/scrape/propertyfinder")
async def scrape_propertyfinder(
    background_tasks: BackgroundTasks,
    max_pages: int = 2,
    fetch_details: bool = False,
    db: Session = Depends(get_db),
):
    """Trigger a PropertyFinder scrape."""
    return _start_scrape("propertyfinder", background_tasks, db, max_pages, fetch_details)


@app.post("/scrape/reelly")
async def scrape_reelly(
    background_tasks: BackgroundTasks,
    max_pages: int = 999,
    db: Session = Depends(get_db),
):
    """Trigger a full Reelly off-plan scrape — paginates until no more pages."""
    return _start_scrape("reelly", background_tasks, db, max_pages, fetch_details=False)


@app.post("/scrape/all")
async def scrape_all(
    background_tasks: BackgroundTasks,
    max_pages: int = 2,
    fetch_details: bool = False,
    db: Session = Depends(get_db),
):
    """Trigger all three scrapers sequentially in the background."""
    results = []
    for source in ["bayut", "propertyfinder", "reelly"]:
        results.append(_start_scrape(source, background_tasks, db, max_pages, fetch_details))
    return {"started": results}


# ---------------------------------------------------------------------------
# Routes — logs
# ---------------------------------------------------------------------------

@app.get("/scrape/logs")
def scrape_logs(limit: int = 20, source: str | None = None, db: Session = Depends(get_db)):
    query = db.query(ScrapeLog).order_by(ScrapeLog.started_at.desc())
    if source:
        query = query.filter(ScrapeLog.source == source)
    logs = query.limit(limit).all()
    return [
        {
            "id": log.id,
            "source": log.source,
            "status": log.status,
            "started_at": log.started_at,
            "finished_at": log.finished_at,
            "listings_found": log.listings_found,
            "listings_new": log.listings_new,
            "listings_updated": log.listings_updated,
            "error_message": log.error_message,
        }
        for log in logs
    ]


# ---------------------------------------------------------------------------
# Routes — listings
# ---------------------------------------------------------------------------

@app.get("/listings/secondary")
def list_secondary(
    limit: int = 50,
    offset: int = 0,
    source: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    bedrooms: str | None = None,
    area: str | None = None,
    property_type: str | None = None,
    db: Session = Depends(get_db),
):
    """Secondary market listings (Bayut + PropertyFinder) with filters."""
    from backend.database.models import SecondaryListing

    q = db.query(SecondaryListing).filter(SecondaryListing.is_active == True)
    if source:
        q = q.filter(SecondaryListing.source == source)
    if min_price is not None:
        q = q.filter(SecondaryListing.price_aed >= min_price)
    if max_price is not None:
        q = q.filter(SecondaryListing.price_aed <= max_price)
    if bedrooms:
        q = q.filter(SecondaryListing.bedrooms == bedrooms)
    if area:
        q = q.filter(SecondaryListing.area.ilike(f"%{area}%"))
    if property_type:
        q = q.filter(SecondaryListing.property_type.ilike(f"%{property_type}%"))

    total = q.count()
    rows = q.order_by(SecondaryListing.scrape_timestamp.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "results": [
            {
                "id": r.id,
                "listing_id": r.listing_id,
                "source": r.source,
                "title": r.title,
                "price_aed": r.price_aed,
                "size_sqft": r.size_sqft,
                "bedrooms": r.bedrooms,
                "bathrooms": r.bathrooms,
                "property_type": r.property_type,
                "furnishing_status": r.furnishing_status,
                "floor_number": r.floor_number,
                "building_name": r.building_name,
                "community": r.community,
                "area": r.area,
                "emirate": r.emirate,
                "agent_name": r.agent_name,
                "agency_name": r.agency_name,
                "days_on_market": r.days_on_market,
                "listing_url": r.listing_url,
                "scrape_timestamp": r.scrape_timestamp,
            }
            for r in rows
        ],
    }


@app.get("/listings/offplan/options")
def offplan_options(db: Session = Depends(get_db)):
    """Return distinct developer names and areas (case-insensitive dedup) for filter dropdowns."""
    from backend.database.models import OffPlanListing
    from sqlalchemy import func

    raw_devs = (
        db.query(OffPlanListing.developer_name)
        .filter(OffPlanListing.developer_name.isnot(None), OffPlanListing.developer_name != "")
        .distinct()
        .all()
    )
    raw_areas = (
        db.query(OffPlanListing.area)
        .filter(OffPlanListing.area.isnot(None), OffPlanListing.area != "")
        .distinct()
        .all()
    )

    def dedup_ci(values):
        seen = {}
        for (v,) in values:
            key = v.strip().lower()
            if key not in seen:
                seen[key] = v.strip()
        return sorted(seen.values(), key=lambda x: x.lower())

    import re as _re

    def sort_handover(v):
        m = _re.match(r"Q(\d)\s+(\d{4})", v)
        return (int(m.group(2)), int(m.group(1))) if m else (9999, 9)

    raw_handovers = (
        db.query(OffPlanListing.completion_date_text)
        .filter(OffPlanListing.completion_date_text.isnot(None), OffPlanListing.completion_date_text != "")
        .distinct()
        .all()
    )
    handovers = sorted({r[0].strip() for r in raw_handovers if r[0]}, key=sort_handover)

    raw_statuses = (
        db.query(OffPlanListing.sale_status)
        .filter(OffPlanListing.sale_status.isnot(None), OffPlanListing.sale_status != "")
        .distinct()
        .all()
    )
    statuses = sorted({r[0].strip() for r in raw_statuses if r[0]})

    return {
        "developers": dedup_ci(raw_devs),
        "areas": dedup_ci(raw_areas),
        "handovers": handovers,
        "statuses": statuses,
    }


@app.get("/listings/offplan")
def list_offplan(
    limit: int = 50,
    offset: int = 0,
    min_price: float | None = None,
    max_price: float | None = None,
    handover: str | None = None,
    area: str | None = None,
    developer: str | None = None,
    sale_status: str | None = None,
    db: Session = Depends(get_db),
):
    """Off-plan listings (Reelly) with filters."""
    from backend.database.models import OffPlanListing

    q = db.query(OffPlanListing).filter(OffPlanListing.is_active == True)
    if min_price is not None:
        q = q.filter(OffPlanListing.starting_price_aed >= min_price)
    if max_price is not None:
        q = q.filter(OffPlanListing.starting_price_aed <= max_price)
    if handover:
        q = q.filter(OffPlanListing.completion_date_text == handover)
    if area:
        q = q.filter(OffPlanListing.area.ilike(f"%{area}%"))
    if developer:
        q = q.filter(OffPlanListing.developer_name.ilike(f"%{developer}%"))
    if sale_status:
        q = q.filter(OffPlanListing.sale_status.ilike(f"%{sale_status}%"))

    total = q.count()
    rows = q.order_by(OffPlanListing.scrape_timestamp.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "results": [
            {
                "id": r.id,
                "project_name": r.project_name,
                "developer_name": r.developer_name,
                "launch_date": r.launch_date,
                "handover_year": r.handover_year,
                "completion_date_text": r.completion_date_text,
                "sale_status": r.sale_status,
                "completion_percentage": r.completion_percentage,
                "starting_price_aed": r.starting_price_aed,
                "unit_types_available": r.unit_types_available,
                "payment_plan_details": r.payment_plan_details,
                "community": r.community,
                "area": r.area,
                "emirate": r.emirate,
                "listing_url": r.listing_url,
                "cover_image_url": r.cover_image_url,
                "max_commission": r.max_commission,
                "scrape_timestamp": r.scrape_timestamp,
            }
            for r in rows
        ],
    }


# ---------------------------------------------------------------------------
# Reelly project detail proxy
# ---------------------------------------------------------------------------

_reelly_token_cache: dict = {"token": None, "expires_at": 0}
_REELLY_API = "https://api.reelly.io/api:sk5LT7jx"


def _get_reelly_token() -> str:
    if _reelly_token_cache["token"] and time.time() < _reelly_token_cache["expires_at"]:
        return _reelly_token_cache["token"]
    from backend.scrapers.reelly_scraper import _login
    token = _login()
    _reelly_token_cache["token"] = token
    _reelly_token_cache["expires_at"] = time.time() + 3000  # ~50 min
    return token


def _img_url(path_or_obj) -> str | None:
    if not path_or_obj:
        return None
    if isinstance(path_or_obj, dict):
        return path_or_obj.get("url") or (_REELLY_API.replace("/api:sk5LT7jx", "") + path_or_obj.get("path", ""))
    return None


def _img_list(items: list) -> list[str]:
    urls = []
    for item in (items or []):
        u = _img_url(item)
        if u:
            urls.append(u)
    return urls


_DETAIL_CACHE_TTL = 86400  # 24 hours — re-fetch once per day


def _build_detail(d: dict, reelly_id: int) -> dict:
    """Transform raw Reelly project dict into our structured response."""
    images = []
    cover = d.get("cover")
    if cover and isinstance(cover, dict):
        u = cover.get("url")
        if u:
            images.append(u)
    images += _img_list(d.get("Architecture") or [])
    images += _img_list(d.get("Interior") or [])
    images += _img_list(d.get("Lobby") or [])
    images += _img_list(d.get("Master_plan") or [])

    raw_plans = []
    for item in (d.get("Payment_plans") or []):
        p = item[0] if isinstance(item, list) and item else item
        if isinstance(p, dict):
            raw_plans.append(p)
    payment_plans = [
        {"order": p.get("Order", 0), "percent": p.get("Percent_of_payment"), "when": p.get("Payment_time")}
        for p in sorted(raw_plans, key=lambda x: x.get("Order", 0))
    ]

    units = [
        {
            "type": u.get("unit_type"), "bedrooms": u.get("unit_bedrooms"),
            "area_from_sqft": u.get("Area_from_sqft"), "area_to_sqft": u.get("Area_to_sqft"),
            "price_from_aed": u.get("Price_from_AED"), "price_to_aed": u.get("Price_to_AED"),
        }
        for u in (d.get("Starting_price") or []) if u.get("Price_from_AED")
    ]

    def unwrap(items):
        result = []
        for item in (items or []):
            obj = item[0] if isinstance(item, list) and item else item
            if isinstance(obj, dict):
                result.append(obj)
        return result

    facilities = [f.get("Name") for f in unwrap(d.get("Facilities")) if f.get("Name")]
    map_points = [
        {"name": p.get("Point_name"), "distance": p.get("Distance_km")}
        for p in unwrap(d.get("Map_points")) if p.get("Point_name")
    ]

    return {
        "id": reelly_id,
        "project_name": d.get("Project_name"),
        "developer_name": d.get("Developers_name"),
        "area": d.get("Area_name"),
        "region": d.get("Region"),
        "sale_status": d.get("sale_status"),
        "completion_date": d.get("Completion_date"),
        "readiness": d.get("Readiness_progress"),
        "floors": d.get("Floors"),
        "furnishing": d.get("Furnishing"),
        "service_charge": d.get("Service_Charge"),
        "max_commission": d.get("max_commission"),
        "post_handover": d.get("post_handover"),
        "overview": d.get("Overview"),
        "brochure": d.get("Brochure"),
        "video_id": d.get("Video_URL"),
        "coordinates": d.get("Coordinates"),
        "map_embed": d.get("Map_marker_link"),
        "images": images,
        "payment_plans": payment_plans,
        "units": units,
        "facilities": facilities,
        "map_points": map_points,
        "reelly_url": f"https://find.reelly.io/projects/{reelly_id}",
    }


@app.get("/listings/offplan/{reelly_id}/detail")
def offplan_detail(reelly_id: int, db: Session = Depends(get_db)):
    """
    Return full project detail for the in-app modal.
    Checks DB cache first (24h TTL); fetches from Reelly API and caches on miss.
    """
    import json as _json
    from backend.database.models import OffPlanListing

    # --- cache hit ---
    row = db.query(OffPlanListing).filter(
        OffPlanListing.listing_url == f"https://find.reelly.io/projects/{reelly_id}"
    ).first()
    if row and row.detail_json and row.detail_fetched_at:
        age = time.time() - row.detail_fetched_at
        if age < _DETAIL_CACHE_TTL:
            return _json.loads(row.detail_json)

    # --- cache miss: fetch from Reelly API ---
    try:
        token = _get_reelly_token()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Reelly auth failed: {exc}")

    try:
        resp = httpx.get(
            f"{_REELLY_API}/projects/{reelly_id}",
            headers={"authToken": token},
            timeout=15,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    if resp.status_code == 401:
        _reelly_token_cache["token"] = None
        raise HTTPException(status_code=401, detail="Reelly session expired — retry")

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="Reelly API error")

    result = _build_detail(resp.json(), reelly_id)

    # --- save to DB cache ---
    import json as _json
    if row:
        row.detail_json = _json.dumps(result)
        row.detail_fetched_at = int(time.time())
        db.commit()

    return result


@app.get("/listings/stats")
def listing_stats(db: Session = Depends(get_db)):
    """Quick summary counts for the dashboard."""
    from backend.database.models import SecondaryListing, OffPlanListing
    from sqlalchemy import func

    secondary_total = db.query(func.count(SecondaryListing.id)).scalar()
    bayut_count = db.query(func.count(SecondaryListing.id)).filter(SecondaryListing.source == "bayut").scalar()
    pf_count = db.query(func.count(SecondaryListing.id)).filter(SecondaryListing.source == "propertyfinder").scalar()
    offplan_total = db.query(func.count(OffPlanListing.id)).scalar()

    avg_price = db.query(func.avg(SecondaryListing.price_aed)).filter(
        SecondaryListing.price_aed.isnot(None)
    ).scalar()

    return {
        "secondary_total": secondary_total,
        "bayut_count": bayut_count,
        "propertyfinder_count": pf_count,
        "offplan_total": offplan_total,
        "secondary_avg_price_aed": round(avg_price, 0) if avg_price else None,
    }


# ---------------------------------------------------------------------------
# Routes — client matching
# ---------------------------------------------------------------------------

class MatchRequest(BaseModel):
    budget_min: float | None = None
    budget_max: float | None = None
    budget_weight: float = 2.0
    bedrooms: str | None = None
    bedrooms_weight: float = 1.5
    size_min_sqft: float | None = None
    size_max_sqft: float | None = None
    property_type: str | None = None
    preferred_areas: list[str] = []
    area_weight: float = 1.5
    market_type: str | None = None
    max_handover_year: int | None = None
    furnishing: str | None = None
    prefer_fresh: bool = False
    top_n: int = 15
    min_score_pct: float = 0.0


@app.post("/match")
def match(req: MatchRequest, db: Session = Depends(get_db)):
    """Score and rank all listings against client requirements."""
    client_req = ClientRequirements(
        budget_min=req.budget_min,
        budget_max=req.budget_max,
        budget_weight=req.budget_weight,
        bedrooms=req.bedrooms,
        bedrooms_weight=req.bedrooms_weight,
        size_min_sqft=req.size_min_sqft,
        size_max_sqft=req.size_max_sqft,
        property_type=req.property_type,
        preferred_areas=req.preferred_areas,
        area_weight=req.area_weight,
        market_type=req.market_type,
        max_handover_year=req.max_handover_year,
        furnishing=req.furnishing,
        prefer_fresh=req.prefer_fresh,
    )
    matches = match_listings(client_req, db, top_n=req.top_n, min_score_pct=req.min_score_pct)
    return {
        "count": len(matches),
        "results": [
            {
                "listing_id": m.listing_id,
                "source": m.source,
                "listing_type": m.listing_type,
                "title": m.title,
                "price_aed": m.price_aed,
                "area": m.area,
                "community": m.community,
                "bedrooms": m.bedrooms,
                "size_sqft": m.size_sqft,
                "listing_url": m.listing_url,
                "total_score": m.total_score,
                "max_score": m.max_score,
                "score_pct": m.score_pct,
                "breakdown": m.breakdown,
                "raw": m.raw,
            }
            for m in matches
        ],
    }


class ReportRequest(BaseModel):
    match_request: MatchRequest
    client_name: str = ""


@app.post("/report/match")
def report_match(req: ReportRequest, db: Session = Depends(get_db)):
    """Generate and return a PDF match report."""
    client_req = ClientRequirements(
        budget_min=req.match_request.budget_min,
        budget_max=req.match_request.budget_max,
        budget_weight=req.match_request.budget_weight,
        bedrooms=req.match_request.bedrooms,
        bedrooms_weight=req.match_request.bedrooms_weight,
        size_min_sqft=req.match_request.size_min_sqft,
        size_max_sqft=req.match_request.size_max_sqft,
        property_type=req.match_request.property_type,
        preferred_areas=req.match_request.preferred_areas,
        area_weight=req.match_request.area_weight,
        market_type=req.match_request.market_type,
        max_handover_year=req.match_request.max_handover_year,
        furnishing=req.match_request.furnishing,
        prefer_fresh=req.match_request.prefer_fresh,
    )
    matches = match_listings(client_req, db, top_n=req.match_request.top_n,
                             min_score_pct=req.match_request.min_score_pct)

    match_dicts = [
        {
            "listing_id": m.listing_id,
            "listing_type": m.listing_type,
            "title": m.title,
            "price_aed": m.price_aed,
            "area": m.area,
            "community": m.community,
            "bedrooms": m.bedrooms,
            "size_sqft": m.size_sqft,
            "listing_url": m.listing_url,
            "score_pct": m.score_pct,
            "breakdown": m.breakdown,
        }
        for m in matches
    ]

    pdf_bytes = generate_match_report(
        matches=match_dicts,
        req=req.match_request.model_dump(),
        client_name=req.client_name,
    )

    filename = f"penta_match_report_{datetime.utcnow().strftime('%Y%m%d_%H%M')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
