import re
import os
from datetime import datetime
from app import app, db
from models import DailyReport, Location

# Configuration
SOURCE_FILE = 'november_data.html' # On garde le fichier que tu as créé
TARGET_YEAR = 2025
TARGET_MONTH = 1  # JANVIER

# Mapping des Noms HTML vers Slugs DB
SECTIONS = {
    'RedDragon': 'red_dragon',
    'Mandarin': 'mandarin',
    'Shark': 'shark_bkk'
}

def parse_currency(value_str):
    if not value_str: return 0.0
    clean = re.sub(r'[^\d.-]', '', value_str)
    try:
        return float(clean)
    except:
        return 0.0

def run_import():
    print(f"🚀 Démarrage de l'import HTML vers JANVIER {TARGET_YEAR}...")
    
    if not os.path.exists(SOURCE_FILE):
        print(f"❌ Fichier {SOURCE_FILE} introuvable. As-tu bien fait l'étape 1 ?")
        return

    with open(SOURCE_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    total_inserted = 0

    with app.app_context():
        # Création des lieux si besoin
        for slug in SECTIONS.values():
            if not Location.query.filter_by(slug=slug).first():
                db.session.add(Location(slug=slug, name=slug.replace('_', ' ').title(), city='BKK'))
        db.session.commit()

        for html_id, db_slug in SECTIONS.items():
            print(f"   📂 Traitement de {html_id}...")
            location = Location.query.filter_by(slug=db_slug).first()
            
            pattern = r'<div id="' + html_id + r'"(.*?)(?=<div id="|$)'
            section_match = re.search(pattern, content, re.DOTALL)
            
            if not section_match:
                continue
                
            section_html = section_match.group(1)
            row_pattern = r'<tr>\s*<td[^>]*>(\d+)\s+JAN</td>(.*?)</tr>'
            rows = re.findall(row_pattern, section_html, re.DOTALL)

            for day_str, cells_html in rows:
                day = int(day_str)
                
                # Janvier a 31 jours, on prend tout
                if day > 31: continue

                cells = re.findall(r'<td.*?>(.*?)</td>', cells_html)
                if len(cells) < 14: continue

                # Mapping (Basé sur ton tableau HTML)
                # Index 7 = Total IN (Sales)
                # Index 13 = Total OUT (Expenses)
                # Index 14 = Net Profit
                
                total_sales = parse_currency(cells[7]) 
                total_expenses = parse_currency(cells[13]) * -1 # En négatif
                net_profit = parse_currency(cells[14])
                
                # Détails
                sales_drinks = parse_currency(cells[0])
                sales_ladydrink = parse_currency(cells[1])
                sales_barfine = parse_currency(cells[2])

                report_date = datetime(TARGET_YEAR, TARGET_MONTH, day).date()

                report = DailyReport.query.filter_by(location_id=location.id, date=report_date).first()
                if not report:
                    report = DailyReport(location_id=location.id, date=report_date)
                    db.session.add(report)

                report.total_sales = total_sales
                report.total_expenses = total_expenses
                report.net_profit = net_profit
                
                if hasattr(report, 'sales_ladydrink'): report.sales_ladydrink = sales_ladydrink
                if hasattr(report, 'sales_barfine'): report.sales_barfine = sales_barfine

                total_inserted += 1

        db.session.commit()
        print(f"✅ Terminé ! {total_inserted} jours importés pour Janvier.")

if __name__ == '__main__':
    run_import()
