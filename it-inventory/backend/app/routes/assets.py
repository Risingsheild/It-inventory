from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_
from typing import List, Optional
from datetime import date
from app.database import get_db
from app.models import Asset, Employee, Repair, AssetType, AssetStatus, AuditLog
from app.schemas import (
    AssetCreate, AssetUpdate, AssetResponse, AssetDetail,
    AssetAssign, AssetDecommission, RepairCreate, RepairResponse
)
from app.auth import get_current_user, require_technician
from app.models import User
from app.services.email_service import email_service
import json

router = APIRouter(prefix="/assets", tags=["Assets"])


def generate_asset_tag(db: Session, asset_type: AssetType) -> str:
    """Generate a unique asset tag based on type."""
    prefix_map = {
        AssetType.LAPTOP: "LAP",
        AssetType.MONITOR: "MON",
        AssetType.DOCK: "DCK",
        AssetType.HEADSET: "HEAD",
        AssetType.CAMERA: "CAM",
        AssetType.KEYBOARD: "KEY",
        AssetType.MOUSE: "MOU",
        AssetType.OTHER: "OTH"
    }
    prefix = prefix_map.get(asset_type, "AST")
    
    # Find the highest existing number for this prefix
    last_asset = db.query(Asset).filter(
        Asset.asset_tag.like(f"{prefix}-%")
    ).order_by(Asset.id.desc()).first()
    
    if last_asset:
        try:
            last_num = int(last_asset.asset_tag.split('-')[1])
            new_num = last_num + 1
        except (IndexError, ValueError):
            new_num = 1
    else:
        new_num = 1
    
    return f"{prefix}-{new_num:03d}"


def log_action(db: Session, user_id: int, action: str, entity_type: str, entity_id: int, changes: dict = None, asset_id: int = None):
    """Create an audit log entry."""
    log = AuditLog(
        user_id=user_id,
        asset_id=asset_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        changes=json.dumps(changes) if changes else None
    )
    db.add(log)


@router.get("", response_model=List[AssetResponse])
async def list_assets(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    asset_type: Optional[AssetType] = None,
    status: Optional[AssetStatus] = None,
    search: Optional[str] = None,
    assigned: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all assets with optional filters.
    """
    query = db.query(Asset)
    
    if asset_type:
        query = query.filter(Asset.asset_type == asset_type)
    
    if status:
        query = query.filter(Asset.status == status)
    
    if assigned is not None:
        if assigned:
            query = query.filter(Asset.assigned_to.isnot(None))
        else:
            query = query.filter(Asset.assigned_to.is_(None))
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Asset.asset_tag.ilike(search_term),
                Asset.name.ilike(search_term),
                Asset.serial_number.ilike(search_term),
                Asset.manufacturer.ilike(search_term),
                Asset.model.ilike(search_term)
            )
        )
    
    assets = query.offset(skip).limit(limit).all()
    
    # Add computed fields
    result = []
    for asset in assets:
        asset_dict = AssetResponse.model_validate(asset).model_dump()
        asset_dict['repair_count'] = len(asset.repairs)
        asset_dict['total_repair_cost'] = sum(r.cost for r in asset.repairs)
        result.append(AssetResponse(**asset_dict))
    
    return result


@router.get("/{asset_id}", response_model=AssetDetail)
async def get_asset(
    asset_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific asset.
    """
    asset = db.query(Asset).options(
        joinedload(Asset.assigned_employee),
        joinedload(Asset.repairs)
    ).filter(Asset.id == asset_id).first()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    return asset


@router.post("", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def create_asset(
    asset_data: AssetCreate,
    current_user: User = Depends(require_technician),
    db: Session = Depends(get_db)
):
    """
    Create a new asset.
    """
    # Check for duplicate serial number
    if asset_data.serial_number:
        existing = db.query(Asset).filter(
            Asset.serial_number == asset_data.serial_number
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Serial number already exists (Asset: {existing.asset_tag})"
            )
    
    # Generate asset tag if not provided
    asset_tag = asset_data.asset_tag or generate_asset_tag(db, asset_data.asset_type)
    
    # Check if asset tag already exists
    if db.query(Asset).filter(Asset.asset_tag == asset_tag).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Asset tag already exists"
        )
    
    asset = Asset(
        asset_tag=asset_tag,
        asset_type=asset_data.asset_type,
        name=asset_data.name,
        manufacturer=asset_data.manufacturer,
        model=asset_data.model,
        serial_number=asset_data.serial_number,
        purchase_date=asset_data.purchase_date,
        purchase_price=asset_data.purchase_price,
        warranty_end=asset_data.warranty_end,
        vendor=asset_data.vendor,
        po_number=asset_data.po_number,
        notes=asset_data.notes,
        location=asset_data.location,
        status=AssetStatus.AVAILABLE
    )
    
    db.add(asset)
    db.commit()
    db.refresh(asset)
    
    # Log action
    log_action(db, current_user.id, "CREATE", "asset", asset.id, asset_data.model_dump(), asset.id)
    db.commit()
    
    return asset


@router.put("/{asset_id}", response_model=AssetResponse)
async def update_asset(
    asset_id: int,
    update_data: AssetUpdate,
    current_user: User = Depends(require_technician),
    db: Session = Depends(get_db)
):
    """
    Update an asset's information.
    """
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    # Track changes
    changes = {}
    update_dict = update_data.model_dump(exclude_unset=True)
    
    for field, value in update_dict.items():
        old_value = getattr(asset, field)
        if old_value != value:
            changes[field] = {"old": str(old_value), "new": str(value)}
            setattr(asset, field, value)
    
    if changes:
        log_action(db, current_user.id, "UPDATE", "asset", asset.id, changes, asset.id)
    
    db.commit()
    db.refresh(asset)
    
    return asset


@router.post("/{asset_id}/assign", response_model=AssetResponse)
async def assign_asset(
    asset_id: int,
    assignment: AssetAssign,
    current_user: User = Depends(require_technician),
    db: Session = Depends(get_db)
):
    """
    Assign or unassign an asset to/from an employee.
    """
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    if asset.status == AssetStatus.DECOMMISSIONED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign decommissioned asset"
        )
    
    old_employee_id = asset.assigned_to
    
    if assignment.employee_id:
        # Assign to employee
        employee = db.query(Employee).filter(Employee.id == assignment.employee_id).first()
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found"
            )
        
        asset.assigned_to = employee.id
        asset.assigned_date = date.today()
        asset.status = AssetStatus.ACTIVE
        
        # Send notification email to employee
        await email_service.send_assignment_notification(
            employee.email,
            employee.full_name,
            {
                'name': asset.name,
                'asset_tag': asset.asset_tag,
                'asset_type': asset.asset_type.value,
                'serial_number': asset.serial_number
            },
            date.today()
        )
    else:
        # Unassign
        asset.assigned_to = None
        asset.assigned_date = None
        asset.status = AssetStatus.AVAILABLE
    
    log_action(
        db, current_user.id, "ASSIGN", "asset", asset.id,
        {"old_employee_id": old_employee_id, "new_employee_id": assignment.employee_id},
        asset.id
    )
    
    db.commit()
    db.refresh(asset)
    
    return asset


