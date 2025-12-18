import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Template
from typing import List, Optional
from datetime import date
from app.config import settings
import logging

logger = logging.getLogger(__name__)


# Email Templates
WARRANTY_EXPIRING_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1e293b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
        .asset-card { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid {{ status_color }}; }
        .warning { border-left-color: #f59e0b; }
        .critical { border-left-color: #ef4444; }
        .footer { padding: 15px; font-size: 12px; color: #64748b; text-align: center; }
        .btn { display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">⚠️ Warranty Alert</h1>
            <p style="margin: 5px 0 0 0;">IT Asset Management System</p>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>The following assets have warranties that {{ alert_message }}:</p>
            
            {% for asset in assets %}
            <div class="asset-card {{ asset.status_class }}">
                <strong>{{ asset.name }}</strong><br>
                <small style="color: #64748b;">
                    Asset Tag: {{ asset.asset_tag }} | Serial: {{ asset.serial_number or 'N/A' }}<br>
                    Warranty End: {{ asset.warranty_end }} | 
                    <span style="color: {{ asset.status_color }}; font-weight: bold;">
                        {{ asset.days_text }}
                    </span>
                </small>
                {% if asset.assigned_to %}
                <br><small>Assigned to: {{ asset.assigned_to }}</small>
                {% endif %}
            </div>
            {% endfor %}
            
            <p>Please review these assets and take appropriate action:</p>
            <ul>
                <li>Contact vendor for warranty extension options</li>
                <li>Plan for replacement if needed</li>
                <li>Update asset records if warranty has been renewed</li>
            </ul>
            
            <p style="text-align: center; margin-top: 20px;">
                <a href="{{ frontend_url }}/warranties" class="btn">View All Warranties</a>
            </p>
        </div>
        <div class="footer">
            This is an automated message from the IT Asset Management System.<br>
            Do not reply to this email.
        </div>
    </div>
</body>
</html>
"""

ASSET_ASSIGNED_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1e293b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
        .asset-info { background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border: 1px solid #e2e8f0; }
        .footer { padding: 15px; font-size: 12px; color: #64748b; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">📦 Equipment Assignment</h1>
        </div>
        <div class="content">
            <p>Hello {{ employee_name }},</p>
            <p>The following IT equipment has been assigned to you:</p>
            
            <div class="asset-info">
                <h3 style="margin-top: 0;">{{ asset.name }}</h3>
                <table style="width: 100%;">
                    <tr><td><strong>Asset Tag:</strong></td><td>{{ asset.asset_tag }}</td></tr>
                    <tr><td><strong>Type:</strong></td><td>{{ asset.asset_type }}</td></tr>
                    <tr><td><strong>Serial Number:</strong></td><td>{{ asset.serial_number or 'N/A' }}</td></tr>
                    <tr><td><strong>Assigned Date:</strong></td><td>{{ assigned_date }}</td></tr>
                </table>
            </div>
            
            <p>Please take care of this equipment and report any issues to the IT department.</p>
        </div>
        <div class="footer">
            IT Asset Management System
        </div>
    </div>
</body>
</html>
"""


class EmailService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.email_from = settings.EMAIL_FROM
        
    def is_configured(self) -> bool:
        """Check if email service is properly configured."""
        return bool(self.smtp_user and self.smtp_password)
    
    async def send_email(
        self,
        to_emails: List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send an email."""
        if not self.is_configured():
            logger.warning("Email service not configured. Skipping email send.")
            return False
        
        try:
            message = MIMEMultipart("alternative")
            message["From"] = self.email_from
            message["To"] = ", ".join(to_emails)
            message["Subject"] = subject
            
            # Add plain text version if provided
            if text_content:
                message.attach(MIMEText(text_content, "plain"))
            
            # Add HTML version
            message.attach(MIMEText(html_content, "html"))
            
            await aiosmtplib.send(
                message,
                hostname=self.smtp_host,
                port=self.smtp_port,
                start_tls=True,
                username=self.smtp_user,
                password=self.smtp_password,
            )
            
            logger.info(f"Email sent successfully to {to_emails}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            return False
    
    async def send_warranty_alert(
        self,
        to_emails: List[str],
        assets: List[dict],
        alert_type: str  # "expiring_90", "expiring_30", "expired"
    ) -> bool:
        """Send warranty expiration alert email."""
        
        alert_messages = {
            "expiring_90": "will expire within 90 days",
            "expiring_30": "will expire within 30 days",
            "expired": "have already expired"
        }
        
        subject_prefixes = {
            "expiring_90": "⚠️",
            "expiring_30": "🔴",
            "expired": "❌"
        }
        
        # Prepare asset data for template
        prepared_assets = []
        for asset in assets:
            days = asset.get("days_remaining", 0)
            if days < 0:
                status_class = "critical"
                status_color = "#ef4444"
                days_text = f"Expired {abs(days)} days ago"
            elif days <= 30:
                status_class = "critical"
                status_color = "#ef4444"
                days_text = f"{days} days remaining"
            else:
                status_class = "warning"
                status_color = "#f59e0b"
                days_text = f"{days} days remaining"
            
            prepared_assets.append({
                **asset,
                "status_class": status_class,
                "status_color": status_color,
                "days_text": days_text
            })
        
        template = Template(WARRANTY_EXPIRING_TEMPLATE)
        html_content = template.render(
            assets=prepared_assets,
            alert_message=alert_messages.get(alert_type, "require attention"),
            frontend_url=settings.FRONTEND_URL,
            status_color="#f59e0b" if alert_type == "expiring_90" else "#ef4444"
        )
        
        subject = f"{subject_prefixes.get(alert_type, '⚠️')} Warranty Alert: {len(assets)} asset(s) {alert_messages.get(alert_type, 'require attention')}"
        
        return await self.send_email(to_emails, subject, html_content)
    
    async def send_assignment_notification(
        self,
        employee_email: str,
        employee_name: str,
        asset: dict,
        assigned_date: date
    ) -> bool:
        """Send equipment assignment notification to employee."""
        
        template = Template(ASSET_ASSIGNED_TEMPLATE)
        html_content = template.render(
            employee_name=employee_name,
            asset=asset,
            assigned_date=assigned_date.strftime("%B %d, %Y")
        )
        
        subject = f"📦 IT Equipment Assigned: {asset['name']}"
        
        return await self.send_email([employee_email], subject, html_content)


# Singleton instance
email_service = EmailService()
