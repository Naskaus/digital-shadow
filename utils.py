def format_currency(value):
    """Format float to currency string with 2 decimals."""
    try:
        return f"{float(value):,.2f}"
    except (TypeError, ValueError):
        return "0.00"

def get_date_range(start_str, end_str):
    """Convert string dates to datetime objects."""
    from datetime import datetime
    try:
        start_date = datetime.strptime(start_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_str, '%Y-%m-%d').date()
        return start_date, end_date
    except (ValueError, TypeError):
        return None, None
