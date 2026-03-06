import os
from flask import Flask
from flask_cors import CORS
from flask_session import Session
from dotenv import load_dotenv

load_dotenv()

def create_app():
    app = Flask(__name__)
    
    app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['SESSION_TYPE'] = 'filesystem'
    app.config['SESSION_FILE_DIR'] = './flask_session'
    app.config['SESSION_PERMANENT'] = False
    app.config['SESSION_USE_SIGNER'] = True
    
    # Create session directory
    os.makedirs('./flask_session', exist_ok=True)
    
    Session(app)
    
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
    CORS(app, origins=[frontend_url], supports_credentials=True)
    
    from routers.auth import auth_bp
    from routers.quiz import quiz_bp
    from routers.history import history_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(quiz_bp, url_prefix='/api/quiz')
    app.register_blueprint(history_bp, url_prefix='/api/history')
    
    @app.route('/api/health')
    def health():
        return {'status': 'ok'}
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
