from flask import Blueprint, request, jsonify, session
from auth import check_pin

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    pin = data.get('pin')
    
    if not pin:
        return jsonify({"success": False, "error": "PIN is required"}), 400
        
    if check_pin(pin):
        session['authenticated'] = True
        session.permanent = True
        return jsonify({"success": True})
    
    return jsonify({"success": False, "error": "Invalid PIN"}), 401

@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.pop('authenticated', None)
    return jsonify({"success": True})
