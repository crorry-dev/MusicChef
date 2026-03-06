from flask import Blueprint, session, jsonify

history_bp = Blueprint('history', __name__)

@history_bp.route('/')
def get_history():
    history = session.get('quiz_history', [])
    # Return most recent first
    return jsonify({'history': list(reversed(history))})

@history_bp.route('/clear', methods=['DELETE'])
def clear_history():
    session['quiz_history'] = []
    return jsonify({'success': True})
