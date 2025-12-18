from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import List, Optional
from app.database import get_db
from app.models import Employee, Asset, User
from app.schemas import (
    EmployeeCreate, EmployeeUpdate, EmployeeResponse, EmployeeWithAssets
)
from app.auth import get_current_user, require_technician

router = APIRouter(prefix="/employees", tags=["Employees"])


@router.get("", response_model=List[EmployeeResponse])
async def list_employees(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = None,
    active_only: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all employees with optional filters.
    """
    query = db.query(Employee)
    
    if active_only:
        query = query.filter(Employee.is_active == True)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Employee.full_name.ilike(search_term),
                Employee.email.ilike(search_term),
                Employee.employee_id.ilike(search_term),
                Employee.department.ilike(search_term)
            )
        )
    
    return query.offset(skip).limit(limit).all()


@router.get("/{employee_id}", response_model=EmployeeWithAssets)
async def get_employee(
    employee_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific employee including assigned assets.
    """
    employee = db.query(Employee).options(
        joinedload(Employee.assets)
    ).filter(Employee.id == employee_id).first()
    
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    return employee


@router.post("", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    employee_data: EmployeeCreate,
    current_user: User = Depends(require_technician),
    db: Session = Depends(get_db)
):
    """
    Create a new employee.
    """
    # Check for duplicate email
    existing = db.query(Employee).filter(
        Employee.email == employee_data.email.lower()
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee with this email already exists"
        )
    
    # Check for duplicate employee ID if provided
    if employee_data.employee_id:
        existing_id = db.query(Employee).filter(
            Employee.employee_id == employee_data.employee_id
        ).first()
        if existing_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employee ID already exists"
            )
    
    employee = Employee(
        employee_id=employee_data.employee_id,
        email=employee_data.email.lower(),
        full_name=employee_data.full_name,
        department=employee_data.department,
        location=employee_data.location,
        manager=employee_data.manager
    )
    
    db.add(employee)
    db.commit()
    db.refresh(employee)
    
    return employee


@router.put("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: int,
    update_data: EmployeeUpdate,
    current_user: User = Depends(require_technician),
    db: Session = Depends(get_db)
):
    """
    Update an employee's information.
    """
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    update_dict = update_data.model_dump(exclude_unset=True)
    
    # Check for duplicate email if updating
    if 'email' in update_dict:
        existing = db.query(Employee).filter(
            Employee.email == update_dict['email'].lower(),
            Employee.id != employee_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use by another employee"
            )
        update_dict['email'] = update_dict['email'].lower()
    
    for field, value in update_dict.items():
        setattr(employee, field, value)
    
    db.commit()
    db.refresh(employee)
    
    return employee


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_employee(
    employee_id: int,
    current_user: User = Depends(require_technician),
    db: Session = Depends(get_db)
):
    """
    Deactivate an employee (soft delete). Assets will be unassigned.
    """
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    # Unassign all assets from this employee
    db.query(Asset).filter(Asset.assigned_to == employee_id).update({
        "assigned_to": None,
        "assigned_date": None,
        "status": "available"
    })
    
    # Soft delete
    employee.is_active = False
    
    db.commit()


@router.get("/{employee_id}/assets", response_model=List)
async def get_employee_assets(
    employee_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all assets assigned to an employee.
    """
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    assets = db.query(Asset).filter(Asset.assigned_to == employee_id).all()
    return assets
