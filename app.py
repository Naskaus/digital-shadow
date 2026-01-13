from flask import Flask, send_from_directory
from flask_cors import CORS
from models import db
from routes.auth_routes import auth_bp
from routes.data_routes import data_bp
from routes.admin_routes import admin_bp
from routes.export_routes import export_bp
import config
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_app():
    app = Flask(__name__, static_folder='frontend', static_url_path='')
    
    # Configuration
    app.config.from_object(config)
    app.config.update(config.SESSION_CONFIG)
    
    # Initialize Extensions
    db.init_app(app)
    CORS(app, supports_credentials=True)
    
    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(data_bp, url_prefix='/api')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(export_bp, url_prefix='/api/export')
    
    # Serve frontend
    @app.route('/')
    def serve_index():
        return send_from_directory(app.static_folder, 'index.html')
    
    return app

app = create_app()

if __name__ == '__main__':
    # Ensure tables are created (dev mode)
    with app.app_context():
        db.create_all()
    
    app.run(host='0.0.0.0', port=5000, debug=True)
