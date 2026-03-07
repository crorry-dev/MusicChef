# Beitragen zu MusicChef

Danke für dein Interesse! Hier ein paar Hinweise:

## Entwicklung

```bash
# Frontend starten
cd frontend
npm install
npm run dev

# Backend starten (optional)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

## Code-Stil

- **Frontend:** ESM, funktionale React-Komponenten, CSS-Klassen nach BEM-Konvention
- **Backend:** PEP 8, Type Hints, ruff als Linter

## Commits

Wir nutzen [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` – Neues Feature
- `fix:` – Bugfix
- `refactor:` – Code-Umbau ohne Funktionsänderung
- `docs:` – Dokumentation
- `chore:` – Build, CI, Abhängigkeiten

## Pull Requests

1. Fork das Repository
2. Erstelle einen Feature-Branch (`git checkout -b feat/mein-feature`)
3. Committe deine Änderungen
4. Erstelle einen Pull Request gegen `main`
