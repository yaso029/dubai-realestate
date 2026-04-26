"""
ReportLab PDF generator for the multi-step form-based client intake.
"""
import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

NAVY = colors.HexColor('#0A1628')
GOLD = colors.HexColor('#C9A84C')
LIGHT = colors.HexColor('#F8FAFC')
BORDER_CLR = colors.HexColor('#E5E7EB')
GREY_TEXT = colors.HexColor('#6B7280')
WHITE = colors.white

PAGE_W, PAGE_H = A4
MARGIN = 20 * mm

TIMELINE_LABELS = {
    'immediate': 'Immediately (within 1 month)',
    '3months': 'Within 3 months',
    '6months': 'Within 6 months',
    '1year': 'Within 1 year',
    'exploring': 'Just exploring',
}
MARKET_LABELS = {
    'offplan': 'Off-Plan (New Launch)',
    'ready': 'Ready / Secondary',
    'both': 'Open to Both',
}
PAYMENT_LABELS = {
    'cash': 'Cash Buyer',
    'mortgage': 'Mortgage (Bank Financed)',
    'payment_plan': 'Developer Payment Plan',
    'unsure': 'Not Sure Yet',
}
PURPOSE_LABELS = {
    'investment': 'Investment',
    'end_user': 'Personal Use (End User)',
}
GOAL_LABELS = {
    'rental_yield': 'Rental Yield',
    'capital': 'Capital Appreciation',
    'both': 'Rental Yield + Capital Appreciation',
}
RESIDENCE_LABELS = {
    'primary': 'Primary Residence',
    'holiday': 'Holiday Home',
}


def fmt_budget(val):
    if not val:
        return 'Not specified'
    val = int(val)
    if val >= 1_000_000:
        m = val / 1_000_000
        return f"AED {m:.1f}M" if m % 1 != 0 else f"AED {int(m)}M"
    return f"AED {val:,}"


