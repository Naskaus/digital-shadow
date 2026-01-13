from flask import Blueprint, request, send_file
from auth import require_auth
from services.export_service import generate_excel_export, generate_pdf_export
import io

export_bp = Blueprint('export', __name__)

@export_bp.route('/excel', methods=['GET'])
@require_auth
def export_excel():
    # Example logic: pull data based on query params
    # For now, placeholder data
    data = [{"date": "2024-01-01", "sales": 1000}, {"date": "2024-01-02", "sales": 1200}]
    output = generate_excel_export(data)
    return send_file(
        output,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name="export.xlsx"
    )

@export_bp.route('/pdf', methods=['GET'])
@require_auth
def export_pdf():
    # Example logic
    summary = {"total_sales": 2200, "net_profit": 500}
    charts = {"labels": ["Day 1", "Day 2"], "values": [1000, 1200], "title": "Sales Trend"}
    output = generate_pdf_export(summary, charts)
    return send_file(
        output,
        mimetype="application/pdf",
        as_attachment=True,
        download_name="report.pdf"
    )
