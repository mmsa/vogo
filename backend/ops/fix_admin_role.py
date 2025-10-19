"""Fix user roles - make specific users admins."""

import sys
sys.path.insert(0, '/Users/mmsa/Projects/vogo/backend')

from app.core.db import get_db
from app.models.user import User

def fix_roles():
    """Update user roles to admin."""
    db = next(get_db())
    
    # Get all users
    users = db.query(User).all()
    
    print("Current users:")
    for user in users:
        print(f"  - ID: {user.id}, Email: {user.email}, Role: {user.role}")
    
    # Make certain users admin
    admin_emails = ["admin@vogo.app", "test@vogo.app", "admin"]
    
    for email in admin_emails:
        user = db.query(User).filter(User.email == email).first()
        if user:
            if user.role != "admin":
                print(f"\nUpdating {email} to admin role...")
                user.role = "admin"
                db.commit()
                print(f"✅ {email} is now an admin")
            else:
                print(f"✅ {email} already has admin role")
    
    db.close()
    
    print("\nFinal user list:")
    db = next(get_db())
    users = db.query(User).all()
    for user in users:
        print(f"  - ID: {user.id}, Email: {user.email}, Role: {user.role}")
    db.close()

if __name__ == "__main__":
    fix_roles()

