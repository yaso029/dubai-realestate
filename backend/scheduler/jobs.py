"""
APScheduler job definitions.
Scrapers are sync functions run via asyncio.to_thread() to avoid
Windows ProactorEventLoop subprocess restrictions with Playwright.
"""

import asyncio
import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


# ---------------------------------------------------------------------------
# Job functions
# ---------------------------------------------------------------------------

async def job_scrape_bayut():
    from backend.database.db import SessionLocal
    from backend.database.models import ScrapeLog
    from backend.scrapers.bayut_scraper import run_bayut_scraper, upsert_listings

    db = SessionLocal()
    log = ScrapeLog(source="bayut", status="running")
    db.add(log)
    db.commit()
    db.refresh(log)
    try:
        listings = await asyncio.to_thread(run_bayut_scraper, max_pages=5, fetch_details=True)
        new_c, upd_c = upsert_listings(listings, db)
        log.finished_at = datetime.utcnow()
        log.listings_found = len(listings)
        log.listings_new = new_c
        log.listings_updated = upd_c
        log.status = "success"
        db.commit()
        logger.info("[scheduler] Bayut done — %d new, %d updated", new_c, upd_c)
    except Exception as exc:
        logger.exception("[scheduler] Bayut job failed")
        log.finished_at = datetime.utcnow()
        log.status = "error"
        log.error_message = str(exc)
        db.commit()
    finally:
        db.close()


async def job_scrape_propertyfinder():
    from backend.database.db import SessionLocal
    from backend.database.models import ScrapeLog
    from backend.scrapers.propertyfinder_scraper import run_propertyfinder_scraper, upsert_listings

    db = SessionLocal()
    log = ScrapeLog(source="propertyfinder", status="running")
    db.add(log)
    db.commit()
    db.refresh(log)
    try:
        listings = await asyncio.to_thread(run_propertyfinder_scraper, max_pages=5, fetch_details=True)
        new_c, upd_c = upsert_listings(listings, db)
        log.finished_at = datetime.utcnow()
        log.listings_found = len(listings)
        log.listings_new = new_c
        log.listings_updated = upd_c
        log.status = "success"
        db.commit()
        logger.info("[scheduler] PropertyFinder done — %d new, %d updated", new_c, upd_c)
    except Exception as exc:
        logger.exception("[scheduler] PropertyFinder job failed")
        log.finished_at = datetime.utcnow()
        log.status = "error"
        log.error_message = str(exc)
        db.commit()
    finally:
        db.close()


async def job_scrape_reelly():
    from backend.database.db import SessionLocal
    from backend.database.models import ScrapeLog
    from backend.scrapers.reelly_scraper import run_reelly_scraper, upsert_offplan_listings

    db = SessionLocal()
    log = ScrapeLog(source="reelly", status="running")
    db.add(log)
    db.commit()
    db.refresh(log)
    try:
        listings = await asyncio.to_thread(run_reelly_scraper, max_pages=5)
        new_c, upd_c = upsert_offplan_listings(listings, db)
        log.finished_at = datetime.utcnow()
        log.listings_found = len(listings)
        log.listings_new = new_c
        log.listings_updated = upd_c
        log.status = "success"
        db.commit()
        logger.info("[scheduler] Reelly done — %d new, %d updated", new_c, upd_c)
    except Exception as exc:
        logger.exception("[scheduler] Reelly job failed")
        log.finished_at = datetime.utcnow()
        log.status = "error"
        log.error_message = str(exc)
        db.commit()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Scheduler lifecycle
# ---------------------------------------------------------------------------

def start_scheduler() -> AsyncIOScheduler:
    global _scheduler
    _scheduler = AsyncIOScheduler()

    _scheduler.add_job(job_scrape_bayut, IntervalTrigger(hours=6), id="bayut",
                       name="Bayut scrape", replace_existing=True)
    _scheduler.add_job(job_scrape_propertyfinder, IntervalTrigger(hours=6, minutes=10),
                       id="propertyfinder", name="PropertyFinder scrape", replace_existing=True)
    _scheduler.add_job(job_scrape_reelly, IntervalTrigger(hours=12), id="reelly",
                       name="Reelly scrape", replace_existing=True)

    _scheduler.start()
    logger.info("Scheduler started — Bayut/PF every 6h, Reelly every 12h")
    return _scheduler


def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped.")
