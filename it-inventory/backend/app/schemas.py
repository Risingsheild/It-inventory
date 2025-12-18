from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import date, datetime
from app.models import AssetType, AssetStatus, UserRole


# ============== User Schemas ==============

class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: str
    role: UserRole = UserRole.VIEWER


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None


# ============== Employee Schemas ==============

class EmployeeBase(BaseModel):
    employee_id: Optional[str] = None
    email: EmailStr
    full_name: str
    department: Optional[str] = None
    location: Optional[str] = None
    manager: Optional[str] = None


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    manager: Optional[str] = None
    is_active: Optional[bool] = None


class EmployeeResponse(EmployeeBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class EmployeeWithAssets(EmployeeResponse):
    assets: List["AssetResponse"] = []


# ============== Repair Schemas ==============

class RepairBase(BaseModel):
    repair_date: date
    issue_description: str
    resolution: Optional[str] = None
    cost: float = 0
    is_warranty_repair: bool = False
    vendor: Optional[str] = None
    ticket_number: Optional[str] = None


class RepairCreate(RepairBase):
    asset_id: int


class RepairResponse(RepairBase):
    id: int
    asset_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============== Asset Schemas ==============

class AssetBase(BaseModel):
    asset_type: AssetType
    name: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = None
    warranty_end: Optional[date] = None
    vendor: Optional[str] = None
    po_number: Optional[str] = None
    notes: Optional[str] = None
    location: Optional[str] = None


class AssetCreate(AssetBase):
    asset_tag: Optional[str] = None  # Auto-generated if not provided


class AssetUpdate(BaseModel):
    asset_type: Optional[AssetType] = None
    name: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = None
    warranty_end: Optional[date] = None
    vendor: Optional[str] = None
    po_number: Optional[str] = None
    notes: Optional[str] = None
    location: Optional[str] = None
    status: Optional[AssetStatus] = None


class AssetAssign(BaseModel):
    employee_id: Optional[int] = None  # None to unassign


class AssetDecommission(BaseModel):
    reason: str = Field(..., min_length=10)


class AssetResponse(AssetBase):
    id: int
    asset_tag: str
    status: AssetStatus
    assigned_to: Optional[int] = None
    assigned_date: Optional[date] = None
    decommission_date: Optional[date] = None
    decommission_reason: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    repair_count: int = 0
    total_repair_cost: float = 0
    
    class Config:
        from_attributes = True


class AssetDetail(AssetResponse):
    assigned_employee: Optional[EmployeeResponse] = None
    repairs: List[RepairResponse] = []


# ============== Dashboard Schemas ==============

class DashboardStats(BaseModel):
    total_assets: int
    active_assets: int
    available_assets: int
    in_repair: int
    decommissioned: int
    warranties_expiring_30: int
    warranties_expiring_90: int
    warranties_expired: int
    total_repair_costs: float
    assets_by_type: dict


class WarrantyAlert(BaseModel):
    asset: AssetResponse
    days_remaining: int
    status: str  # critical, warning, expired


# ============== CSV Import/Export ==============

class CSVImportResult(BaseModel):
    success_count: int
    error_count: int
    errors: List[str]


# Update forward references
EmployeeWithAssets.model_rebuild()
