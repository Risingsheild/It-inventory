import sys
import os

# Add the parent directory to the path so we can import app modules
sys.path.insert(0, os.path.dirname(__file__))

try:
    from app.database import SessionLocal, engine
    from app.models import Base, User, UserRole
    from app.auth import get_password_hash
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    # Create session
    db = SessionLocal()
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.username == "nick").first()
    if existing_user:
        print(f"User 'nick' already exists (Role: {existing_user.role})")
        if existing_user.role != UserRole.ADMIN:
            existing_user.role = UserRole.ADMIN
            db.commit()
            print("Updated role to ADMIN")
    else:
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
        print("Test user created successfully!")
    
    print("\n--- Login Credentials ---")
    print("Username: nick")
    print("Password: 12345")
    print("Role: ADMIN")
    
    db.close()
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
