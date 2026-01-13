from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Location(db.Model):
    __tablename__ = 'locations'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    slug = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    city = db.Column(db.String(10), nullable=False)  # 'BKK' or 'PTY'
    zone = db.Column(db.String(100), nullable=False) # 'Soi Cowboy', etc.
    opened_date = db.Column(db.Date, nullable=True)
    
    reports = db.relationship('DailyReport', backref='location', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'slug': self.slug,
            'name': self.name,
            'city': self.city,
            'zone': self.zone,
            'opened_date': self.opened_date.isoformat() if self.opened_date else None
        }

class DailyReport(db.Model):
    __tablename__ = 'daily_reports'
    __table_args__ = (db.UniqueConstraint('location_id', 'date', name='_location_date_uc'),)
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    location_id = db.Column(db.Integer, db.ForeignKey('locations.id'), nullable=False)
    date = db.Column(db.Date, nullable=False, index=True)
    year = db.Column(db.Integer, nullable=False, index=True)
    is_closed = db.Column(db.Boolean, default=False)
    
    # Sales
    sales_client = db.Column(db.Float, default=0.0)
    sales_ladydrink = db.Column(db.Float, default=0.0)
    sales_barfine = db.Column(db.Float, default=0.0)
    sales_cc_fees = db.Column(db.Float, default=0.0)
    total_sales = db.Column(db.Float, default=0.0)
    
    # Expenses
    exp_salaries = db.Column(db.Float, default=0.0)
    exp_agents = db.Column(db.Float, default=0.0)
    exp_bonus = db.Column(db.Float, default=0.0)
    exp_misc = db.Column(db.Float, default=0.0)
    exp_payback = db.Column(db.Float, default=0.0)
    total_expenses = db.Column(db.Float, default=0.0)
    
    # Profits
    profit_cash = db.Column(db.Float, default=0.0)
    profit_cc = db.Column(db.Float, default=0.0)
    net_profit = db.Column(db.Float, default=0.0)
    
    # Counts
    count_bills = db.Column(db.Integer, default=0)
    count_dancers = db.Column(db.Integer, default=0)
    count_pr = db.Column(db.Integer, default=0)
    count_pingpong = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {
            'id': self.id,
            'location_id': self.location_id,
            'date': self.date.isoformat(),
            'year': self.year,
            'is_closed': self.is_closed,
            'sales_client': self.sales_client,
            'sales_ladydrink': self.sales_ladydrink,
            'sales_barfine': self.sales_barfine,
            'sales_cc_fees': self.sales_cc_fees,
            'total_sales': self.total_sales,
            'exp_salaries': self.exp_salaries,
            'exp_agents': self.exp_agents,
            'exp_bonus': self.exp_bonus,
            'exp_misc': self.exp_misc,
            'exp_payback': self.exp_payback,
            'total_expenses': self.total_expenses,
            'profit_cash': self.profit_cash,
            'profit_cc': self.profit_cc,
            'net_profit': self.net_profit,
            'count_bills': self.count_bills,
            'count_dancers': self.count_dancers,
            'count_pr': self.count_pr,
            'count_pingpong': self.count_pingpong
        }
