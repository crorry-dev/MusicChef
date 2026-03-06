import os
import json
from flask import Blueprint, redirect, request, session, jsonify
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from dotenv import load_dotenv

load_dotenv()

auth_bp = Blueprint('auth', __name__)

SPOTIFY_SCOPES = (
    "user-read-private user-read-email streaming "
    "user-modify-playback-state user-read-playback-state "
    "playlist-read-private playlist-read-collaborative"
)

def get_spotify_oauth():
    return SpotifyOAuth(
        client_id=os.getenv('SPOTIFY_CLIENT_ID'),
        client_secret=os.getenv('SPOTIFY_CLIENT_SECRET'),
        redirect_uri=os.getenv('SPOTIFY_REDIRECT_URI', 'http://localhost:5000/api/auth/callback'),
        scope=SPOTIFY_SCOPES,
        cache_handler=spotipy.cache_handler.MemoryCacheHandler(),
        show_dialog=True
    )

def get_spotify_client():
    token_info = session.get('token_info')
    if not token_info:
        return None
    sp_oauth = get_spotify_oauth()
    if sp_oauth.is_token_expired(token_info):
        token_info = sp_oauth.refresh_access_token(token_info['refresh_token'])
        session['token_info'] = token_info
    return spotipy.Spotify(auth=token_info['access_token'])

@auth_bp.route('/login')
def login():
    sp_oauth = get_spotify_oauth()
    auth_url = sp_oauth.get_authorize_url()
    return redirect(auth_url)

@auth_bp.route('/callback')
def callback():
    code = request.args.get('code')
    error = request.args.get('error')
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
    
    if error:
        return redirect(f"{frontend_url}/?error={error}")
    
    sp_oauth = get_spotify_oauth()
    token_info = sp_oauth.get_access_token(code, as_dict=True)
    session['token_info'] = token_info
    
    # Fetch and cache user profile
    sp = spotipy.Spotify(auth=token_info['access_token'])
    user = sp.current_user()
    session['user'] = {
        'id': user['id'],
        'display_name': user.get('display_name', user['id']),
        'email': user.get('email', ''),
        'image': user['images'][0]['url'] if user.get('images') else None,
    }
    
    return redirect(f"{frontend_url}/")

@auth_bp.route('/me')
def me():
    user = session.get('user')
    token_info = session.get('token_info')
    if not user or not token_info:
        return jsonify({'authenticated': False}), 200
    
    sp = get_spotify_client()
    if not sp:
        return jsonify({'authenticated': False}), 200
    
    return jsonify({'authenticated': True, 'user': user})

@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})

@auth_bp.route('/token')
def token():
    token_info = session.get('token_info')
    if not token_info:
        return jsonify({'error': 'Not authenticated'}), 401
    
    sp_oauth = get_spotify_oauth()
    if sp_oauth.is_token_expired(token_info):
        token_info = sp_oauth.refresh_access_token(token_info['refresh_token'])
        session['token_info'] = token_info
    
    return jsonify({'access_token': token_info['access_token']})
