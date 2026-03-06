import os
import uuid
import re
import random
from datetime import datetime, timezone
from flask import Blueprint, request, session, jsonify
from routers.auth import get_spotify_client

quiz_bp = Blueprint('quiz', __name__)

GENRE_PLAYLISTS = {
    'deutschrap': {'name': 'Deutschrap', 'search': 'deutschrap', 'emoji': '🇩🇪'},
    'hiphop': {'name': 'Hip-Hop', 'search': 'hip-hop', 'emoji': '🎤'},
    'pop': {'name': 'Pop', 'search': 'pop hits', 'emoji': '🎵'},
    'rock': {'name': 'Rock', 'search': 'rock classics', 'emoji': '🎸'},
    'rnb': {'name': 'R&B', 'search': 'rnb soul', 'emoji': '🎶'},
    'electronic': {'name': 'Electronic', 'search': 'electronic dance', 'emoji': '🎧'},
    'latin': {'name': 'Latin', 'search': 'latin hits', 'emoji': '💃'},
    'jazz': {'name': 'Jazz', 'search': 'jazz classics', 'emoji': '🎷'},
    'klassik': {'name': 'Klassik', 'search': 'classical music', 'emoji': '🎻'},
    'metal': {'name': 'Metal', 'search': 'heavy metal', 'emoji': '🤘'},
    'indie': {'name': 'Indie', 'search': 'indie rock alternative', 'emoji': '🌿'},
    'schlager': {'name': 'Schlager', 'search': 'schlager deutsch', 'emoji': '🌸'},
}

def normalize(text):
    """Normalize text for comparison: lowercase, remove punctuation."""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def check_answer(user_answer, correct_answer):
    """Returns True if user_answer is close enough to correct_answer."""
    user_norm = normalize(user_answer)
    correct_norm = normalize(correct_answer)
    
    if not user_norm:
        return False
    
    # Exact match
    if user_norm == correct_norm:
        return True
    
    # User answer contained in correct or vice versa (handles "feat." additions etc.)
    if user_norm in correct_norm or correct_norm in user_norm:
        return True
    
    # Check word overlap: if user typed main words correctly
    user_words = set(w for w in user_norm.split() if len(w) > 2)
    correct_words = set(w for w in correct_norm.split() if len(w) > 2)
    
    if user_words and correct_words:
        overlap = user_words & correct_words
        if len(overlap) / max(len(correct_words), 1) >= 0.6:
            return True
    
    return False

def fetch_tracks_for_genre(sp, genre_key, count=30):
    """Fetch tracks for a genre from Spotify search."""
    genre_info = GENRE_PLAYLISTS.get(genre_key, {'search': genre_key})
    search_query = genre_info.get('search', genre_key)
    
    tracks = []
    
    # Search for playlists
    results = sp.search(q=search_query, type='playlist', limit=5)
    playlists = results.get('playlists', {}).get('items', [])
    
    for playlist in playlists[:3]:
        if not playlist:
            continue
        try:
            pl_tracks = sp.playlist_tracks(playlist['id'], limit=50)
            items = pl_tracks.get('items', [])
            for item in items:
                track = item.get('track')
                if track and track.get('preview_url'):
                    tracks.append({
                        'id': track['id'],
                        'title': track['name'],
                        'artist': track['artists'][0]['name'],
                        'all_artists': ', '.join(a['name'] for a in track['artists']),
                        'album': track['album']['name'],
                        'preview_url': track['preview_url'],
                        'image': track['album']['images'][0]['url'] if track['album'].get('images') else None,
                        'spotify_url': track['external_urls'].get('spotify', ''),
                    })
        except Exception:
            continue
    
    # Deduplicate by id
    seen = set()
    unique_tracks = []
    for t in tracks:
        if t['id'] not in seen:
            seen.add(t['id'])
            unique_tracks.append(t)
    
    random.shuffle(unique_tracks)
    return unique_tracks[:count]

