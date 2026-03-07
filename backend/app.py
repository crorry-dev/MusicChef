import os
import secrets
from flask import Flask
from flask_cors import CORS
from flask_session import Session


def create_app():
    app = Flask(__name__)

    app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY') or secrets.token_hex(32)
    app.config['SESSION_TYPE'] = 'filesystem'
    app.config['SESSION_FILE_DIR'] = './flask_session'
    app.config['SESSION_PERMANENT'] = False
    app.config['SESSION_USE_SIGNER'] = True

    os.makedirs('./flask_session', exist_ok=True)

    Session(app)

    CORS(
        app,
        origins=['http://localhost:5173', 'http://127.0.0.1:5173'],
        supports_credentials=True,
    )
    
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
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(debug=debug, port=5000)
