def calculate_kpis(stats, total_dancers, days_open, total_bills):
    """
    Calculate KPIs for a given set of stats.
    stats is a dictionary containing aggregated sales/expenses.
    """
    kpis = {
        "profit_per_dancer": 0.0,
        "avg_bill": 0.0,
        "ld_ratio": 0.0,
        "bf_ratio": 0.0,
        "net_margin": 0.0,
        "salary_ratio": 0.0,
        "avg_daily_sales": 0.0,
        "avg_daily_profit": 0.0,
        "avg_dancers": 0.0
    }
    
    total_sales = stats.get('total_sales', 0)
    net_profit = stats.get('net_profit', 0)
    exp_salaries = stats.get('exp_salaries', 0)
    sales_ladydrink = stats.get('sales_ladydrink', 0)
    sales_barfine = stats.get('sales_barfine', 0)

    if total_dancers > 0:
        kpis["profit_per_dancer"] = round(net_profit / total_dancers, 2)
    
    if total_bills > 0:
        kpis["avg_bill"] = round(total_sales / total_bills, 2)
    
    if total_sales > 0:
        kpis["ld_ratio"] = round((sales_ladydrink / total_sales) * 100, 2)
        kpis["bf_ratio"] = round((sales_barfine / total_sales) * 100, 2)
        kpis["net_margin"] = round((net_profit / total_sales) * 100, 2)
        kpis["salary_ratio"] = round((exp_salaries / total_sales) * 100, 2)
    
    if days_open > 0:
        kpis["avg_daily_sales"] = round(total_sales / days_open, 2)
        kpis["avg_daily_profit"] = round(net_profit / days_open, 2)
        kpis["avg_dancers"] = round(total_dancers / days_open, 2)

    return kpis
