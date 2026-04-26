"""
Form-based client intake routes.
POST /intake/form/save            — save complete form data
POST /intake/form/generate-report — generate PDF
POST /intake/form/ai-chat         — contextual AI question
GET  /intake/form/all             — list all form intakes
GET  /intake/form/{sid}           — get single intake
"""
import json
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.database.models import ClientIntakeForm
from backend.services.intake_form_report import generate_pdf
from backend.services.intake_ai import get_contextual_tip
from backend.services.email_sender import send_pdf_email

router = APIRouter(prefix="/intake/form", tags=["intake-form"])


class SaveRequest(BaseModel):
    form_data: dict
    session_id: str | None = None


class ReportRequest(BaseModel):
    session_id: str


class ChatRequest(BaseModel):
    question: str
    step: int | str = 0


class EmailRequest(BaseModel):
    session_id: str
    recipient_email: str


@router.post("/save")
def save_form(req: SaveRequest, db: Session = Depends(get_db)):
    sid = req.session_id or str(uuid.uuid4())
    d = req.form_data

    row = db.query(ClientIntakeForm).filter_by(session_id=sid).first()
    if not row:
        row = ClientIntakeForm(session_id=sid)
        db.add(row)

    row.form_data_json = json.dumps(d, ensure_ascii=False)
    row.language = d.get("language", "en")
    row.client_name = d.get("fullName") or None
    row.client_phone = d.get("whatsapp") or None
    row.client_email = d.get("email") or None
    row.client_nationality = d.get("nationality") or None
    row.purchase_purpose = d.get("purpose") or None
    row.bedrooms = d.get("bedrooms") or None
    row.budget_min = d.get("budgetMin") or None
    row.budget_max = d.get("budgetMax") or None
    row.market_preference = d.get("marketPreference") or None
    row.payment_method = d.get("paymentMethod") or None
    row.completed = True
    row.updated_at = datetime.utcnow()
    db.commit()

    return {"session_id": sid, "ok": True}


@router.post("/generate-report")
def generate_report(req: ReportRequest, db: Session = Depends(get_db)):
    row = db.query(ClientIntakeForm).filter_by(session_id=req.session_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")

    data = json.loads(row.form_data_json or "{}")
    pdf_bytes = generate_pdf(data, req.session_id)

    name = (row.client_name or "Client").replace(" ", "_")
    date_str = datetime.utcnow().strftime("%Y%m%d")
    filename = f"PROPIQ_Intake_{name}_{date_str}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/send-email")
def send_email_report(req: EmailRequest, db: Session = Depends(get_db)):
    row = db.query(ClientIntakeForm).filter_by(session_id=req.session_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")

    data = json.loads(row.form_data_json or "{}")
    pdf_bytes = generate_pdf(data, req.session_id)

    try:
        send_pdf_email(pdf_bytes, req.recipient_email, row.client_name or "Client")
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email failed: {e}")

    return {"ok": True, "sent_to": req.recipient_email}


@router.post("/ai-chat")
def ai_chat(req: ChatRequest):
    try:
        answer = get_contextual_tip(req.question, step=str(req.step))
    except Exception as e:
        answer = f"I'm unable to answer right now: {e}"
    return {"answer": answer}


@router.get("/all")
def list_all(db: Session = Depends(get_db)):
    rows = db.query(ClientIntakeForm).order_by(ClientIntakeForm.created_at.desc()).limit(100).all()
    return [
        {
            "session_id": r.session_id,
            "client_name": r.client_name or "Unknown",
            "client_phone": r.client_phone,
            "client_email": r.client_email,
            "purchase_purpose": r.purchase_purpose,
            "budget_min": r.budget_min,
            "budget_max": r.budget_max,
            "market_preference": r.market_preference,
            "completed": r.completed,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.get("/{session_id}")
def get_one(session_id: str, db: Session = Depends(get_db)):
    row = db.query(ClientIntakeForm).filter_by(session_id=session_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "session_id": row.session_id,
        "form_data": json.loads(row.form_data_json or "{}"),
        "completed": row.completed,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }
