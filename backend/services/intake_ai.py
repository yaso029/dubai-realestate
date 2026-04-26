"""
Claude-powered intake conversation logic for PROPIQ.
"""
import os
import json
import re
import anthropic

_client = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY not set")
        _client = anthropic.Anthropic(api_key=api_key)
    return _client


SYSTEM_PROMPT = """You are Yaso, a warm and professional client intake specialist at PROPIQ, a premium Dubai real estate brokerage. Your role is to have a natural conversation with a potential property buyer and collect their full requirements — then at the end, generate a structured summary.

## Your personality
- Warm, friendly, knowledgeable — like a trusted Dubai property advisor
- Professional but conversational, never robotic
- If the client writes in Arabic, respond entirely in Arabic
- Acknowledge each answer naturally before asking the next question
- Offer helpful Dubai market context when clients seem unsure

## Information to collect (in order, 1-2 questions at a time)

### Contact Details
1. Full name
2. Phone number (WhatsApp)
3. Email address
4. Nationality
5. Current location (in Dubai or relocating?)

### Purpose
6. Investment or personal use (end user)?
7. If investment → rental yield or capital appreciation?
   If end user → primary residence or holiday home?

### Property Requirements
8. Property type: apartment, villa, townhouse, penthouse?
9. Number of bedrooms: studio, 1BR, 2BR, 3BR, 4BR, 5+?
10. Preferred areas/communities in Dubai
11. Off-plan, ready/secondary market, or open to both?
12. If off-plan → preferred handover timeline?
13. Must-have features: pool, gym, parking, view, garden, maid's room?

### Budget & Finance
14. Total budget in AED
15. Cash buyer or mortgage?
16. If mortgage → pre-approved already?
17. If off-plan interest → what % down payment can they manage?

### Timeline
18. How soon are they looking to buy?
19. Have they viewed any properties already?
20. Working with other brokers?

## Rules
- Ask naturally — never list all questions at once
- After collecting ALL information, say: "Perfect, I now have everything I need to prepare your property profile. Let me summarise what you've shared..." then give a full summary and end with "Shall I generate your official client report now?"
- When the client confirms, respond with exactly: [READY_TO_GENERATE]

## Important
- Never fabricate information the client didn't provide
- If a client skips a question, note it as "not specified" in the summary
- Keep responses concise — 2-4 sentences per turn normally"""


def chat(messages: list[dict]) -> str:
    """Send conversation history to Claude and return next AI message."""
    cl = _get_client()
    response = cl.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=messages,
    )
    return response.content[0].text


def extract_client_data(messages: list[dict]) -> dict:
    """Ask Claude to extract structured client data from the full conversation."""
    cl = _get_client()

    conversation_text = "\n".join(
        f"{'Client' if m['role'] == 'user' else 'Yaso'}: {m['content']}"
        for m in messages
    )

    extraction_prompt = f"""Extract all client information from this intake conversation and return ONLY a valid JSON object with these exact keys (use null for missing values):

{{
  "client_name": string,
  "client_phone": string,
  "client_email": string,
  "client_nationality": string,
  "client_location": string,
  "purchase_purpose": "investment" | "end_user" | null,
  "investment_goal": "rental_yield" | "capital_appreciation" | null,
  "residence_type": "primary" | "holiday" | null,
  "property_type": string,
  "bedrooms": string,
  "preferred_areas": string,
  "market_preference": "off_plan" | "ready" | "both" | null,
  "handover_timeline": string,
  "must_have_features": string,
  "budget_aed": string,
  "finance_type": "cash" | "mortgage" | null,
  "mortgage_preapproved": boolean | null,
  "payment_plan_interest": boolean | null,
  "down_payment_pct": string,
  "timeline_to_buy": string,
  "viewed_properties": boolean | null,
  "other_brokers": boolean | null
}}

Conversation:
{conversation_text}

Return ONLY the JSON object, no explanation."""

    resp = cl.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1000,
        messages=[{"role": "user", "content": extraction_prompt}],
    )
    text = resp.content[0].text.strip()
    # Strip markdown code fences if present
    text = re.sub(r"^```json\s*|^```\s*|```$", "", text, flags=re.MULTILINE).strip()
    return json.loads(text)


def get_contextual_tip(question: str, step: str = "") -> str:
    """Answer a client question from the AI sidebar with Dubai property context."""
    cl = _get_client()
    system = (
        "You are Yaso, a friendly and expert Dubai real estate advisor at PROPIQ. "
        "Answer the client's question concisely (2-3 sentences max) with accurate, "
        "up-to-date Dubai real estate information. Be warm and helpful. "
        "Focus on facts: prices, yields, areas, regulations, payment plans."
    )
    resp = cl.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=200,
        system=system,
        messages=[{"role": "user", "content": question}],
    )
    return resp.content[0].text


def get_opening_message() -> str:
    return (
        "Hello! Welcome to PROPIQ. I'm Yaso, your personal property consultant. "
        "I'll guide you through a quick 5-minute chat to understand exactly what you're looking for, "
        "and then we'll prepare a tailored property profile for you.\n\n"
        "Let's start with the basics — could you share your full name and the best WhatsApp number to reach you on?"
    )