@router.post("/{asset_id}/decommission", response_model=AssetResponse)
async def decommission_asset(
    asset_id: int,
    decommission_data: AssetDecommission,
    current_user: User = Depends(require_technician),
    db: Session = Depends(get_db)
):
    """
    Decommission an asset.
    """
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    if asset.status == AssetStatus.DECOMMISSIONED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Asset is already decommissioned"
        )
    
    asset.status = AssetStatus.DECOMMISSIONED
    asset.decommission_date = date.today()
    asset.decommission_reason = decommission_data.reason
    asset.assigned_to = None
    asset.assigned_date = None
    
    log_action(
        db, current_user.id, "DECOMMISSION", "asset", asset.id,
        {"reason": decommission_data.reason},
        asset.id
    )
    
    db.commit()
    db.refresh(asset)
    
    return asset


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(
    asset_id: int,
    current_user: User = Depends(require_technician),
    db: Session = Depends(get_db)
):
    """
    Permanently delete an asset (use with caution - prefer decommission).
    """
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    log_action(db, current_user.id, "DELETE", "asset", asset.id, {"asset_tag": asset.asset_tag})
    
    db.delete(asset)
    db.commit()


# Repair routes (nested under assets)
@router.get("/{asset_id}/repairs", response_model=List[RepairResponse])
async def list_asset_repairs(
    asset_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all repairs for a specific asset.
    """
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    return asset.repairs


@router.post("/{asset_id}/repairs", response_model=RepairResponse, status_code=status.HTTP_201_CREATED)
async def add_repair(
    asset_id: int,
    repair_data: RepairCreate,
    current_user: User = Depends(require_technician),
    db: Session = Depends(get_db)
):
    """
    Add a repair record to an asset.
    """
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    repair = Repair(
        asset_id=asset_id,
        repair_date=repair_data.repair_date,
        issue_description=repair_data.issue_description,
        resolution=repair_data.resolution,
        cost=repair_data.cost,
        is_warranty_repair=repair_data.is_warranty_repair,
        vendor=repair_data.vendor,
        ticket_number=repair_data.ticket_number
    )
    
    db.add(repair)
    
    # Optionally set asset to repair status
    if asset.status != AssetStatus.DECOMMISSIONED:
        asset.status = AssetStatus.REPAIR
    
    log_action(
        db, current_user.id, "CREATE", "repair", repair.id,
        repair_data.model_dump(),
        asset.id
    )
    
    db.commit()
    db.refresh(repair)
    
    return repair


@router.post("/{asset_id}/mark-fixed", response_model=AssetResponse)
async def mark_asset_fixed(
    asset_id: int,
    current_user: User = Depends(require_technician),
    db: Session = Depends(get_db)
):
    """
    Mark an asset as fixed (change status from repair to active/available).
    """
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    if asset.status != AssetStatus.REPAIR:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Asset is not in repair status"
        )
    
    asset.status = AssetStatus.ACTIVE if asset.assigned_to else AssetStatus.AVAILABLE
    
    log_action(db, current_user.id, "MARK_FIXED", "asset", asset.id, asset_id=asset.id)
    
    db.commit()
    db.refresh(asset)
    
    return asset
