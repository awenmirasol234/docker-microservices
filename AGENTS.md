# AGENTS.md

## Stack
Docker Compose (`compose.yml`, 11 containers) + Node 24 (`node:24-alpine`, Express `^5.1.0`, `pg ^8.13.0`) + nginx (`nginx:alpine`) reverse proxy + Postgres 17 (`postgres:17-alpine`). No tests, no lint/typecheck, no CI, no lockfiles, no `npm start` / test scripts.

## Services
- `user-service/server.js`: `GET /users` + `GET /users/:id` + `POST/PUT/DELETE`, listens `3001`, db `users_db`.
- `product-service/server.js`: `GET /products` + `GET /products/:id` + `POST/PUT/DELETE`, listens `3002`, db `products_db`.
- `order-service/server.js`: `GET /orders` + `GET /orders/:id` + `POST/PUT/DELETE`, listens `3003`, db `orders_db`.
- `inventory-service/server.js`: `GET /inventory` + `GET /inventory/:id` + `POST/PUT/DELETE`, listens `3004`, db `inventory_db`.
- `review-service/server.js`: `GET /reviews` + `GET /reviews/:id` + `POST/PUT/DELETE`, listens `3005`, db `reviews_db`.
- `nginx/nginx.conf`: listens `80` (host `8000`). `/api/<name>` plus subpaths (e.g. `/api/users/123` -> `/users/123`) -> `<name>-service:<port>/<name>` for each service. `= /architecture` (alias file) + `= /architecture/` (`try_files`) serve the static diagram as `text/html` with `no-cache`. CORS `*` headers + `OPTIONS 204` so a `file://`-opened diagram can still poll. Only host port `8000` is public.
- `nginx/Dockerfile` + compose `nginx` block: build context is repo root (`context: .`, `dockerfile: ./nginx/Dockerfile`); image copies `nginx/nginx.conf` and root `architecture.html`.
- `postgres-<name>`: `POSTGRES_USER/PASSWORD: postgres/postgres`, `POSTGRES_DB: <db>`, `pg_isready` healthcheck, volume `pgdata-<name>` -> `/var/lib/postgresql/data`. Tables auto-created on startup via `CREATE TABLE IF NOT EXISTS`; no migrations or init scripts.
- App wiring: `DATABASE_URL=postgres://postgres:postgres@postgres-<name>:5432/<db>`, `depends_on` postgres healthy; nginx `depends_on` all five app services.
- Diagram: `architecture.html`, served at `localhost:8000/architecture` (same-origin `/api`, CORS-free; `/architecture/` serves the same page). Live telemetry polls `GET /api/*` every 5s; button cycles Live/Demo/Paused; flows encode ok/slow-amber/error-red with details in hover tooltips + aria-live log. Flow path: host `:8000` -> nginx `:80` -> services `:3001-3005` -> postgres `:5432`.

## Commands
- Build + run all: `docker compose up --build`
- Run detached: `docker compose up --build -d`
- After rebuild: `docker compose restart nginx` (it caches upstream IPs; recreated app containers get 502s until restart)
- Logs / status: `docker compose logs <service>`, `docker compose ps`
- Teardown: `docker compose down` (`down -v` deletes `pgdata-*` volumes and all data)
- Local dev without Docker (per service dir, with `DATABASE_URL` set, e.g. `postgres://postgres:postgres@localhost:5432/users_db` with a matching local Postgres running): `npm install && node server.js`
- Verify: `curl localhost:8000/architecture`, `curl localhost:8000/api/users`, `curl localhost:8000/api/products`, `curl localhost:8000/api/orders`, `curl localhost:8000/api/inventory`, `curl localhost:8000/api/reviews`

## Gotchas
- No `npm start` / test scripts in any `package.json`; use `node server.js`.
- Inter-service hostnames (`*-service`, `postgres-*`) only resolve inside Compose network, not from host. From host, go through `localhost:8000/api/*`.
- `nginx.conf` maps one `location` per service (`/api/<name>` -> backend `/<name>`, subpaths forwarded) plus two exact-match static locations (`= /architecture` alias file, `= /architecture/` via `try_files`); adding a service needs an app block + `DATABASE_URL` + a `postgres-<name>` container with `POSTGRES_DB` and its own volume + a `location` block + nginx `depends_on` (static locations untouched).
- `PUT` requires the full body (same validation as `POST`); all errors are `{"error": ...}` (`400` invalid body, `404` unknown id).
- Inventory duplicate `product_id` returns `400 {"error":"product already has inventory"}` on `POST` and `PUT`.
- Products `price` must be a finite number; reviews `comment` is optional/nullable.
