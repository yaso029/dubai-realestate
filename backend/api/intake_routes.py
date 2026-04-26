"""
Client intake API routes.
POST /intake/start          — create new session, get opening message
POST /intake/message        — send client message, get AI reply
POST /intake/generate-report — generate PDF for a session
GET  /intake/clients        — list all sessions
GET  /intake/clients/{sid}  — get one session + messages
"""
import json
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.database.models import ClientIntake
from backend.services.intake_ai import chat, extract_client_data, get_opening_message
from backend.services.intake_report import generate_pdf

router = APIRouter(prefix="/intake", tags=["intake"])


# ── Pydantic schemas ────────────────────────────────────────────────────────────

class StartRequest(BaseModel):
    session_id: str | None = None   # optional; server creates one if absent


class MessageRequest(BaseModel):
    session_id: str
    message: str


class ReportRequest(BaseModel):
    session_id: str


# ── Helpers ─────────────────────────────────────────────────────────────────────

def _get_session(session_id: str, db: Session) -> ClientIntake:
    row = db.query(ClientIntake).filter_by(session_id=session_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    return row


def _load_messages(row: ClientIntake) -> list[dict]:
    return json.loads(row.messages_json or "[]")


def _save_messages(row: ClientIntake, messages: list[dict], db: Session):
    row.messages_json = json.dumps(messages, ensure_ascii=False)
    row.updated_at = datetime.utcnow()
    db.commit()


# ── Routes ──────────────────────────────────────────────────────────────────────

@router.post("/start")
def start_session(req: StartRequest, db: Session = Depends(get_db)):
    """Create a new intake session and return the AI's opening message."""
    sid = req.session_id or str(uuid.uuid4())
    existing = db.query(ClientIntake).filter_by(session_id=sid).first()
    if existing:
        msgs = _load_messages(existing)
        return {"session_id": sid, "message": msgs[0]["content"] if msgs else get_opening_message(), "completed": existing.completed}

    opening = get_opening_message()
    messages = [{"role": "assistant", "content": opening}]
    row = ClientIntake(
        session_id=sid,
        messages_json=json.dumps(messages, ensure_ascii=False),
    )
    db.add(row)
    db.commit()
    return {"session_id": sid, "message": opening, "completed": False}


@router.post("/message")
def send_message(req: MessageRequest, db: Session = Depends(get_db)):
    """Receive a client message, get AI reply, persist both."""
    row = _get_session(req.session_id, db)
    messages = _load_messages(row)

    # Append client message
    messages.append({"role": "user", "content": req.message})

    # Get AI reply
    try:
        ai_reply = chat(messages)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI error: {exc}")

    # Append AI reply
    messages.append({"role": "assistant", "content": ai_reply})

    # Check if conversation is complete
    completed = "[READY_TO_GENERATE]" in ai_reply
    if completed:
        row.completed = True
        ai_reply = ai_reply.replace("[READY_TO_GENERATE]", "").strip()
        messages[-1]["content"] = ai_reply

        # Extract client data in background
        try:
            data = extract_client_data(messages)
            for field, val in data.items():
                if hasattr(row, field) and val is not None:
                    setattr(row, field, val)
        except Exception:
            pass  # non-fatal; data shown on next load

    _save_messages(row, messages, db)

    return {
        "session_id": req.session_id,
        "message": ai_reply,
        "completed": completed,
    }


@router.post("/generate-report")
def generate_report(req: ReportRequest, db: Session = Depends(get_db)):
    """Generate and return a PDF intake report for a session."""
    row = _get_session(req.session_id, db)
    messages = _load_messages(row)

    # Build client data dict from stored fields
    client_data = {
        "client_name": row.client_name,
        "client_phone": row.client_phone,
        "client_email": row.client_email,
        "client_nationality": row.client_nationality,
        "client_location": row.client_location,
        "purchase_purpose": row.purchase_purpose,
        "investment_goal": row.investment_goal,
        "residence_type": row.residence_type,
        "property_type": row.property_type,
        "bedrooms": row.bedrooms,
        "preferred_areas": row.preferred_areas,
        "market_preference": row.market_preference,
        "handover_timeline": row.handover_timeline,
        "must_have_features": row.must_have_features,
        "budget_aed": row.budget_aed,
        "finance_type": row.finance_type,
        "mortgage_preapproved": row.mortgage_preapproved,
        "payment_plan_interest": row.payment_plan_interest,
        "down_payment_pct": row.down_payment_pct,
        "timeline_to_buy": row.timeline_to_buy,
        "viewed_properties": row.viewed_properties,
        "other_brokers": row.other_brokers,
    }

    # If extraction didn't run yet, run it now
    if not row.client_name:
        try:
            data = extract_client_data(messages)
            for field, val in data.items():
                if hasattr(row, field) and val is not None:
                    setattr(row, field, val)
                    client_data[field] = val
            db.commit()
        except Exception:
            pass

    pdf_bytes = generate_pdf(client_data, messages, req.session_id)
    name = (row.client_name or "Client").replace(" ", "_")
    date_str = datetime.utcnow().strftime("%Y%m%d")
    filename = f"PROPIQ_Client_{name}_{date_str}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/clients")
def list_clients(db: Session = Depends(get_db)):
    """Return all intake sessions, newest first."""
    rows = db.query(ClientIntake).order_by(ClientIntake.created_at.desc()).limit(100).all()
    return [
        {
            "session_id": r.session_id,
            "client_name": r.client_name or "Unknown",
            "client_phone": r.client_phone,
            "client_email": r.client_email,
            "completed": r.completed,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "purchase_purpose": r.purchase_purpose,
            "budget_aed": r.budget_aed,
        }
        for r in rows
    ]


@router.get("/clients/{session_id}")
def get_client(session_id: str, db: Session = Depends(get_db)):
    """Return a single session with full message history."""
    row = _get_session(session_id, db)
    messages = _load_messages(row)
    return {
        "session_id": row.session_id,
        "client_name": row.client_name,
        "client_phone": row.client_phone,
        "client_email": row.client_email,
        "client_nationality": row.client_nationality,
        "client_location": row.client_location,
        "purchase_purpose": row.purchase_purpose,
        "completed": row.completed,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "messages": messages,
    }