def fetch_tracks_for_playlist(sp, playlist_id, count=20):
    """Fetch tracks from a specific playlist."""
    tracks = []
    offset = 0
    while len(tracks) < 100:
        result = sp.playlist_tracks(playlist_id, limit=50, offset=offset)
        items = result.get('items', [])
        if not items:
            break
        for item in items:
            track = item.get('track')
            if track and track.get('preview_url'):
                tracks.append({
                    'id': track['id'],
                    'title': track['name'],
                    'artist': track['artists'][0]['name'],
                    'all_artists': ', '.join(a['name'] for a in track['artists']),
                    'album': track['album']['name'],
                    'preview_url': track['preview_url'],
                    'image': track['album']['images'][0]['url'] if track['album'].get('images') else None,
                    'spotify_url': track['external_urls'].get('spotify', ''),
                })
        offset += 50
        if len(items) < 50:
            break
    
    random.shuffle(tracks)
    return tracks[:count]

def fetch_random_tracks(sp, count=20):
    """Fetch random tracks using random search."""
    tracks = []
    chars = list('abcdefghijklmnopqrstuvwxyz')
    for _ in range(5):
        char = random.choice(chars)
        offset = random.randint(0, 100)
        results = sp.search(q=char, type='track', limit=20, offset=offset)
        items = results.get('tracks', {}).get('items', [])
        for track in items:
            if track.get('preview_url'):
                tracks.append({
                    'id': track['id'],
                    'title': track['name'],
                    'artist': track['artists'][0]['name'],
                    'all_artists': ', '.join(a['name'] for a in track['artists']),
                    'album': track['album']['name'],
                    'preview_url': track['preview_url'],
                    'image': track['album']['images'][0]['url'] if track['album'].get('images') else None,
                    'spotify_url': track['external_urls'].get('spotify', ''),
                })
    seen = set()
    unique = []
    for t in tracks:
        if t['id'] not in seen:
            seen.add(t['id'])
            unique.append(t)
    random.shuffle(unique)
    return unique[:count]

@quiz_bp.route('/genres')
def genres():
    genres_list = [
        {'id': k, 'name': v['name'], 'emoji': v['emoji']}
        for k, v in GENRE_PLAYLISTS.items()
    ]
    return jsonify({'genres': genres_list})

