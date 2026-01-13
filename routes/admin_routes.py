from flask import Blueprint, request, jsonify
from auth import require_auth
from services.import_service import import_excel_data
import os

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/import', methods=['POST'])
@require_auth
def import_data():
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "error": "No selected file"}), 400
    
    replace = request.form.get('replace', 'false').lower() == 'true'
    auto_calc = request.form.get('auto_calc', 'true').lower() == 'true'
    
    # Save temp file
    temp_path = os.path.join(os.getcwd(), 'temp_import.xlsx')
    file.save(temp_path)
    
    try:
        result = import_excel_data(temp_path, replace=replace, auto_calc=auto_calc)
        return jsonify(result)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
