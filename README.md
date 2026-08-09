# Curoa.AI

**Understand your health. Take the next step.**

Curoa.AI is a healthcare-focused website in the style of ChatGPT/Claude, built to
eventually host an AI medical chatbot. This repository currently ships the
**complete site and architecture** — frontend, backend API, and database schema —
with the chatbot itself left as a clearly marked placeholder so it can be dropped
in later without reshaping the rest of the app.

> ⚠️ **Medical disclaimer**: Curoa.AI provides general health information and
> self-care guidance. It is not a substitute for professional medical advice,
> diagnosis, or treatment, and it does not promise a cure. If you are
> experiencing severe or emergency symptoms, contact a doctor or emergency
> services immediately. This disclaimer is shown throughout the product
> (composer, auth pages, and every chat response).

---

## Project structure

```
curoa-ai/
├── frontend/                 # HTML, CSS, vanilla JS — no build step required
│   ├── index.html             # Chat workspace (sidebar + chat + hospitals rail)
│   ├── hospitals.html         # Full hospital search/filter/detail page
│   ├── login.html / signup.html
│   ├── css/
│   │   ├── style.css          # Design tokens, shared components, dark mode
│   │   ├── chat.css           # 3-pane chat workspace layout
│   │   ├── hospitals.css      # Hospitals search page layout
│   │   └── auth.css           # Login / sign up layout
│   ├── js/
│   │   ├── api.js             # Fetch wrapper + token/session storage
│   │   ├── theme.js           # Light/dark mode toggle
│   │   ├── auth.js            # Login/signup form logic + validation
│   │   ├── chat.js            # Conversation list, message thread, composer
│   │   └── hospitals.js       # Hospital rail + search page logic
│   └── assets/
│       └── logo.svg           # Curoa.AI logo (pulse-line mark)
│
├── backend/                  # FastAPI (Python) — modular, scalable API
│   ├── app/
│   │   ├── main.py             # App entry point, CORS, router registration
│   │   ├── config.py           # Settings loaded from .env
│   │   ├── database.py         # SQLAlchemy engine/session (MySQL)
│   │   ├── models.py           # ORM models: User, Conversation, Message, Hospital
│   │   ├── schemas.py          # Pydantic request/response schemas
│   │   ├── auth_utils.py       # bcrypt password hashing + JWT helpers
│   │   ├── deps.py             # get_current_user dependency
│   │   └── routers/
│   │       ├── auth.py          # POST /api/auth/signup, /login, /logout
│   │       ├── users.py         # GET/PUT /api/users/me
│   │       ├── conversations.py # CRUD for saved chat conversations + messages
│   │       ├── hospitals.py     # GET /api/hospitals, /api/hospitals/{id}
│   │       └── chat.py          # POST /api/chat — placeholder chatbot endpoint
│   ├── requirements.txt
│   └── .env.example
│
├── database/
│   ├── schema.sql             # MySQL DDL (mirrors app/models.py)
│   └── seed.sql               # Sample hospital records
│
└── README.md
```

## Architecture at a glance

- **Frontend**: static HTML/CSS/JS, no framework or build step — open the files
  directly or serve `frontend/` with any static file server. Talks to the API
  exclusively through `js/api.js`, so swapping the backend URL is a one-line change.
- **Backend**: FastAPI, organized by resource (routers), with a clean separation
  between ORM models, Pydantic schemas, auth utilities, and config. Ready to scale —
  add new routers under `app/routers/` and register them in `app/main.py`.
- **Database**: MySQL via SQLAlchemy. Tables: `users`, `conversations`, `messages`,
  `hospitals`, with `users (1) → (many) conversations (1) → (many) messages` so a
  signed-in user's chat history is saved and can be revisited later.
- **Auth**: passwords are hashed with bcrypt (`passlib`) before storage — plaintext
  passwords are never persisted. Sessions are short-lived signed JWTs sent as
  `Authorization: Bearer <token>`.

## The `/api/chat` placeholder

`POST /api/chat` currently returns:

```json
{ "reply": "Curoa.AI chatbot is currently being developed.", "conversation_id": "…", "disclaimer": "…" }
```

For signed-in users it already saves both the user's message and this placeholder
reply to MySQL, so conversation history, titles, and the sidebar all work end to
end today. When the medical AI model is ready, only `backend/app/routers/chat.py`
needs to change (see the `TODO` comment inside it) — the frontend, database
schema, and every other endpoint stay the same.

## Getting started

### 1. Frontend
No build step. Serve the `frontend/` folder with any static server, e.g.:
```bash
cd frontend
python -m http.server 5500
```
Then open `http://localhost:5500`. Without a backend running, the hospitals rail
and page fall back to built-in sample data, and the chat composer shows the
placeholder assistant reply, so the UI is fully explorable on its own.

### 2. Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # then fill in DATABASE_URL and JWT_SECRET_KEY
uvicorn app.main:app --reload --port 8000
```
API docs: `http://localhost:8000/docs`

### 3. Database (MySQL)
```bash
mysql -u root -p -e "CREATE DATABASE curoa_db CHARACTER SET utf8mb4;"
mysql -u root -p curoa_db < database/schema.sql
mysql -u root -p curoa_db < database/seed.sql   # optional sample hospitals
```
`app/main.py` also auto-creates tables on startup via SQLAlchemy for convenience
during development; `schema.sql` is the source of truth for production setup and
should be kept in sync with `app/models.py`.

## Planned development order

1. ✅ Frontend website (chat UI, hospitals UI, auth UI, responsive + dark mode)
2. ✅ Python backend (FastAPI, modular routers, JWT auth, hashed passwords)
3. ✅ MySQL database integration (users, conversations, messages, hospitals)
4. ⏭️ Hospital/location functionality (connect a real maps + geolocation API in
   place of the map placeholder and sample data)
5. ⏭️ Medical AI chatbot (connect a model in `app/routers/chat.py`, keeping the
   existing request/response contract and medical disclaimer)
