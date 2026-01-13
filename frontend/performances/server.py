
import http.server
import socketserver
import sqlite3
import json
import os
from urllib.parse import urlparse, parse_qs

PORT = 8000
DB_NAME = "staff_performance.db"

class AnalyticsHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        # API Endpoint: /api/stats
        if parsed_path.path == '/api/stats':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            query_components = parse_qs(parsed_path.query)
            data = self.get_analytics_data(filters=query_components)
            self.wfile.write(json.dumps(data).encode('utf-8'))
            return

        # API Endpoint: /api/report
        if parsed_path.path == '/api/report':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            data = self.get_report_data()
            self.wfile.write(json.dumps(data).encode('utf-8'))
            return

        # Serve Dashboard (Root)
        if parsed_path.path == '/' or parsed_path.path == '/dashboard':
            if os.path.exists('dashboard.html'):
                self.send_response(200)
                self.send_header('Content-type', 'text/html')
                self.end_headers()
                with open('dashboard.html', 'rb') as f:
                    self.wfile.write(f.read())
                return
            else:
                self.send_error(404, "Dashboard file not found.")
                return

        # API Endpoint: /api/filters
        if parsed_path.path == '/api/filters':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            data = self.get_filter_options()
            self.wfile.write(json.dumps(data).encode('utf-8'))
            return

        # API Endpoint: /api/compare
        if parsed_path.path == '/api/compare':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            query_components = parse_qs(parsed_path.query)
            data = self.get_comparison_data(filters=query_components)
            self.wfile.write(json.dumps(data).encode('utf-8'))
            return

        # Fallback to serving static files
        super().do_GET()

    def get_filter_options(self):
        conn = sqlite3.connect(DB_NAME)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        filters = {}
        try:
            cur.execute("SELECT DISTINCT bar_name FROM dim_bar ORDER BY bar_name")
            filters['bars'] = [r['bar_name'] for r in cur.fetchall()]
            
            # Get months with proper ordering
            cur.execute("""
                SELECT DISTINCT d.month_name, d.month_num
                FROM dim_date d
                JOIN fact_staff_performance f ON d.date_key = f.date_key
                ORDER BY d.month_num
            """)
            filters['months'] = [r['month_name'] for r in cur.fetchall()]
            
            cur.execute("SELECT DISTINCT agent_name FROM dim_agent ORDER BY agent_name")
            filters['agents'] = [r['agent_name'] for r in cur.fetchall()]
            
            # Get available years
            cur.execute("""
                SELECT DISTINCT d.year 
                FROM dim_date d
                JOIN fact_staff_performance f ON d.date_key = f.date_key
                ORDER BY d.year DESC
            """)
            filters['years'] = [r['year'] for r in cur.fetchall()]
            
            # Get date range (min/max)
            cur.execute("""
                SELECT MIN(date_key) as min_date, MAX(date_key) as max_date
                FROM fact_staff_performance
            """)
            row = cur.fetchone()
            if row:
                filters['date_range'] = {'min': row['min_date'], 'max': row['max_date']}
        except Exception as e:
            filters['error'] = str(e)
        finally:
            conn.close()
        return filters

    def get_analytics_data(self, filters=None):
        conn = sqlite3.connect(DB_NAME)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        response = {}
        
        # Build Filter Clause
        where_clauses = ["1=1"]
        params = []
        
        if filters:
            # Multi-select bar filter (comma-separated)
            if filters.get('bar'):
                bars = filters['bar'][0].split(',')
                if len(bars) == 1:
                    where_clauses.append("b.bar_name = ?")
                    params.append(bars[0])
                else:
                    placeholders = ','.join(['?'] * len(bars))
                    where_clauses.append(f"b.bar_name IN ({placeholders})")
                    params.extend(bars)
            
            # Multi-select agent filter (comma-separated)
            if filters.get('agent'):
                agents = filters['agent'][0].split(',')
                if len(agents) == 1:
                    where_clauses.append("a.agent_name = ?")
                    params.append(agents[0])
                else:
                    placeholders = ','.join(['?'] * len(agents))
                    where_clauses.append(f"a.agent_name IN ({placeholders})")
                    params.extend(agents)
            
            # Multi-select month filter (comma-separated)
            if filters.get('month'):
                months = filters['month'][0].split(',')
                if len(months) == 1:
                    where_clauses.append("d.month_name = ?")
                    params.append(months[0])
                else:
                    placeholders = ','.join(['?'] * len(months))
                    where_clauses.append(f"d.month_name IN ({placeholders})")
                    params.extend(months)
            
            # Year filter
            if filters.get('year'):
                where_clauses.append("d.year = ?")
                params.append(int(filters['year'][0]))
            
            # Date range filters
            if filters.get('start_date'):
                where_clauses.append("f.date_key >= ?")
                params.append(filters['start_date'][0])
            if filters.get('end_date'):
                where_clauses.append("f.date_key <= ?")
                params.append(filters['end_date'][0])
                
        # We need to join dimensions in every query to filter correctly now
        base_join = """
            JOIN dim_bar b ON f.bar_id = b.bar_id
            JOIN dim_agent a ON f.agent_id = a.agent_id
            JOIN dim_date d ON f.date_key = d.date_key
        """
        where_sql = " AND ".join(where_clauses)
        
        try:
            # 1. Total Stats
            query = f"""
                SELECT SUM(f.profit) as total_profit, COUNT(*) as tx_count 
                FROM fact_staff_performance f
                {base_join}
                WHERE {where_sql}
            """
            cur.execute(query, params)
            row = cur.fetchone()
            response['summary'] = dict(row) if row else {}

            # 2. Daily Trend
            query = f"""
                SELECT f.date_key, SUM(f.profit) as profit 
                FROM fact_staff_performance f
                {base_join}
                WHERE {where_sql}
                GROUP BY f.date_key 
                ORDER BY f.date_key
            """
            cur.execute(query, params)
            response['trend'] = [dict(r) for r in cur.fetchall()]

            # 3. Bar Performance
            query = f"""
                SELECT b.bar_name, SUM(f.profit) as profit
                FROM fact_staff_performance f
                {base_join}
                WHERE {where_sql}
                GROUP BY b.bar_name
                ORDER BY profit DESC
            """
            cur.execute(query, params)
            response['by_bar'] = [dict(r) for r in cur.fetchall()]

            # 4. Top Agents
            query = f"""
                SELECT 
                    a.agent_name, 
                    SUM(f.profit) as profit,
                    COUNT(DISTINCT f.date_key) as working_days
                FROM fact_staff_performance f
                {base_join}
                WHERE {where_sql}
                GROUP BY a.agent_name
                ORDER BY profit DESC
            """
            cur.execute(query, params)
            response['by_agent'] = [dict(r) for r in cur.fetchall()]
            
            # 5. Full Staff Performance (for frontend sorting/grouping)
            # We fetch ALL staff matching filters to allow "Top 10" / "Flop 10" / "Group By" on frontend.
            query = f"""
                SELECT 
                    s.staff_nickname, 
                    (CAST(s.staff_numeric_id AS TEXT) || ' - ' || s.staff_nickname) as staff_full_name,
                    b.bar_name,
                    a.agent_name,
                    SUM(f.profit) as profit,
                    COUNT(DISTINCT f.date_key) as working_days,
                    ROUND(SUM(f.profit) / COUNT(DISTINCT f.date_key), 2) as daily_avg
                FROM fact_staff_performance f
                JOIN dim_staff s ON f.staff_key = s.staff_key
                {base_join}
                WHERE {where_sql}
                GROUP BY s.staff_nickname, b.bar_name, a.agent_name
                ORDER BY profit DESC
            """
            cur.execute(query, params)
            response['staff_performance'] = [dict(r) for r in cur.fetchall()]

        except Exception as e:
            response['error'] = str(e)
        finally:
            conn.close()
            
        return response

    def get_comparison_data(self, filters):
        """
        Comparison Logic:
        1. Extract Filter Set A (prefixed with a_)
        2. Extract Filter Set B (prefixed with b_)
        3. Fetch data for both
        4. Calculate Deltas
        """
        filters_a = {}
        filters_b = {}
        
        for key, value in filters.items():
            if key.startswith('a_'):
                filters_a[key[2:]] = value
            elif key.startswith('b_'):
                filters_b[key[2:]] = value
                
        data_a = self.get_analytics_data(filters_a)
        data_b = self.get_analytics_data(filters_b)
        
        # Calculate Deltas (A - B? Or B vs A? Usually Target (A) vs Baseline (B))
        # Let's do A vs B (A is usually current, B is previous)
        # Delta = A - B
        
        summary_a = data_a.get('summary', {})
        summary_b = data_b.get('summary', {})
        
        profit_a = summary_a.get('total_profit', 0) or 0
        profit_b = summary_b.get('total_profit', 0) or 0
        
        count_a = summary_a.get('tx_count', 0) or 0
        count_b = summary_b.get('tx_count', 0) or 0
        
        # Calculate Changes
        delta = {
            'profit': profit_a - profit_b,
            'profit_pct': 0,
            'tx_count': count_a - count_b,
            'tx_count_pct': 0
        }
        
        if profit_b != 0:
            delta['profit_pct'] = round(((profit_a - profit_b) / abs(profit_b)) * 100, 2)
        else:
            delta['profit_pct'] = 100 if profit_a > 0 else 0
            
        if count_b != 0:
            delta['tx_count_pct'] = round(((count_a - count_b) / count_b) * 100, 2)
            
        return {
            'a': data_a,
            'b': data_b,
            'delta': delta
        }

    def get_report_data(self):
        conn = sqlite3.connect(DB_NAME)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        try:
            # Query for the detailed report view
            # We want: bar, month, date, agent, staff_id, profit, ingested_at
            # We join Fact to Dims to get readable names.
            cur.execute("""
                SELECT 
                    b.bar_name as bar,
                    -- Extract Month name from dim_date or raw? We have dim_date.
                    d.month_name as month,
                    -- Format date as MM/DD/YYYY to match original report style if needed, 
                    -- but YYYY-MM-DD (date_key) is also fine. Let's stick to date_key for proper sorting, 
                    -- or format it if we want exact visual match.
                    -- Let's return date_key and format in frontend.
                    f.date_key as date,
                    a.agent_name as agent,
                    -- Construct "123 - Name" format
                    (CAST(s.staff_numeric_id AS TEXT) || ' - ' || s.staff_nickname) as staff_id,
                    f.profit,
                    f.ingested_at
                FROM fact_staff_performance f
                JOIN dim_bar b ON f.bar_id = b.bar_id
                JOIN dim_agent a ON f.agent_id = a.agent_id
                JOIN dim_staff s ON f.staff_key = s.staff_key
                JOIN dim_date d ON f.date_key = d.date_key
                ORDER BY f.date_key DESC, b.bar_name, a.agent_name
            """)
            rows = [dict(r) for r in cur.fetchall()]
            return rows
        except Exception as e:
            return {"error": str(e)}
        finally:
            conn.close()

print(f"Server started at http://localhost:{PORT}")
print("Press Ctrl+C to stop.")

with socketserver.TCPServer(("", PORT), AnalyticsHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    print("Server stopped.")
