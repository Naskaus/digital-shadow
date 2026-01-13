import bcrypt
from flask import session, jsonify, request
from functools import wraps
import config

def check_pin(pin):
    """Verify PIN against hashed version in config."""
    return bcrypt.checkpw(pin.encode('utf-8'), config.ADMIN_PIN_HASH.encode('utf-8'))

def require_auth(f):
    """Decorator to protect endpoints."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('authenticated'):
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated_function
