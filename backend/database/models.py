from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Text, Boolean, Date
)
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class SecondaryListing(Base):
    """Listings from Bayut and PropertyFinder (ready/secondary market)."""
    __tablename__ = "secondary_listings"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Identity
    listing_id = Column(String(100), unique=True, nullable=False, index=True)
    source = Column(String(50), nullable=False)          # "bayut" | "propertyfinder"
    listing_url = Column(Text, nullable=False)

    # Core details
    title = Column(Text)
    price_aed = Column(Float)
    size_sqft = Column(Float)
    bedrooms = Column(String(20))                        # "Studio", "1", "2", …
    bathrooms = Column(String(20))
    property_type = Column(String(50))                   # apartment / villa / townhouse
    furnishing_status = Column(String(50))               # furnished / unfurnished / partly

    # Location
    floor_number = Column(String(20))
    building_name = Column(String(200))
    community = Column(String(200))
    area = Column(String(200))
    emirate = Column(String(100), default="Dubai")

    # Agent / Agency
    agent_name = Column(String(200))
    agency_name = Column(String(200))

    # Listing timing
    listing_date = Column(Date)
    days_on_market = Column(Integer)

    # Metadata
    scrape_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=True)

    def __repr__(self):
        return (
            f"<SecondaryListing id={self.listing_id} "
            f"source={self.source} price={self.price_aed}>"
        )


class OffPlanListing(Base):
    """Off-plan project listings from Reelly."""
    __tablename__ = "offplan_listings"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Identity
    listing_url = Column(Text, nullable=False, unique=True)
    source = Column(String(50), default="reelly")

    # Project info
    project_name = Column(String(300))
    developer_name = Column(String(200))
    launch_date = Column(Date)
    handover_year = Column(Integer)
    completion_percentage = Column(Float)

    # Pricing & units
    starting_price_aed = Column(Float)
    unit_types_available = Column(Text)
    payment_plan_details = Column(Text)
    completion_date_text = Column(String(50))            # e.g. "Q4 2027"
    sale_status = Column(String(50))                     # "On sale" | "Out of stock" | "Presale"
    cover_image_url = Column(Text)
    max_commission = Column(Integer)
    detail_json = Column(Text)
    detail_fetched_at = Column(Integer)

    # Location
    community = Column(String(200))
    area = Column(String(200))
    emirate = Column(String(100), default="Dubai")

    # Metadata
    scrape_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=True)

    def __repr__(self):
        return (
            f"<OffPlanListing project={self.project_name} "
            f"developer={self.developer_name}>"
        )


class ClientIntake(Base):
    """A single client intake session (one conversation)."""
    __tablename__ = "client_intakes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed = Column(Boolean, default=False)

    # Extracted client details (populated as conversation progresses)
    client_name = Column(String(200))
    client_phone = Column(String(50))
    client_email = Column(String(200))
    client_nationality = Column(String(100))
    client_location = Column(String(200))
    purchase_purpose = Column(String(50))        # investment | end_user
    investment_goal = Column(String(100))        # rental_yield | capital_appreciation
    residence_type = Column(String(100))         # primary | holiday
    property_type = Column(String(200))
    bedrooms = Column(String(100))
    preferred_areas = Column(Text)
    market_preference = Column(String(50))       # off_plan | ready | both
    handover_timeline = Column(String(200))
    must_have_features = Column(Text)
    budget_aed = Column(String(200))
    finance_type = Column(String(50))            # cash | mortgage
    mortgage_preapproved = Column(Boolean)
    payment_plan_interest = Column(Boolean)
    down_payment_pct = Column(String(50))
    timeline_to_buy = Column(String(200))
    viewed_properties = Column(Boolean)
    other_brokers = Column(Boolean)

    # Full conversation stored as JSON
    messages_json = Column(Text, default="[]")


class ClientIntakeForm(Base):
    """Multi-step form-based client intake (new interactive UI)."""
    __tablename__ = "client_intake_forms"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed = Column(Boolean, default=False)
    language = Column(String(10), default='en')

    form_data_json = Column(Text)

    # Key searchable fields
    client_name = Column(String(200))
    client_phone = Column(String(50))
    client_email = Column(String(200))
    client_nationality = Column(String(100))
    purchase_purpose = Column(String(50))
    bedrooms = Column(String(50))
    budget_min = Column(Integer)
    budget_max = Column(Integer)
    market_preference = Column(String(50))
    payment_method = Column(String(50))


class ScrapeLog(Base):
    """Audit trail for every scrape run."""
    __tablename__ = "scrape_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source = Column(String(50), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime)
    listings_found = Column(Integer, default=0)
    listings_new = Column(Integer, default=0)
    listings_updated = Column(Integer, default=0)
    status = Column(String(20), default="running")       # running / success / error
    error_message = Column(Text)
