## Render Deployment Checklist

### 1. Provision PostgreSQL
- Create a Render PostgreSQL instance sized for production.
- Set database name, user, and password (match the values you will supply to the backend service).
- Import the schema by running `psql` (replace placeholders) from your workstation:
  ```bash
  PGPASSWORD=<DB_PASSWORD> psql \
    --host=<DB_HOST> \
    --port=<DB_PORT> \
    --username=<DB_USERNAME> \
    --dbname=<DB_NAME> \
    --file=schema.sql
  ```
- Enable automated backups and note the `DATABASE_URL` Render provides.

### 2. Deploy the Spring Boot backend as a Docker Web Service
- Service type: **Docker**.
- Repository root: `E:\adv_class` (contains the optimized `Dockerfile`).
- Instance type: pick a plan with enough RAM/CPU for JVM.
- Auto deploy on successful builds.
- Required environment variables (Render -> Environment):

| Variable | Notes |
| --- | --- |
| `DB_HOST` | Internal hostname from Render's Postgres dashboard |
| `DB_PORT` | Usually `5432` |
| `DB_NAME` | Database name you provisioned |
| `DB_USERNAME` / `DB_PASSWORD` | Credentials from Postgres |
| `DB_MAX_POOL_SIZE` / `DB_MIN_IDLE` | Optional tuning (defaults 15/2) |
| `JWT_SECRET` | 64+ char random string |
| `JWT_EXPIRATION_MINUTES` | e.g. `120` |
| `JWT_ISSUER` | e.g. `smart-classroom` |
| `CORS_ALLOWED_ORIGINS` | `https://<your-frontend-domain>` (comma separated if multiple) |
| `GEMINI_API_KEY` | Existing AI key |
| `SPRING_PROFILES_ACTIVE` | `prod` |

Render injects `PORT` automatically; the app already binds to `${PORT}`.

### 3. Verify backend health
- After deployment, confirm `https://<backend-service>.onrender.com/actuator/health` returns `{"status":"UP"}`.
- Test authentication flow via `POST /api/auth/login` to ensure JWT issuance works.

### 4. Deploy the React frontend as a Static Site
- Build command: `npm ci && npm run build`.
- Publish directory: `frontend/dist`.
- Environment variables:
  - `VITE_API_BASE_URL=/api`
  - `VITE_WS_URL=/ws`
- Optional metadata flags (`VITE_APP_NAME`, etc.) go here as well.

### 5. Configure Static Site rewrite/proxy rules (single origin UX)
Use the Render Static Site "Routes" UI (or `static.json`) to proxy API + WebSocket traffic to the backend service (replace `<backend-host>` with the Render service host):
```json
[
  {
    "source": "/api/(.*)",
    "destination": "https://<backend-host>/api/$1",
    "status": 200
  },
  {
    "source": "/ws/(.*)",
    "destination": "wss://<backend-host>/ws/$1",
    "status": 200
  },
  {
    "source": "/uploads/(.*)",
    "destination": "https://<backend-host>/uploads/$1",
    "status": 200
  }
]
```
With these rewrites, the frontend can keep `VITE_API_BASE_URL=/api` and all traffic stays on the same origin.

### 6. Final validation
- Visit the static site URL and exercise the full flow (login, classroom list, meetings).
- Confirm console has no mixed-content/CORS errors and WebSocket signaling succeeds over `wss`.
- Enable Render cron/alerts as needed and rotate `JWT_SECRET` via Render Secrets when required.
