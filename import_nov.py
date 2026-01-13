import pandas as pd
import io
from app import app, db
from models import DailyReport, Location
from datetime import datetime

def run_import():
    print("🚀 Démarrage de l'importation de Novembre 2025...")
    
    # 1. Lecture et Nettoyage "Chirurgical" du fichier
    try:
        with open('november.csv', 'r', encoding='utf-8') as f:
            raw_data = f.read()
            
        # CORRECTION : On enlève la virgule qui tue après "Nov."
        # On remplace "Rental for Nov.," par "Rental for Nov."
        cleaned_data = raw_data.replace('Rental for Nov.,', 'Rental for Nov.')
        
        # On charge Pandas depuis cette donnée nettoyée en mémoire
        df = pd.read_csv(io.StringIO(cleaned_data))
        print(f"✅ Fichier chargé et réparé : {len(df)} transactions trouvées.")
        
    except Exception as e:
        print(f"❌ Erreur lecture CSV : {e}")
        return

    # 2. Préparation des données
    df['Date'] = pd.to_datetime(df['Date'])
    
    # Mapping
    entity_map = {
        'Shark': 'shark_bkk',
        'Red Dragon': 'red_dragon',
        'Mandarin': 'mandarin'
    }

    with app.app_context():
        # 3. Création des Locations (si absentes)
        for name, slug in entity_map.items():
            loc = Location.query.filter_by(slug=slug).first()
            if not loc:
                print(f"Creating Location: {name}")
                new_loc = Location(slug=slug, name=name, city="BKK", status="open")
                db.session.add(new_loc)
        db.session.commit()

        # 4. Boucle d'agrégation
        grouped = df.groupby(['Date', 'Entity'])
        count = 0
        
        for (date, entity_name), group in grouped:
            slug = entity_map.get(entity_name)
            if not slug: continue

            location = Location.query.filter_by(slug=slug).first()
            
            # --- CALCULS ---
            total_sales = group[group['Flow_Type'] == 'IN']['Amount_THB'].sum()
            total_expenses = group[group['Flow_Type'] == 'OUT']['Amount_THB'].sum() * -1
            
            # Détails (Recherche textuelle insensible à la casse)
            sales_ladydrink = group[group['Description'].str.contains('Lady Drink', case=False, na=False)]['Amount_THB'].sum()
            sales_barfine = group[group['Description'].str.contains('Barfine', case=False, na=False)]['Amount_THB'].sum()
            
            exp_salaries = group[group['Category'].isin(['Salary', 'Salary_Sheet'])]['Amount_THB'].sum() * -1
            exp_agents = group[group['Description'].str.contains('Ag ', case=False, na=False)]['Amount_THB'].sum() * -1

            net_profit = total_sales - total_expenses

            # --- INSERTION / UPDATE ---
            report = DailyReport.query.filter_by(location_id=location.id, date=date.date()).first()
            
            if not report:
                report = DailyReport(location_id=location.id, date=date.date())
                db.session.add(report)
            
            # Mise à jour
            report.total_sales = float(total_sales)
            report.total_expenses = float(total_expenses)
            report.net_profit = float(net_profit)
            
            # Mise à jour des colonnes si elles existent dans le modèle
            if hasattr(report, 'sales_ladydrink'): report.sales_ladydrink = float(sales_ladydrink)
            if hasattr(report, 'sales_barfine'): report.sales_barfine = float(sales_barfine)
            if hasattr(report, 'exp_salaries'): report.exp_salaries = float(exp_salaries)
            if hasattr(report, 'exp_agents'): report.exp_agents = float(exp_agents)

            count += 1
        
        db.session.commit()
        print(f"🎉 Succès ! {count} rapports injectés dans la base de données.")

if __name__ == '__main__':
    run_import()
