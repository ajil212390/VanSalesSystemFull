# RouteFlow

RouteFlow contains a Django REST API and a React web application.

## Prerequisites

- Git
- Python 3.12 or newer
- PostgreSQL, including the command-line tools `createdb` and `pg_restore`
- Node.js 22 LTS and npm

## 1. Get the project

```powershell
git clone <repository-url>
cd VanSalesSystemFull
```

If you already have the project files, open a terminal at the repository root.

## 2. Set up PostgreSQL

The Django models use existing, unmanaged PostgreSQL tables. Django migrations do
not create the RouteFlow business tables. Restore the included
`RouteFlow.Backup` into a **new, empty** local database before starting the API.
Do not restore it over a database containing data you need.

Make sure PostgreSQL is running and its command-line tools are on `PATH`, then
create the database and restore the backup:

```powershell
createdb -U postgres routeflow_db
pg_restore -U postgres --no-owner --no-privileges --dbname=routeflow_db .\RouteFlow.Backup
```

If your PostgreSQL user or database name differs, use the same values in the
commands above and in the backend environment file below. You may be prompted for
the PostgreSQL password.

## 3. Configure and run the Django API

From the repository root, create a Python virtual environment and install the
backend dependencies:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install Django djangorestframework djangorestframework-simplejwt django-cors-headers django-filter drf-spectacular psycopg2-binary python-dotenv reportlab
```

Copy the example environment file and edit `.env` with the PostgreSQL credentials
for the database you restored:

```powershell
Copy-Item .env.example .env
```

At minimum, set `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, and `DB_PORT` in
`.env`. Keep `SECRET_KEY` private; do not commit `.env` or use the example secret
in a deployed environment.

Apply Django's migrations for its own framework tables, check the configuration,
and start the API:

```powershell
python manage.py migrate
python manage.py check
python manage.py runserver
```

The API is available at `http://127.0.0.1:8000/api/v1/`. Interactive API
documentation is at `http://127.0.0.1:8000/api/v1/docs/`.

## 4. Run the web frontend

Open a second terminal at the repository root:

```powershell
cd frontend
npm ci
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`).
The development server proxies `/api` requests to the Django server on
`http://127.0.0.1:8000`. The frontend API base URL is `/api/v1`; if you need to
override it locally, create `frontend/.env.local` with:

```dotenv
VITE_API_BASE_URL=/api/v1
```

To build the frontend for Django to serve, run `npm run build` in `frontend`.
Then open `http://127.0.0.1:8000/` while the Django server is running.

## Common commands

| Component | Command | Purpose |
| --- | --- | --- |
| Backend | `python manage.py test` | Run Django tests |
| Frontend | `npm run lint` | Lint frontend source |
| Frontend | `npm run build` | Type-check and build frontend |

## Troubleshooting

- **PostgreSQL connection error:** Confirm the PostgreSQL service is running and
  the `.env` database name, user, password, host, and port match your setup.
- **Missing database tables:** Restore `RouteFlow.Backup` into the configured
  empty database. `python manage.py migrate` alone does not create the unmanaged
  business tables.
- **Frontend cannot reach the API:** Start Django on port 8000 and use the Vite
  development URL. Confirm the Vite proxy target and Django server port match.
