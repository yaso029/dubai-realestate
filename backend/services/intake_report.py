"""
PDF report generator for PROPIQ client intake sessions.
"""
from datetime import datetime
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether,
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

# ── Brand colours ──────────────────────────────────────────────────────────────
NAVY  = colors.HexColor("#0f172a")
BLUE  = colors.HexColor("#3b82f6")
TEAL  = colors.HexColor("#0ea5e9")
GREEN = colors.HexColor("#059669")
LIGHT = colors.HexColor("#f8fafc")
GREY  = colors.HexColor("#64748b")
MUTED = colors.HexColor("#94a3b8")
WHITE = colors.white


def _styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("title", fontSize=26, textColor=WHITE,
                                fontName="Helvetica-Bold", alignment=TA_LEFT, leading=32),
        "subtitle": ParagraphStyle("subtitle", fontSize=11, textColor=MUTED,
                                   fontName="Helvetica", alignment=TA_LEFT),
        "section_head": ParagraphStyle("section_head", fontSize=12, textColor=BLUE,
                                       fontName="Helvetica-Bold", spaceAfter=6, spaceBefore=14),
        "label": ParagraphStyle("label", fontSize=9, textColor=GREY,
                                fontName="Helvetica-Bold", leading=14),
        "value": ParagraphStyle("value", fontSize=10, textColor=NAVY,
                                fontName="Helvetica", leading=14),
        "body": ParagraphStyle("body", fontSize=10, textColor=NAVY,
                               fontName="Helvetica", leading=15),
        "footer": ParagraphStyle("footer", fontSize=8, textColor=MUTED,
                                 fontName="Helvetica", alignment=TA_CENTER),
        "note_area": ParagraphStyle("note_area", fontSize=10, textColor=GREY,
                                    fontName="Helvetica-Oblique", leading=16),
    }


def _val(v, fallback="Not specified"):
    if v is None or v == "" or v == "null":
        return fallback
    if isinstance(v, bool):
        return "Yes" if v else "No"
    return str(v)


def _section(title, rows, s):
    """Build a labelled section table."""
    elements = []
    elements.append(Paragraph(title, s["section_head"]))
    elements.append(HRFlowable(width="100%", thickness=1, color=BLUE, spaceAfter=8))

    table_data = []
    for label, value in rows:
        table_data.append([
            Paragraph(label, s["label"]),
            Paragraph(_val(value), s["value"]),
        ])

    t = Table(table_data, colWidths=[5.5 * cm, 11 * cm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [LIGHT, WHITE]),
        ("LEFTPADDING",  (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING",   (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
        ("ROUNDEDCORNERS", [4]),
    ]))
    elements.append(t)
    return elements


