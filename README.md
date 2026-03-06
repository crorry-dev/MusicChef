# MusicChef 🎵

Eine Spotify-basierte Music-Quiz-Web-App. Lerne Musik kennen – spielerisch und unterhaltsam!

## Features

- **Spotify Login** – Authentifizierung über dein Spotify-Konto
- **Genre-Quizzes** – Wähle aus 12 Genres (Deutschrap, Hip-Hop, Pop, Rock, R&B, Electronic, Latin, Jazz, Klassik, Metal, Indie, Schlager)
- **Zufälliges Quiz** – Zufällige Tracks aus dem gesamten Spotify-Katalog
- **Playlist-Quiz** – Nutze deine eigenen Spotify-Playlists als Quiz-Grundlage
- **30s Vorschau** – Jeder Track wird als 30-sekündige Vorschau abgespielt
- **Punktesystem** – 50 Punkte für Interpret, 50 Punkte für Titel (max. 100 pro Frage)
- **Fuzzy-Matching** – Teilrichtige Antworten werden erkannt (Groß-/Kleinschreibung egal)
- **Verlauf** – Vergangene Quizzes mit Score und Detailansicht
- **Tastaturkürzel** – Enter zum Absenden / nächste Frage

## Technologie

| Bereich | Technologie |
|---------|-------------|
| Backend | Python 3.11+, Flask 3.0, Spotipy, Flask-Session, Flask-CORS |
| Frontend | React 18, Vite 5, React Router 6, Axios |
| Auth | Spotify OAuth 2.0 Authorization Code Flow |

## Schnellstart

### 1. Spotify App erstellen

1. Gehe zu [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Erstelle eine neue App
3. Füge `http://localhost:5000/api/auth/callback` als Redirect URI hinzu
4. Kopiere **Client ID** und **Client Secret**

### 2. Backend starten

```bash
cd backend
cp .env.example .env
# .env bearbeiten und Spotify-Credentials eintragen
pip install -r requirements.txt
python app.py
```

Das Backend läuft auf `http://localhost:5000`

### 3. Frontend starten

```bash
cd frontend
npm install
npm run dev
```

Das Frontend läuft auf `http://localhost:5173`

### 4. App öffnen

Öffne `http://localhost:5173` im Browser und melde dich mit deinem Spotify-Konto an.

## Konfiguration (`.env`)

```env
SPOTIFY_CLIENT_ID=deine_client_id
SPOTIFY_CLIENT_SECRET=dein_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:5000/api/auth/callback
FLASK_SECRET_KEY=ein_langer_geheimer_schluessel
FRONTEND_URL=http://localhost:5173
FLASK_DEBUG=false
```

## Projektstruktur

```
MusicChef/
├── backend/
│   ├── app.py              # Flask App Factory
│   ├── requirements.txt    # Python-Abhängigkeiten
│   ├── .env.example        # Beispiel-Konfiguration
│   └── routers/
│       ├── auth.py         # Spotify OAuth Endpoints
│       ├── quiz.py         # Quiz-Logik & Endpoints
│       └── history.py      # Verlauf-Endpoints
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── api.js
        ├── index.css
        ├── context/
        │   └── AuthContext.jsx
        └── pages/
            ├── LoginPage.jsx
            ├── HomePage.jsx
            ├── QuizPage.jsx
            ├── ResultsPage.jsx
            └── HistoryPage.jsx
```

## API-Endpunkte

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/api/auth/login` | Spotify OAuth starten |
| GET | `/api/auth/callback` | OAuth Callback |
| GET | `/api/auth/me` | Aktueller Nutzer |
| POST | `/api/auth/logout` | Abmelden |
| GET | `/api/quiz/genres` | Verfügbare Genres |
| GET | `/api/quiz/start` | Quiz starten |
| POST | `/api/quiz/answer` | Antwort absenden |
| GET | `/api/quiz/playlists` | Nutzer-Playlists |
| GET | `/api/history/` | Quiz-Verlauf |
| DELETE | `/api/history/clear` | Verlauf löschen |
