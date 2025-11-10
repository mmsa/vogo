"""Generate password hashes."""

import bcrypt

# Generate hashes for demo passwords
test_password = "TestPass123!"
admin_password = "ChangeMe123!"

test_hash = bcrypt.hashpw(test_password.encode("utf-8"), bcrypt.gensalt())
admin_hash = bcrypt.hashpw(admin_password.encode("utf-8"), bcrypt.gensalt())

print(f"test@vogoplus.app -> TestPass123!")
print(f"Hash: {test_hash.decode('utf-8')}")
print()
print(f"admin@vogoplus.app -> ChangeMe123!")
print(f"Hash: {admin_hash.decode('utf-8')}")
print()
print("SQL Commands:")
print("=" * 60)
print(
    f"UPDATE users SET password_hash = '{test_hash.decode('utf-8')}', role = 'user', is_active = true WHERE email = 'test@vogoplus.app';"
)
print(
    f"UPDATE users SET password_hash = '{admin_hash.decode('utf-8')}', role = 'admin', is_active = true WHERE email = 'admin@vogoplus.app';"
)