def generate_pdf(client_data: dict, messages: list[dict], session_id: str) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=1.5 * cm,
        bottomMargin=2 * cm,
    )

    s = _styles()
    story = []
    W = A4[0] - 4 * cm  # usable width

    # ── Header banner ───────────────────────────────────────────────────────────
    now = datetime.utcnow()
    header_data = [[
        Paragraph("PROPIQ", ParagraphStyle("logo", fontSize=28, textColor=WHITE,
                                           fontName="Helvetica-Bold")),
        Paragraph(
            f"Client Intake Report<br/>"
            f"<font size='9' color='#94a3b8'>{now.strftime('%d %B %Y  •  %H:%M UTC')}</font>",
            ParagraphStyle("hdr_right", fontSize=14, textColor=WHITE,
                           fontName="Helvetica-Bold", alignment=TA_RIGHT, leading=20),
        ),
    ]]
    header = Table(header_data, colWidths=[W * 0.5, W * 0.5])
    header.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), NAVY),
        ("LEFTPADDING",   (0, 0), (-1, -1), 16),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 16),
        ("TOPPADDING",    (0, 0), (-1, -1), 16),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 16),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("ROUNDEDCORNERS", [6]),
    ]))
    story.append(header)
    story.append(Spacer(1, 0.4 * cm))

    # Blue accent bar
    story.append(HRFlowable(width="100%", thickness=3, color=BLUE, spaceAfter=16))

    # ── Section 1: Contact Details ──────────────────────────────────────────────
    story += _section("Contact Details", [
        ("Full Name",    client_data.get("client_name")),
        ("WhatsApp",     client_data.get("client_phone")),
        ("Email",        client_data.get("client_email")),
        ("Nationality",  client_data.get("client_nationality")),
        ("Location",     client_data.get("client_location")),
    ], s)

    # ── Section 2: Purchase Purpose ─────────────────────────────────────────────
    purpose_raw = client_data.get("purchase_purpose", "")
    purpose_label = "Investment" if purpose_raw == "investment" else (
        "End User (Personal Use)" if purpose_raw == "end_user" else purpose_raw
    )
    purpose_rows = [("Purchase Purpose", purpose_label)]
    if purpose_raw == "investment":
        goal = client_data.get("investment_goal", "")
        purpose_rows.append(("Investment Goal", "Rental Yield" if goal == "rental_yield"
                              else "Capital Appreciation" if goal == "capital_appreciation" else goal))
    elif purpose_raw == "end_user":
        res = client_data.get("residence_type", "")
        purpose_rows.append(("Residence Type", "Primary Residence" if res == "primary"
                              else "Holiday Home" if res == "holiday" else res))
    story += _section("Purchase Purpose", purpose_rows, s)

    # ── Section 3: Property Requirements ───────────────────────────────────────
    market_map = {"off_plan": "Off-Plan", "ready": "Ready / Secondary", "both": "Open to Both"}
    story += _section("Property Requirements", [
        ("Property Type",   client_data.get("property_type")),
        ("Bedrooms",        client_data.get("bedrooms")),
        ("Preferred Areas", client_data.get("preferred_areas")),
        ("Market",          market_map.get(client_data.get("market_preference", ""), client_data.get("market_preference"))),
        ("Handover",        client_data.get("handover_timeline")),
        ("Must-Have Features", client_data.get("must_have_features")),
    ], s)

    # ── Section 4: Budget & Finance ─────────────────────────────────────────────
    finance_rows = [
        ("Total Budget",      client_data.get("budget_aed")),
        ("Finance Type",      "Cash Buyer" if client_data.get("finance_type") == "cash"
                              else "Mortgage" if client_data.get("finance_type") == "mortgage"
                              else client_data.get("finance_type")),
    ]
    if client_data.get("finance_type") == "mortgage":
        finance_rows.append(("Mortgage Pre-Approved", client_data.get("mortgage_preapproved")))
    if client_data.get("payment_plan_interest"):
        finance_rows.append(("Down Payment %", client_data.get("down_payment_pct")))
    story += _section("Budget & Finance", finance_rows, s)

    # ── Section 5: Timeline & Urgency ───────────────────────────────────────────
    story += _section("Timeline & Urgency", [
        ("Timeline to Buy",       client_data.get("timeline_to_buy")),
        ("Viewed Properties",     client_data.get("viewed_properties")),
        ("Working With Brokers",  client_data.get("other_brokers")),
    ], s)

    # ── Section 6: Broker Notes ─────────────────────────────────────────────────
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph("Broker Notes", s["section_head"]))
    story.append(HRFlowable(width="100%", thickness=1, color=BLUE, spaceAfter=8))
    notes_lines = [
        "________________________________________________________________________",
        "________________________________________________________________________",
        "________________________________________________________________________",
        "________________________________________________________________________",
    ]
    for line in notes_lines:
        story.append(Paragraph(line, s["note_area"]))
        story.append(Spacer(1, 0.15 * cm))

    # ── Footer ──────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 0.8 * cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=MUTED))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "PROPIQ Real Estate  •  Dubai, UAE  •  info@propiq.ae  •  www.propiq.ae<br/>"
        f"<font size='7'>Session ID: {session_id}  •  Generated: {now.strftime('%Y-%m-%d %H:%M')} UTC</font>",
        s["footer"],
    ))

    doc.build(story)
    return buf.getvalue()