@quiz_bp.route('/start')
def start():
    sp = get_spotify_client()
    if not sp:
        return jsonify({'error': 'Not authenticated'}), 401
    
    genre = request.args.get('genre', 'random')
    count = min(int(request.args.get('count', 10)), 20)
    mode = request.args.get('mode', 'genre')  # genre, random, playlist
    playlist_id = request.args.get('playlist_id', None)
    
    try:
        if mode == 'playlist' and playlist_id:
            tracks = fetch_tracks_for_playlist(sp, playlist_id, count * 3)
        elif mode == 'random' or genre == 'random':
            tracks = fetch_random_tracks(sp, count * 3)
        else:
            tracks = fetch_tracks_for_genre(sp, genre, count * 3)
        
        if len(tracks) < count:
            count = len(tracks)
        
        if count == 0:
            return jsonify({'error': 'No tracks with preview found for this selection'}), 404
        
        selected_tracks = tracks[:count]
        quiz_id = str(uuid.uuid4())
        
        quiz_data = {
            'id': quiz_id,
            'genre': genre,
            'mode': mode,
            'playlist_id': playlist_id,
            'tracks': selected_tracks,
            'current_index': 0,
            'answers': [],
            'score': 0,
            'total_questions': len(selected_tracks),
        }
        session[f'quiz_{quiz_id}'] = quiz_data
        
        first_track = selected_tracks[0]
        return jsonify({
            'quiz_id': quiz_id,
            'total_questions': len(selected_tracks),
            'question': {
                'index': 0,
                'preview_url': first_track['preview_url'],
                'image': first_track['image'],
                'question_number': 1,
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@quiz_bp.route('/answer', methods=['POST'])
def answer():
    data = request.get_json()
    quiz_id = data.get('quiz_id')
    user_artist = data.get('artist', '').strip()
    user_title = data.get('title', '').strip()
    
    quiz_data = session.get(f'quiz_{quiz_id}')
    if not quiz_data:
        return jsonify({'error': 'Quiz not found'}), 404
    
    current_index = quiz_data['current_index']
    if current_index >= len(quiz_data['tracks']):
        return jsonify({'error': 'Quiz already finished'}), 400
    
    track = quiz_data['tracks'][current_index]
    
    artist_correct = check_answer(user_artist, track['artist']) or check_answer(user_artist, track['all_artists'])
    title_correct = check_answer(user_title, track['title'])
    
    points = 0
    if artist_correct:
        points += 50
    if title_correct:
        points += 50
    
    quiz_data['score'] += points
    quiz_data['answers'].append({
        'track': track,
        'user_artist': user_artist,
        'user_title': user_title,
        'artist_correct': artist_correct,
        'title_correct': title_correct,
        'points': points,
    })
    quiz_data['current_index'] += 1
    
    next_index = quiz_data['current_index']
    finished = next_index >= quiz_data['total_questions']
    
    response = {
        'artist_correct': artist_correct,
        'title_correct': title_correct,
        'points': points,
        'total_score': quiz_data['score'],
        'correct_artist': track['artist'],
        'correct_title': track['title'],
        'finished': finished,
    }
    
    if not finished:
        next_track = quiz_data['tracks'][next_index]
        response['next_question'] = {
            'index': next_index,
            'preview_url': next_track['preview_url'],
            'image': next_track['image'],
            'question_number': next_index + 1,
        }
    else:
        response['results'] = {
            'quiz_id': quiz_id,
            'genre': quiz_data['genre'],
            'mode': quiz_data['mode'],
            'score': quiz_data['score'],
            'total_questions': quiz_data['total_questions'],
            'max_score': quiz_data['total_questions'] * 100,
            'answers': quiz_data['answers'],
        }
        # Save to history
        user = session.get('user', {})
        history = session.get('quiz_history', [])
        history.append({
            'quiz_id': quiz_id,
            'genre': quiz_data['genre'],
            'mode': quiz_data['mode'],
            'score': quiz_data['score'],
            'total_questions': quiz_data['total_questions'],
            'max_score': quiz_data['total_questions'] * 100,
            'answers': quiz_data['answers'],
            'user_id': user.get('id', 'anonymous'),
            'played_at': datetime.now(timezone.utc).isoformat(),
        })
        session['quiz_history'] = history
    
    session[f'quiz_{quiz_id}'] = quiz_data
    return jsonify(response)

@quiz_bp.route('/results/<quiz_id>')
def results(quiz_id):
    quiz_data = session.get(f'quiz_{quiz_id}')
    if not quiz_data:
        # Check history
        history = session.get('quiz_history', [])
        for h in history:
            if h['quiz_id'] == quiz_id:
                return jsonify(h)
        return jsonify({'error': 'Quiz not found'}), 404
    
    return jsonify({
        'quiz_id': quiz_id,
        'genre': quiz_data['genre'],
        'mode': quiz_data['mode'],
        'score': quiz_data['score'],
        'total_questions': quiz_data['total_questions'],
        'max_score': quiz_data['total_questions'] * 100,
        'answers': quiz_data['answers'],
        'current_index': quiz_data['current_index'],
    })

@quiz_bp.route('/playlists')
def user_playlists():
    sp = get_spotify_client()
    if not sp:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        result = sp.current_user_playlists(limit=50)
        playlists = []
        for pl in result.get('items', []):
            playlists.append({
                'id': pl['id'],
                'name': pl['name'],
                'tracks': pl['tracks']['total'],
                'image': pl['images'][0]['url'] if pl.get('images') else None,
            })
        return jsonify({'playlists': playlists})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
