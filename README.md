# MusicChef 🎵🧑‍🍳

> Spotify-basiertes Musik-Quiz & Entdecken-Modus – rate Interpret, Titel und Jahr zu Songs aus 48 Genres, entdecke neue Musik per Swipe und exportiere deine Favoriten als Playlist.

[![Deploy to GitHub Pages](https://github.com/crorry-dev/MusicChef/actions/workflows/deploy.yml/badge.svg)](https://github.com/crorry-dev/MusicChef/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Live Demo:** [crorry-dev.github.io/MusicChef](https://crorry-dev.github.io/MusicChef/)

---

## Features

### Quiz

| Feature | Beschreibung |
|---------|-------------|
| 🎤 **48 Genres** | Von Afrobeats bis Volksmusik – alphabetisch sortiert, mit Regionfilter (Europa, Nordamerika, Lateinamerika, Afrika, Asien, International) |
| 🎵 **Mehrfachauswahl** | Mehrere Genres gleichzeitig wählen oder zufällig mischen |
| 🎧 **Spotify Playback** | Volle Wiedergabe via Web Playback SDK (Premium) oder 30s-Preview als Fallback |
| ✏️ **Freitext-Modus** | Antworten frei eintippen – Fuzzy-Matching erkennt auch Teiltreffer |
| 🔘 **Multiple-Choice** | 4 Auswahlmöglichkeiten pro Feld mit intelligenten Distraktoren |
| ⚡ **Speed-Bonus** | Schneller antworten = mehr Punkte (2×, 1.5×, 1.2×, 1×) |
| 🖼️ **Cover-Modus** | Albumcover: komplett verborgen, weichgezeichnet oder sichtbar – frei wählbar |
| 📋 **Playlist-Quiz** | Eigene Spotify-Playlists als Quiz-Grundlage nutzen |
| 📅 **Jahresfilter** | Nur Songs aus einem bestimmten Zeitraum quizzen |
| 🏆 **Ergebnisseite** | Detaillierte Auswertung nach jedem Quiz |
| ⌨️ **Tastatursteuerung** | Enter zum Absenden / nächste Frage |

### Entdecken-Modus

| Feature | Beschreibung |
|---------|-------------|
| 🔀 **Swipe Discovery** | Tinder-artiges Durchblättern neuer Songs – Like, Skip oder Playlist hinzufügen |
| 🎭 **Stimmungen** | 8 Moods: Chill, Party, Workout, Focus, Romantisch, Melancholisch, Feel Good, Road Trip |
| 🌍 **Multi-Genre-Filter** | Mehrere Genres gleichzeitig kombinieren |
| 🎲 **Zufallsmodus** | Komplett ohne Filter – lass dich überraschen |

### Verlauf & Playlists

| Feature | Beschreibung |
|---------|-------------|
| 📊 **Quiz-Verlauf** | Alle vergangenen Quizze mit Ergebnis und Details |
| 🔄 **Quiz wiederholen** | Jedes gespielte Quiz direkt nochmal starten |
| 💾 **Als Playlist speichern** | Songs eines Quizzes als Spotify-Playlist exportieren |

### Sonstiges

| Feature | Beschreibung |
|---------|-------------|
| ⚙️ **Einstellungen** | Client ID, Design (Dark/Light/System), Daten verwalten |
| ❤️ **Spendenseite** | Transparente Kostenaufstellung und einfache Unterstützung via PayPal |
| 🌗 **Themes** | Dark, Light und System-Theme |

## Technologie

| Bereich | Stack |
|---------|-------|
| Frontend | React 18, Vite 5, React Router 6 |
| Styling | Custom CSS (Dark Theme, responsive) |
| Auth | Spotify PKCE OAuth 2.0 (rein clientseitig) |
| Playback | Spotify Web Playback SDK + Audio Preview Fallback |
| Quiz-Engine | Clientseitige Logik (Fuzzy-Matching, Scoring, Choice-Generation) |
| Hosting | GitHub Pages mit SPA-Routing (404.html) |
| CI/CD | GitHub Actions (auto-deploy bei Push auf `main`) |
| Backend | Flask 3.0 (optional, für serverseitige Features) |

## Schnellstart

### Voraussetzungen

- [Node.js](https://nodejs.org/) 18+
- Ein [Spotify-Konto](https://www.spotify.com/) (Premium empfohlen für volle Wiedergabe)

### 1. Spotify App erstellen

1. Gehe zum [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Erstelle eine neue App
3. Füge folgende **Redirect URIs** hinzu:
   - `http://127.0.0.1:5173/callback` (lokale Entwicklung)
   - `https://crorry-dev.github.io/MusicChef/callback` (GitHub Pages)
4. Kopiere die **Client ID**

### 2. Frontend starten

```bash
cd frontend
npm install
npm run dev
```

Die App läuft auf **http://127.0.0.1:5173/**

Beim ersten Besuch wirst du nach deiner Spotify Client ID gefragt – einmal eingeben, wird im Browser gespeichert.

### 3. Optional: Backend starten

Das Backend wird nur für serverseitige Features (History etc.) benötigt. Das Quiz selbst läuft komplett clientseitig.

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # Dann .env bearbeiten
python app.py
```

## Projektstruktur

```
MusicChef/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Pages CI/CD
├── backend/
│   ├── app.py                  # Flask App Factory
│   ├── requirements.txt        # Python-Abhängigkeiten
│   └── routers/
│       ├── auth.py             # Spotify OAuth Endpoints
│       ├── quiz.py             # Quiz API (optional)
│       └── history.py          # Verlauf API (optional)
├── frontend/
│   ├── package.json
│   ├── vite.config.js          # Vite-Konfiguration (base: /MusicChef/)
│   ├── index.html
│   ├── public/
│   │   └── 404.html            # SPA-Routing für GitHub Pages
│   └── src/
│       ├── App.jsx             # Router & Auth-Provider
│       ├── main.jsx            # Entry Point
│       ├── index.css           # Globale Styles (Dark/Light Theme)
│       ├── api.js              # Axios API-Client (Backend)
│       ├── context/
│       │   ├── AuthContext.jsx  # Auth-State (Token, User)
│       │   └── ThemeContext.jsx # Dark/Light/System Theme
│       ├── components/
│       │   ├── Navbar.jsx      # Navigation mit Profil-Dropdown
│       │   └── GenreIcon.jsx   # Genre-spezifische Icons
│       ├── lib/
│       │   ├── spotify-pkce.js  # PKCE OAuth Flow
│       │   ├── spotify-api.js   # Spotify Web API (Tracks, Playlists, Search)
│       │   ├── spotify-player.js# Web Playback SDK Wrapper
│       │   ├── quiz-engine.js   # Quiz-Logik, Scoring, Choices, History
│       │   ├── genres.js        # 48 Genres mit Regionfilter
│       │   └── icons.jsx        # Lucide-Icon Re-Exports
│       └── pages/
│           ├── SetupPage.jsx    # Client-ID Eingabe
│           ├── LoginPage.jsx    # Spotify Login
│           ├── CallbackPage.jsx # OAuth Callback
│           ├── HomePage.jsx     # Genre/Playlist-Auswahl, Quiz-Setup
│           ├── QuizPage.jsx     # Quiz mit Player, Timer, Choices
│           ├── ResultsPage.jsx  # Ergebnisauswertung
│           ├── HistoryPage.jsx  # Quiz-Verlauf (Replay & Playlist-Export)
│           ├── TinderPage.jsx   # Entdecken-Modus (Moods, Multi-Genre)
│           ├── SettingsPage.jsx # Einstellungen (Client ID, Theme, Daten)
│           └── DonatePage.jsx   # Spendenseite (PayPal-Presets)
├── .gitignore
├── LICENSE                      # MIT
├── CONTRIBUTING.md
└── README.md
```

## Quiz-Modi & Einstellungen

### Eingabemodus
- **Freitext** – Antworten frei eintippen, Fuzzy-Matching erkennt Ähnlichkeit
- **4 Auswahlmöglichkeiten** – Multiple-Choice mit intelligenten Distraktoren

### Spielmodi
- **Speed-Bonus** – Antworte schneller für mehr Punkte:
  - ≤ 5 Sekunden → 2× Punkte
  - ≤ 10 Sekunden → 1.5× Punkte
  - ≤ 20 Sekunden → 1.2× Punkte
  - \> 20 Sekunden → 1× Punkte
- **Cover-Modus** – Albumcover-Verhalten wählbar:
  - *Sichtbar* – Cover immer sichtbar
  - *Weichgezeichnet* – Cover verschwommen, wird bei Antwort aufgedeckt
  - *Verborgen* – Kein Cover sichtbar

### Rate-Felder
Frei wählbar – jede Kombination aus:
- 🎤 Interpret
- 🎵 Titel
- 📅 Jahr

### Genre-Auswahl
- Einzelnes Genre oder Mehrfachauswahl
- Regionfilter: Europa, Nordamerika, Lateinamerika, Afrika, Asien, International
- Eigene Spotify-Playlists als Alternative

## Architektur

```
┌─────────────────────────────────────────────┐
│                   Browser                    │
├──────────────┬──────────────┬───────────────┤
│  React SPA   │  Quiz Engine │  Spotify SDK  │
│  (UI/Router) │  (Scoring)   │  (Playback)   │
├──────────────┴──────────────┴───────────────┤
│              Spotify Web API                 │
│  (Tracks, Playlists, Search, Player)         │
├─────────────────────────────────────────────┤
│          Spotify PKCE OAuth 2.0             │
│  (Token im localStorage, kein Backend)       │
└─────────────────────────────────────────────┘
```

Die gesamte Quiz-Logik läuft **clientseitig** – kein Backend nötig für das Kernfeature. Spotify PKCE OAuth ermöglicht sichere Authentifizierung ohne Server-Secret.

## Deployment

### GitHub Pages (automatisch)

Bei jedem Push auf `main` wird automatisch via GitHub Actions deployed:

1. `npm ci` → `npm run build` im `frontend/`-Ordner
2. Build-Artefakte (`dist/`) werden auf GitHub Pages deployed
3. SPA-Routing funktioniert via `404.html` Redirect

### Manuell

```bash
cd frontend
npm run build
# dist/ Ordner auf beliebigen Static-Host deployen
```

## Lizenz

[MIT](LICENSE) – © 2026 crorry-dev
