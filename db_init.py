from flask import Flask
from models import db, Location
import config

def init_db():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = config.SQLALCHEMY_DATABASE_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = config.SQLALCHEMY_TRACK_MODIFICATIONS
    
    db.init_app(app)
    
    with app.app_context():
        db.create_all()
        
        # Initial locations data
        locations_data = [
            ('shark_bkk', 'Shark', 'BKK', 'Soi Cowboy'),
            ('mandarin', 'Mandarin', 'BKK', 'Nana'),
            ('red_dragon', 'Red Dragon', 'BKK', 'Nana'),
            ('fahrenheit', 'Fahrenheit', 'PTY', 'Walking Street'),
            ('bliss', 'Bliss', 'PTY', 'Walking Street'),
            ('geisha', 'Geisha', 'PTY', 'Walking Street'),
            ('shark_pty', 'Shark', 'PTY', 'Walking Street')
        ]
        
        for slug, name, city, zone in locations_data:
            existing = Location.query.filter_by(slug=slug).first()
            if not existing:
                loc = Location(slug=slug, name=name, city=city, zone=zone)
                db.session.add(loc)
        
        db.session.commit()
        print("Database initialized and locations seeded.")

if __name__ == '__main__':
    init_db()
