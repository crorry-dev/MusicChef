from flask import Blueprint, request, jsonify
import spotipy

auth_bp = Blueprint('auth', __name__)


def get_spotify_client():
    """Create Spotify client from the Authorization header token."""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None
    token = auth_header.removeprefix('Bearer ').strip()
    if not token:
        return None
    return spotipy.Spotify(auth=token)


@auth_bp.route('/me')
def me():
    sp = get_spotify_client()
    if not sp:
        return jsonify({'authenticated': False}), 200
    try:
        user = sp.current_user()
        return jsonify({
            'authenticated': True,
            'user': {
                'id': user['id'],
                'display_name': user.get('display_name', user['id']),
                'email': user.get('email', ''),
                'image': user['images'][0]['url'] if user.get('images') else None,
            },
        })
    except Exception:
        return jsonify({'authenticated': False}), 200
