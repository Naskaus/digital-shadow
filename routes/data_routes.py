from flask import Blueprint, request, jsonify
from models import db, Location, DailyReport
from auth import require_auth
from services.kpi_service import calculate_kpis
from sqlalchemy import func
from datetime import datetime

data_bp = Blueprint('data', __name__)

@data_bp.route('/locations', methods=['GET'])
@require_auth
def get_locations():
    locs = Location.query.all()
    return jsonify([l.to_dict() for l in locs])

@data_bp.route('/summary', methods=['GET'])
@require_auth
def get_summary():
    start_str = request.args.get('start')
    end_str = request.args.get('end')
    city = request.args.get('city')
    
    query = db.session.query(
        func.sum(DailyReport.total_sales).label('total_sales'),
        func.sum(DailyReport.total_expenses).label('total_expenses'),
        func.sum(DailyReport.net_profit).label('net_profit'),
        func.sum(DailyReport.sales_client).label('sales_client'),
        func.sum(DailyReport.sales_ladydrink).label('sales_ladydrink'),
        func.sum(DailyReport.sales_barfine).label('sales_barfine'),
        func.sum(DailyReport.sales_cc_fees).label('sales_cc_fees'),
        func.sum(DailyReport.exp_salaries).label('exp_salaries'),
        func.sum(DailyReport.exp_agents).label('exp_agents'),
        func.sum(DailyReport.exp_bonus).label('exp_bonus'),
        func.sum(DailyReport.exp_misc).label('exp_misc')
    ).join(Location)
    
    if start_str and end_str:
        start_date = datetime.strptime(start_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_str, '%Y-%m-%d').date()
        query = query.filter(DailyReport.date.between(start_date, end_date))
    
    if city:
        query = query.filter(Location.city == city)
        
    stats = query.first()._asdict()
    
    # Calculate margin
    net_margin = 0
    if stats['total_sales'] and stats['total_sales'] > 0:
        net_margin = round((stats['net_profit'] / stats['total_sales']) * 100, 2)
        
    # Breakdown by city logic would go here
    
    return jsonify({
        "total_sales": stats['total_sales'] or 0,
        "total_expenses": stats['total_expenses'] or 0,
        "net_profit": stats['net_profit'] or 0,
        "net_margin": net_margin,
        "revenue_breakdown": {
            "sales_client": stats['sales_client'] or 0,
            "sales_ladydrink": stats['sales_ladydrink'] or 0,
            "sales_barfine": stats['sales_barfine'] or 0,
            "sales_cc_fees": stats['sales_cc_fees'] or 0
        },
        "expense_breakdown": {
            "exp_salaries": stats['exp_salaries'] or 0,
            "exp_agents": stats['exp_agents'] or 0,
            "exp_bonus": stats['exp_bonus'] or 0,
            "exp_misc": stats['exp_misc'] or 0
        }
    })

@data_bp.route('/bar/<slug>', methods=['GET'])
@require_auth
def get_bar_details(slug):
    loc = Location.query.filter_by(slug=slug).first_or_404()
    start_str = request.args.get('start')
    end_str = request.args.get('end')
    
    reports_query = DailyReport.query.filter_by(location_id=loc.id)
    if start_str and end_str:
        start_date = datetime.strptime(start_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_str, '%Y-%m-%d').date()
        reports_query = reports_query.filter(DailyReport.date.between(start_date, end_date))
    
    reports = reports_query.order_by(DailyReport.date).all()
    
    # Simple aggregates for demonstration
    total_sales = sum(r.total_sales for r in reports)
    total_expenses = sum(r.total_expenses for r in reports)
    net_profit = sum(r.net_profit for r in reports)
    total_dancers = sum(r.count_dancers for r in reports)
    total_bills = sum(r.count_bills for r in reports)
    days_open = len([r for r in reports if not r.is_closed])
    
    stats = {
        "total_sales": total_sales,
        "total_expenses": total_expenses,
        "net_profit": net_profit,
        "exp_salaries": sum(r.exp_salaries for r in reports),
        "sales_ladydrink": sum(r.sales_ladydrink for r in reports),
        "sales_barfine": sum(r.sales_barfine for r in reports)
    }
    
    kpis = calculate_kpis(stats, total_dancers, days_open, total_bills)
    
    return jsonify({
        "bar": loc.to_dict(),
        "stats": {
            "total_sales": total_sales,
            "total_expenses": total_expenses,
            "net_profit": net_profit,
            "net_margin": kpis["net_margin"],
            "days_open": days_open,
            "days_closed": len(reports) - days_open
        },
        "kpis": kpis,
        "daily_data": [r.to_dict() for r in reports]
    })
