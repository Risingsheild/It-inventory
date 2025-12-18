from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Text, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class AssetType(str, enum.Enum):
    LAPTOP = "laptop"
    MONITOR = "monitor"
    DOCK = "dock"
    HEADSET = "headset"
    CAMERA = "camera"
    KEYBOARD = "keyboard"
    MOUSE = "mouse"
    OTHER = "other"


class AssetStatus(str, enum.Enum):
    ACTIVE = "active"
    AVAILABLE = "available"
    REPAIR = "repair"
    DECOMMISSIONED = "decommissioned"


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    TECHNICIAN = "technician"
    VIEWER = "viewer"


class User(Base):
    """IT Staff users who can log into the system."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.VIEWER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    audit_logs = relationship("AuditLog", back_populates="user")


class Employee(Base):
    """Employees who receive IT equipment."""
    __tablename__ = "employees"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(50), unique=True, index=True)  # Company employee ID
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    department = Column(String(100))
    location = Column(String(100))
    manager = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    assets = relationship("Asset", back_populates="assigned_employee")


class Asset(Base):
    """IT Assets (laptops, monitors, docks, etc.)."""
    __tablename__ = "assets"
    
    id = Column(Integer, primary_key=True, index=True)
    asset_tag = Column(String(50), unique=True, index=True, nullable=False)  # e.g., LAP-001
    asset_type = Column(SQLEnum(AssetType), nullable=False)
    name = Column(String(255), nullable=False)  # e.g., "Dell Latitude 5540"
    manufacturer = Column(String(100))
    model = Column(String(100))
    serial_number = Column(String(255), unique=True, index=True)
    
    # Purchase & Warranty
    purchase_date = Column(Date)
    purchase_price = Column(Float)
    warranty_end = Column(Date)
    vendor = Column(String(255))
    po_number = Column(String(100))  # Purchase order number
    
    # Assignment
    status = Column(SQLEnum(AssetStatus), default=AssetStatus.AVAILABLE)
    assigned_to = Column(Integer, ForeignKey("employees.id"), nullable=True)
    assigned_date = Column(Date, nullable=True)
    
    # Decommission
    decommission_date = Column(Date, nullable=True)
    decommission_reason = Column(Text, nullable=True)
    
    # Metadata
    notes = Column(Text)
    location = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    assigned_employee = relationship("Employee", back_populates="assets")
    repairs = relationship("Repair", back_populates="asset", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="asset")


class Repair(Base):
    """Repair history for assets."""
    __tablename__ = "repairs"
    
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    
    repair_date = Column(Date, nullable=False)
    issue_description = Column(Text, nullable=False)
    resolution = Column(Text)
    cost = Column(Float, default=0)
    is_warranty_repair = Column(Boolean, default=False)
    vendor = Column(String(255))
    ticket_number = Column(String(100))  # Internal ticket reference
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    asset = relationship("Asset", back_populates="repairs")


class AuditLog(Base):
    """Audit trail for all changes."""
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True)
    
    action = Column(String(50), nullable=False)  # CREATE, UPDATE, DELETE, ASSIGN, etc.
    entity_type = Column(String(50), nullable=False)  # asset, employee, repair
    entity_id = Column(Integer)
    changes = Column(Text)  # JSON of what changed
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
    asset = relationship("Asset", back_populates="audit_logs")


class WarrantyNotification(Base):
    """Track sent warranty notifications to avoid duplicates."""
    __tablename__ = "warranty_notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    notification_type = Column(String(50))  # 90_day, 30_day, expired
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