def generate_pdf(data: dict, session_id: str) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=MARGIN, bottomMargin=MARGIN,
    )

    styles = getSampleStyleSheet()
    body_style = ParagraphStyle('body', fontName='Helvetica', fontSize=9.5, textColor=NAVY, leading=14)
    label_style = ParagraphStyle('label', fontName='Helvetica', fontSize=8.5, textColor=GREY_TEXT, leading=12)
    val_style = ParagraphStyle('val', fontName='Helvetica-Bold', fontSize=9.5, textColor=NAVY, leading=14)
    section_style = ParagraphStyle('section', fontName='Helvetica-Bold', fontSize=10, textColor=WHITE, leading=14)

    story = []
    usable_w = PAGE_W - 2 * MARGIN

    # ── Header ──────────────────────────────────────────────────────────────────
    header_data = [[
        Paragraph('<font color="#C9A84C" size="18"><b>PROPIQ</b></font> <font color="white" size="11">Real Estate</font>', ParagraphStyle('h', fontName='Helvetica-Bold', fontSize=18, textColor=WHITE)),
        Paragraph(
            f'<font color="#C9A84C" size="8"><b>CLIENT INTAKE REPORT</b></font><br/>'
            f'<font color="white" size="7">Generated: {datetime.utcnow().strftime("%d %B %Y, %H:%M UTC")}</font><br/>'
            f'<font color="#94A3B8" size="7">Ref: PROPIQ-{session_id[:8].upper()}</font>',
            ParagraphStyle('hr', fontName='Helvetica', fontSize=8, textColor=WHITE, alignment=TA_RIGHT),
        ),
    ]]
    header_tbl = Table(header_data, colWidths=[usable_w * 0.55, usable_w * 0.45])
    header_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), NAVY),
        ('TOPPADDING', (0, 0), (-1, -1), 14),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
        ('LEFTPADDING', (0, 0), (0, -1), 18),
        ('RIGHTPADDING', (-1, 0), (-1, -1), 18),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(header_tbl)
    story.append(Spacer(1, 8 * mm))

    def section_header(title):
        tbl = Table([[Paragraph(title, section_style)]], colWidths=[usable_w])
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), NAVY),
            ('TOPPADDING', (0, 0), (-1, -1), 7),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('ROUNDEDCORNERS', [4, 4, 4, 4]),
        ]))
        story.append(tbl)
        story.append(Spacer(1, 4 * mm))

    def row(label, value):
        if not value and value is not False:
            return
        val_str = 'Yes' if value is True else ('No' if value is False else str(value))
        data_row = [[
            Paragraph(label, label_style),
            Paragraph(val_str, val_style),
        ]]
        tbl = Table(data_row, colWidths=[usable_w * 0.38, usable_w * 0.62])
        tbl.setStyle(TableStyle([
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('LINEBELOW', (0, 0), (-1, 0), 0.5, BORDER_CLR),
        ]))
        story.append(tbl)

    # ── Section 1: Client Profile ────────────────────────────────────────────────
    section_header('SECTION 1 — CLIENT PROFILE')
    row('Full Name', data.get('fullName'))
    row('WhatsApp', f"+971 {data['whatsapp']}" if data.get('whatsapp') else None)
    row('Email', data.get('email'))
    row('Nationality', data.get('nationality'))
    row('Based in Dubai', data.get('inDubai'))
    story.append(Spacer(1, 6 * mm))

    # ── Section 2: Purchase Intent ───────────────────────────────────────────────
    section_header('SECTION 2 — PURCHASE INTENT')
    row('Purpose', PURPOSE_LABELS.get(data.get('purpose'), data.get('purpose')))
    if data.get('investmentGoal'):
        row('Investment Goal', GOAL_LABELS.get(data['investmentGoal'], data['investmentGoal']))
    if data.get('residenceType'):
        row('Residence Type', RESIDENCE_LABELS.get(data['residenceType'], data['residenceType']))
    story.append(Spacer(1, 6 * mm))

    # ── Section 3: Property Requirements ────────────────────────────────────────
    section_header('SECTION 3 — PROPERTY REQUIREMENTS')
    types = data.get('propertyTypes', [])
    row('Property Type(s)', ', '.join(t.capitalize() for t in types) if types else None)
    row('Bedrooms', data.get('bedrooms'))
    areas = data.get('areas', [])
    row('Preferred Areas', ', '.join(areas) if areas else None)
    row('Market Preference', MARKET_LABELS.get(data.get('marketPreference'), data.get('marketPreference')))
    feats = data.get('features', [])
    if feats:
        row('Must-Have Features', ', '.join(f.replace('_', ' ').title() for f in feats))
    story.append(Spacer(1, 6 * mm))

    # ── Section 4: Financial Profile ─────────────────────────────────────────────
    section_header('SECTION 4 — FINANCIAL PROFILE')
    bmin = data.get('budgetMin')
    bmax = data.get('budgetMax')
    if bmin and bmax:
        row('Budget Range', f"{fmt_budget(bmin)} — {fmt_budget(bmax)}")
    row('Payment Method', PAYMENT_LABELS.get(data.get('paymentMethod'), data.get('paymentMethod')))
    if data.get('paymentMethod') == 'mortgage':
        row('Mortgage Pre-Approved', data.get('mortgagePreapproved'))
        row('Pre-Approval Amount', data.get('preapprovalAmount'))
    if data.get('paymentMethod') == 'payment_plan':
        row('Down Payment Available', data.get('downPaymentPct'))
    story.append(Spacer(1, 6 * mm))

    # ── Section 5: Timeline & Status ─────────────────────────────────────────────
    section_header('SECTION 5 — TIMELINE & STATUS')
    row('Purchase Timeline', TIMELINE_LABELS.get(data.get('timeline'), data.get('timeline')))
    row('Viewed Properties', data.get('viewedProperties'))
    row('Working With Other Brokers', data.get('otherBrokers'))
    if data.get('additionalNotes'):
        story.append(Spacer(1, 3 * mm))
        story.append(Paragraph('<b>Additional Notes:</b>', val_style))
        story.append(Spacer(1, 2 * mm))
        story.append(Paragraph(data['additionalNotes'], body_style))
    story.append(Spacer(1, 6 * mm))

    # ── Section 6: Broker Notes ───────────────────────────────────────────────────
    section_header('SECTION 6 — BROKER NOTES')
    for _ in range(6):
        story.append(HRFlowable(width=usable_w, thickness=0.5, color=BORDER_CLR))
        story.append(Spacer(1, 6 * mm))
    story.append(Spacer(1, 4 * mm))

    # ── Footer ────────────────────────────────────────────────────────────────────
    footer_data = [[
        Paragraph('<font color="#C9A84C"><b>PROPIQ</b></font> Real Estate', ParagraphStyle('fl', fontName='Helvetica-Bold', fontSize=9, textColor=WHITE)),
        Paragraph('propiq.ae', ParagraphStyle('fc', fontName='Helvetica', fontSize=8, textColor=GREY_TEXT, alignment=TA_CENTER)),
        Paragraph('Confidential — prepared for broker use only', ParagraphStyle('fr', fontName='Helvetica', fontSize=8, textColor=GREY_TEXT, alignment=TA_RIGHT)),
    ]]
    footer_tbl = Table(footer_data, colWidths=[usable_w * 0.33] * 3)
    footer_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), NAVY),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (0, -1), 12),
        ('RIGHTPADDING', (-1, 0), (-1, -1), 12),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(footer_tbl)

    doc.build(story)
    return buf.getvalue()
