import secrets
import os

# Base directory of the project
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Security
SECRET_KEY = secrets.token_hex(32)
# Hash for PIN '123456'
ADMIN_PIN_HASH = '$2b$12$80n.f.DoYUdlUMunowY0tOOpadJait80c9YE.wPcz1/yXWsytSRlG' 

# Database
DATABASE_PATH = os.path.join(BASE_DIR, 'shadow.db')
SQLALCHEMY_DATABASE_URI = f'sqlite:///{DATABASE_PATH}'
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Session configuration
SESSION_CONFIG = {
    'SESSION_COOKIE_HTTPONLY': True,
    'SESSION_COOKIE_SAMESITE': 'Lax',
    'PERMANENT_SESSION_LIFETIME': 86400  # 24 hours in seconds
}
