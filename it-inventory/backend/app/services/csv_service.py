import pandas as pd
from io import StringIO, BytesIO
from typing import List, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import Asset, Employee, AssetType, AssetStatus
import logging

logger = logging.getLogger(__name__)


class CSVService:
    """Service for importing and exporting CSV data."""
    
    # Asset CSV columns mapping
    ASSET_COLUMNS = {
        'asset_tag': 'Asset Tag',
        'asset_type': 'Type',
        'name': 'Name',
        'manufacturer': 'Manufacturer',
        'model': 'Model',
        'serial_number': 'Serial Number',
        'purchase_date': 'Purchase Date',
        'purchase_price': 'Purchase Price',
        'warranty_end': 'Warranty End',
        'vendor': 'Vendor',
        'po_number': 'PO Number',
        'status': 'Status',
        'assigned_to_name': 'Assigned To',
        'assigned_date': 'Assigned Date',
        'location': 'Location',
        'notes': 'Notes',
        'decommission_date': 'Decommission Date',
        'decommission_reason': 'Decommission Reason'
    }
    
    EMPLOYEE_COLUMNS = {
        'employee_id': 'Employee ID',
        'email': 'Email',
        'full_name': 'Full Name',
        'department': 'Department',
        'location': 'Location',
        'manager': 'Manager'
    }
    
    @staticmethod
    def export_assets(db: Session) -> str:
        """Export all assets to CSV string."""
        assets = db.query(Asset).all()
        
        data = []
        for asset in assets:
            employee_name = None
            if asset.assigned_employee:
                employee_name = asset.assigned_employee.full_name
            
            data.append({
                'Asset Tag': asset.asset_tag,
                'Type': asset.asset_type.value if asset.asset_type else '',
                'Name': asset.name,
                'Manufacturer': asset.manufacturer or '',
                'Model': asset.model or '',
                'Serial Number': asset.serial_number or '',
                'Purchase Date': asset.purchase_date.isoformat() if asset.purchase_date else '',
                'Purchase Price': asset.purchase_price or '',
                'Warranty End': asset.warranty_end.isoformat() if asset.warranty_end else '',
                'Vendor': asset.vendor or '',
                'PO Number': asset.po_number or '',
                'Status': asset.status.value if asset.status else '',
                'Assigned To': employee_name or '',
                'Assigned Date': asset.assigned_date.isoformat() if asset.assigned_date else '',
                'Location': asset.location or '',
                'Notes': asset.notes or '',
                'Decommission Date': asset.decommission_date.isoformat() if asset.decommission_date else '',
                'Decommission Reason': asset.decommission_reason or ''
            })
        
        df = pd.DataFrame(data)
        return df.to_csv(index=False)
    
    @staticmethod
    def export_employees(db: Session) -> str:
        """Export all employees to CSV string."""
        employees = db.query(Employee).all()
        
        data = []
        for emp in employees:
            data.append({
                'Employee ID': emp.employee_id or '',
                'Email': emp.email,
                'Full Name': emp.full_name,
                'Department': emp.department or '',
                'Location': emp.location or '',
                'Manager': emp.manager or '',
                'Active': 'Yes' if emp.is_active else 'No'
            })
        
        df = pd.DataFrame(data)
        return df.to_csv(index=False)
    
    @staticmethod
    def generate_asset_template() -> str:
        """Generate a blank CSV template for asset imports."""
        columns = [
            'Type*', 'Name*', 'Manufacturer', 'Model', 'Serial Number*',
            'Purchase Date', 'Purchase Price', 'Warranty End', 'Vendor',
            'PO Number', 'Location', 'Notes'
        ]
        df = pd.DataFrame(columns=columns)
        
        # Add example row
        example = pd.DataFrame([{
            'Type*': 'laptop',
            'Name*': 'Dell Latitude 5540',
            'Manufacturer': 'Dell',
            'Model': 'Latitude 5540',
            'Serial Number*': 'ABC123XYZ',
            'Purchase Date': '2024-01-15',
            'Purchase Price': '1299.99',
            'Warranty End': '2027-01-15',
            'Vendor': 'Dell Direct',
            'PO Number': 'PO-2024-001',
            'Location': 'Main Office',
            'Notes': 'Standard config'
        }])
        
        df = pd.concat([df, example], ignore_index=True)
        return df.to_csv(index=False)
    
    @staticmethod
    def import_assets(db: Session, csv_content: str) -> Tuple[int, int, List[str]]:
        """
        Import assets from CSV content.
        Returns: (success_count, error_count, error_messages)
        """
        success_count = 0
        error_count = 0
        errors = []
        
        try:
            df = pd.read_csv(StringIO(csv_content))
        except Exception as e:
            return 0, 1, [f"Failed to parse CSV: {str(e)}"]
        
        # Normalize column names
        df.columns = df.columns.str.strip().str.lower().str.replace('*', '').str.replace(' ', '_')
        
        # Type mapping
        type_mapping = {
            'laptop': AssetType.LAPTOP,
            'monitor': AssetType.MONITOR,
            'dock': AssetType.DOCK,
            'headset': AssetType.HEADSET,
            'camera': AssetType.CAMERA,
            'keyboard': AssetType.KEYBOARD,
            'mouse': AssetType.MOUSE,
            'other': AssetType.OTHER
        }
        
        for idx, row in df.iterrows():
            row_num = idx + 2  # Account for header and 0-indexing
            
            try:
                # Validate required fields
                if pd.isna(row.get('type')) or pd.isna(row.get('name')):
                    errors.append(f"Row {row_num}: Missing required field (Type or Name)")
                    error_count += 1
                    continue
                
                # Parse asset type
                asset_type_str = str(row['type']).lower().strip()
                if asset_type_str not in type_mapping:
                    errors.append(f"Row {row_num}: Invalid asset type '{row['type']}'. Must be one of: {', '.join(type_mapping.keys())}")
                    error_count += 1
                    continue
                
                # Check for duplicate serial number
                serial = row.get('serial_number')
                if pd.notna(serial) and serial:
                    existing = db.query(Asset).filter(Asset.serial_number == str(serial)).first()
                    if existing:
                        errors.append(f"Row {row_num}: Serial number '{serial}' already exists (Asset: {existing.asset_tag})")
                        error_count += 1
                        continue
                
                # Generate asset tag
                type_prefix = asset_type_str[:3].upper()
                last_asset = db.query(Asset).filter(
                    Asset.asset_tag.like(f"{type_prefix}-%")
                ).order_by(Asset.id.desc()).first()
                
                if last_asset:
                    try:
                        last_num = int(last_asset.asset_tag.split('-')[1])
                        new_num = last_num + 1
                    except (IndexError, ValueError):
                        new_num = 1
                else:
                    new_num = 1
                
                asset_tag = f"{type_prefix}-{new_num:03d}"
                
                # Parse dates
                purchase_date = None
                if pd.notna(row.get('purchase_date')):
                    try:
                        purchase_date = pd.to_datetime(row['purchase_date']).date()
                    except:
                        pass
                
                warranty_end = None
                if pd.notna(row.get('warranty_end')):
                    try:
                        warranty_end = pd.to_datetime(row['warranty_end']).date()
                    except:
                        pass
                
                # Parse price
                purchase_price = None
                if pd.notna(row.get('purchase_price')):
                    try:
                        purchase_price = float(row['purchase_price'])
                    except:
                        pass
                
                # Create asset
                asset = Asset(
                    asset_tag=asset_tag,
                    asset_type=type_mapping[asset_type_str],
                    name=str(row['name']).strip(),
                    manufacturer=str(row.get('manufacturer', '')).strip() if pd.notna(row.get('manufacturer')) else None,
                    model=str(row.get('model', '')).strip() if pd.notna(row.get('model')) else None,
                    serial_number=str(serial).strip() if pd.notna(serial) else None,
                    purchase_date=purchase_date,
                    purchase_price=purchase_price,
                    warranty_end=warranty_end,
                    vendor=str(row.get('vendor', '')).strip() if pd.notna(row.get('vendor')) else None,
                    po_number=str(row.get('po_number', '')).strip() if pd.notna(row.get('po_number')) else None,
                    location=str(row.get('location', '')).strip() if pd.notna(row.get('location')) else None,
                    notes=str(row.get('notes', '')).strip() if pd.notna(row.get('notes')) else None,
                    status=AssetStatus.AVAILABLE
                )
                
                db.add(asset)
                success_count += 1
                
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
                error_count += 1
        
        if success_count > 0:
            db.commit()
        
        return success_count, error_count, errors
    
    @staticmethod
    def import_employees(db: Session, csv_content: str) -> Tuple[int, int, List[str]]:
        """
        Import employees from CSV content.
        Returns: (success_count, error_count, error_messages)
        """
        success_count = 0
        error_count = 0
        errors = []
        
        try:
            df = pd.read_csv(StringIO(csv_content))
        except Exception as e:
            return 0, 1, [f"Failed to parse CSV: {str(e)}"]
        
        # Normalize column names
        df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')
        
        for idx, row in df.iterrows():
            row_num = idx + 2
            
            try:
                # Validate required fields
                if pd.isna(row.get('email')) or pd.isna(row.get('full_name')):
                    errors.append(f"Row {row_num}: Missing required field (Email or Full Name)")
                    error_count += 1
                    continue
                
                email = str(row['email']).strip().lower()
                
                # Check for existing employee
                existing = db.query(Employee).filter(Employee.email == email).first()
                if existing:
                    errors.append(f"Row {row_num}: Employee with email '{email}' already exists")
                    error_count += 1
                    continue
                
                # Generate employee ID if not provided
                emp_id = None
                if pd.notna(row.get('employee_id')):
                    emp_id = str(row['employee_id']).strip()
                
                employee = Employee(
                    employee_id=emp_id,
                    email=email,
                    full_name=str(row['full_name']).strip(),
                    department=str(row.get('department', '')).strip() if pd.notna(row.get('department')) else None,
                    location=str(row.get('location', '')).strip() if pd.notna(row.get('location')) else None,
                    manager=str(row.get('manager', '')).strip() if pd.notna(row.get('manager')) else None
                )
                
                db.add(employee)
                success_count += 1
                
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
                error_count += 1
        
        if success_count > 0:
            db.commit()
        
        return success_count, error_count, errors


csv_service = CSVService()
