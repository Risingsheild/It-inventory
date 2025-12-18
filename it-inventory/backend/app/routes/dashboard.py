from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List
from datetime import date
from io import StringIO
from app.database import get_db
from app.models import Asset, Employee, Repair, AssetType, AssetStatus, User
from app.schemas import DashboardStats, WarrantyAlert, CSVImportResult, AssetResponse
from app.auth import get_current_user, require_technician
from app.services.csv_service import csv_service
from app.services.warranty_service import warranty_service

router = APIRouter(tags=["Dashboard & Utilities"])


@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get dashboard statistics.
    """
    today = date.today()
    
    # Basic counts
    total = db.query(func.count(Asset.id)).scalar()
    active = db.query(func.count(Asset.id)).filter(Asset.status == AssetStatus.ACTIVE).scalar()
    available = db.query(func.count(Asset.id)).filter(Asset.status == AssetStatus.AVAILABLE).scalar()
    in_repair = db.query(func.count(Asset.id)).filter(Asset.status == AssetStatus.REPAIR).scalar()
    decommissioned = db.query(func.count(Asset.id)).filter(Asset.status == AssetStatus.DECOMMISSIONED).scalar()
    
    # Warranty counts (excluding decommissioned)
    active_assets = db.query(Asset).filter(
        and_(
            Asset.status != AssetStatus.DECOMMISSIONED,
            Asset.warranty_end.isnot(None)
        )
    ).all()
    
    warranties_30 = 0
    warranties_90 = 0
    warranties_expired = 0
    
    for asset in active_assets:
        days = (asset.warranty_end - today).days
        if days < 0:
            warranties_expired += 1
        elif days <= 30:
            warranties_30 += 1
        elif days <= 90:
            warranties_90 += 1
    
    # Total repair costs
    total_repair_costs = db.query(func.sum(Repair.cost)).scalar() or 0
    
    # Assets by type
    type_counts = db.query(
        Asset.asset_type,
        func.count(Asset.id)
    ).filter(
        Asset.status != AssetStatus.DECOMMISSIONED
    ).group_by(Asset.asset_type).all()
    
    assets_by_type = {t.value: count for t, count in type_counts}
    
    return DashboardStats(
        total_assets=total,
        active_assets=active,
        available_assets=available,
        in_repair=in_repair,
        decommissioned=decommissioned,
        warranties_expiring_30=warranties_30,
        warranties_expiring_90=warranties_90,
        warranties_expired=warranties_expired,
        total_repair_costs=float(total_repair_costs),
        assets_by_type=assets_by_type
    )


@router.get("/dashboard/warranty-alerts", response_model=List[WarrantyAlert])
async def get_warranty_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get assets with expiring or expired warranties.
    """
    today = date.today()
    
    assets = db.query(Asset).filter(
        and_(
            Asset.status != AssetStatus.DECOMMISSIONED,
            Asset.warranty_end.isnot(None)
        )
    ).all()
    
    alerts = []
    for asset in assets:
        days = (asset.warranty_end - today).days
        
        if days < 0:
            status_label = "expired"
        elif days <= 30:
            status_label = "critical"
        elif days <= 90:
            status_label = "warning"
        else:
            continue  # Skip assets with more than 90 days
        
        asset_response = AssetResponse.model_validate(asset)
        asset_response.repair_count = len(asset.repairs)
        asset_response.total_repair_cost = sum(r.cost for r in asset.repairs)
        
        alerts.append(WarrantyAlert(
            asset=asset_response,
            days_remaining=days,
            status=status_label
        ))
    
    # Sort by days remaining (most urgent first)
    alerts.sort(key=lambda x: x.days_remaining)
    
    return alerts


@router.get("/dashboard/recent-repairs")
async def get_recent_repairs(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get recent repair records.
    """
    repairs = db.query(Repair).order_by(Repair.repair_date.desc()).limit(limit).all()
    
    result = []
    for repair in repairs:
        result.append({
            "id": repair.id,
            "asset_id": repair.asset_id,
            "asset_tag": repair.asset.asset_tag,
            "asset_name": repair.asset.name,
            "asset_type": repair.asset.asset_type.value,
            "repair_date": repair.repair_date,
            "issue_description": repair.issue_description,
            "cost": repair.cost,
            "is_warranty_repair": repair.is_warranty_repair
        })
    
    return result


# CSV Import/Export routes
@router.get("/export/assets")
async def export_assets_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Export all assets to CSV.
    """
    csv_content = csv_service.export_assets(db)
    
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=assets_export_{date.today().isoformat()}.csv"
        }
    )


@router.get("/export/employees")
async def export_employees_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Export all employees to CSV.
    """
    csv_content = csv_service.export_employees(db)
    
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=employees_export_{date.today().isoformat()}.csv"
        }
    )


@router.get("/export/asset-template")
async def download_asset_template(
    current_user: User = Depends(get_current_user)
):
    """
    Download a blank CSV template for asset imports.
    """
    csv_content = csv_service.generate_asset_template()
    
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=asset_import_template.csv"
        }
    )


@router.post("/import/assets", response_model=CSVImportResult)
async def import_assets_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(require_technician),
    db: Session = Depends(get_db)
):
    """
    Import assets from CSV file.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV"
        )
    
    content = await file.read()
    try:
        csv_content = content.decode('utf-8')
    except UnicodeDecodeError:
        csv_content = content.decode('latin-1')
    
    success, errors_count, error_messages = csv_service.import_assets(db, csv_content)
    
    return CSVImportResult(
        success_count=success,
        error_count=errors_count,
        errors=error_messages
    )


@router.post("/import/employees", response_model=CSVImportResult)
async def import_employees_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(require_technician),
    db: Session = Depends(get_db)
):
    """
    Import employees from CSV file.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV"
        )
    
    content = await file.read()
    try:
        csv_content = content.decode('utf-8')
    except UnicodeDecodeError:
        csv_content = content.decode('latin-1')
    
    success, errors_count, error_messages = csv_service.import_employees(db, csv_content)
    
    return CSVImportResult(
        success_count=success,
        error_count=errors_count,
        errors=error_messages
    )


# Manual warranty check trigger (for testing)
@router.post("/warranty-check/trigger")
async def trigger_warranty_check(
    current_user: User = Depends(require_technician)
):
    """
    Manually trigger warranty notification check (for testing).
    """
    await warranty_service.check_and_send_warranty_alerts()
    return {"message": "Warranty check triggered"}
