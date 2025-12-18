from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models import Asset, AssetStatus, WarrantyNotification, User, UserRole
from app.services.email_service import email_service
from app.database import SessionLocal
import logging

logger = logging.getLogger(__name__)


class WarrantyNotificationService:
    """Service for checking and sending warranty expiration notifications."""
    
    @staticmethod
    def get_admin_emails(db: Session) -> list[str]:
        """Get all admin user emails for notifications."""
        admins = db.query(User).filter(
            and_(
                User.role.in_([UserRole.ADMIN, UserRole.TECHNICIAN]),
                User.is_active == True
            )
        ).all()
        return [admin.email for admin in admins]
    
    @staticmethod
    def check_warranty_already_notified(
        db: Session,
        asset_id: int,
        notification_type: str,
        days_lookback: int = 7
    ) -> bool:
        """Check if a warranty notification was already sent recently."""
        cutoff = datetime.utcnow() - timedelta(days=days_lookback)
        existing = db.query(WarrantyNotification).filter(
            and_(
                WarrantyNotification.asset_id == asset_id,
                WarrantyNotification.notification_type == notification_type,
                WarrantyNotification.sent_at >= cutoff
            )
        ).first()
        return existing is not None
    
    @staticmethod
    def record_notification(db: Session, asset_id: int, notification_type: str):
        """Record that a notification was sent."""
        notification = WarrantyNotification(
            asset_id=asset_id,
            notification_type=notification_type
        )
        db.add(notification)
        db.commit()
    
    @staticmethod
    async def check_and_send_warranty_alerts():
        """
        Check for expiring warranties and send email alerts.
        Should be run daily via scheduler.
        """
        db = SessionLocal()
        try:
            today = date.today()
            
            # Get assets with active warranties (not decommissioned)
            assets = db.query(Asset).filter(
                and_(
                    Asset.status != AssetStatus.DECOMMISSIONED,
                    Asset.warranty_end.isnot(None)
                )
            ).all()
            
            expiring_90 = []
            expiring_30 = []
            expired = []
            
            for asset in assets:
                days_remaining = (asset.warranty_end - today).days
                
                asset_data = {
                    'asset_tag': asset.asset_tag,
                    'name': asset.name,
                    'serial_number': asset.serial_number,
                    'warranty_end': asset.warranty_end.isoformat(),
                    'days_remaining': days_remaining,
                    'assigned_to': asset.assigned_employee.full_name if asset.assigned_employee else None
                }
                
                if days_remaining < 0:
                    # Expired
                    if not WarrantyNotificationService.check_warranty_already_notified(
                        db, asset.id, 'expired', days_lookback=30
                    ):
                        expired.append((asset, asset_data))
                elif days_remaining <= 30:
                    # Critical - 30 days
                    if not WarrantyNotificationService.check_warranty_already_notified(
                        db, asset.id, '30_day', days_lookback=7
                    ):
                        expiring_30.append((asset, asset_data))
                elif days_remaining <= 90:
                    # Warning - 90 days
                    if not WarrantyNotificationService.check_warranty_already_notified(
                        db, asset.id, '90_day', days_lookback=14
                    ):
                        expiring_90.append((asset, asset_data))
            
            # Get admin emails
            admin_emails = WarrantyNotificationService.get_admin_emails(db)
            
            if not admin_emails:
                logger.warning("No admin emails configured for warranty notifications")
                return
            
            # Send notifications
            if expired:
                success = await email_service.send_warranty_alert(
                    admin_emails,
                    [data for _, data in expired],
                    'expired'
                )
                if success:
                    for asset, _ in expired:
                        WarrantyNotificationService.record_notification(db, asset.id, 'expired')
                    logger.info(f"Sent expired warranty alert for {len(expired)} assets")
            
            if expiring_30:
                success = await email_service.send_warranty_alert(
                    admin_emails,
                    [data for _, data in expiring_30],
                    'expiring_30'
                )
                if success:
                    for asset, _ in expiring_30:
                        WarrantyNotificationService.record_notification(db, asset.id, '30_day')
                    logger.info(f"Sent 30-day warranty alert for {len(expiring_30)} assets")
            
            if expiring_90:
                success = await email_service.send_warranty_alert(
                    admin_emails,
                    [data for _, data in expiring_90],
                    'expiring_90'
                )
                if success:
                    for asset, _ in expiring_90:
                        WarrantyNotificationService.record_notification(db, asset.id, '90_day')
                    logger.info(f"Sent 90-day warranty alert for {len(expiring_90)} assets")
            
            logger.info(f"Warranty check complete. Expired: {len(expired)}, 30-day: {len(expiring_30)}, 90-day: {len(expiring_90)}")
            
        except Exception as e:
            logger.error(f"Error checking warranty alerts: {str(e)}")
        finally:
            db.close()
    
    @staticmethod
    def get_warranty_summary(db: Session) -> dict:
        """Get a summary of warranty statuses."""
        today = date.today()
        
        assets = db.query(Asset).filter(
            and_(
                Asset.status != AssetStatus.DECOMMISSIONED,
                Asset.warranty_end.isnot(None)
            )
        ).all()
        
        summary = {
            'expired': [],
            'critical_30': [],
            'warning_90': [],
            'active': []
        }
        
        for asset in assets:
            days_remaining = (asset.warranty_end - today).days
            
            asset_info = {
                'id': asset.id,
                'asset_tag': asset.asset_tag,
                'name': asset.name,
                'warranty_end': asset.warranty_end,
                'days_remaining': days_remaining,
                'assigned_to': asset.assigned_employee.full_name if asset.assigned_employee else None
            }
            
            if days_remaining < 0:
                summary['expired'].append(asset_info)
            elif days_remaining <= 30:
                summary['critical_30'].append(asset_info)
            elif days_remaining <= 90:
                summary['warning_90'].append(asset_info)
            else:
                summary['active'].append(asset_info)
        
        return summary


warranty_service = WarrantyNotificationService()
