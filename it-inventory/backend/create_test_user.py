#!/usr/bin/env python
"""
Quick script to create a test admin user
Run this from the backend directory after activating the virtual environment
"""

from app.database import SessionLocal, engine
from app.models import Base, User, UserRole
from app.auth import get_password_hash
import os

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

# Create session
db = SessionLocal()

try:
    # Check if user already exists
    existing_user = db.query(User).filter(User.username == "nick").first()
    if existing_user:
        print(f"✓ User 'nick' already exists (ID: {existing_user.id}, Role: {existing_user.role})")
        db.close()
        exit(0)
    
    # Create new admin user
    new_user = User(
        email="nick@test.local",
        username="nick",
        full_name="Nick Wells",
        hashed_password=get_password_hash("12345"),
        role=UserRole.ADMIN,
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    print("✓ Test user created successfully!")
    print(f"  Username: nick")
    print(f"  Password: 12345")
    print(f"  Email: nick@test.local")
    print(f"  Role: ADMIN")
    print(f"  User ID: {new_user.id}")
    
except Exception as e:
    db.rollback()
    print(f"✗ Error creating user: {e}")
finally:
    db.close()
