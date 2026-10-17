# docker-microservices

Minimal Docker Compose demo: five Express CRUD services behind an nginx reverse proxy (11 containers total: 5 app + 5 Postgres + nginx).

## Architecture

- `user-service` — `GET /users`, `GET /users/:id`, `POST/PUT/DELETE`, listens `3001`, db `users_db`
- `product-service` — `GET /products`, `GET /products/:id`, `POST/PUT/DELETE`, listens `3002`, db `products_db`
- `order-service` — `GET /orders`, `GET /orders/:id`, `POST/PUT/DELETE`, listens `3003`, db `orders_db`
- `inventory-service` — `GET /inventory`, `GET /inventory/:id`, `POST/PUT/DELETE`, listens `3004`, db `inventory_db`
- `review-service` — `GET /reviews`, `GET /reviews/:id`, `POST/PUT/DELETE`, listens `3005`, db `reviews_db`
- `nginx` — reverse proxy, listens `80` (host `8080`; the only public port)
  - `/api/users` → `user-service:3001/users` (subpaths forwarded, e.g. `/api/users/123` → `/users/123`)
  - `/api/products` → `product-service:3002/products`
  - `/api/orders` → `order-service:3003/orders`
  - `/api/inventory` → `inventory-service:3004/inventory`
  - `/api/reviews` → `review-service:3005/reviews`
  - `/` → static endpoint index (`index.html`, `text/html`, `no-cache`) linking the diagram and the five `/api/*` collections
  - `/architecture` (and `/architecture/`) → static `architecture.html` diagram (`text/html`, `no-cache`), served same-origin so its live telemetry polls `/api/*` CORS-free
- `postgres-*` — five Postgres 17 containers (`postgres-users`, `postgres-products`, `postgres-orders`, `postgres-inventory`, `postgres-reviews`), one database per service, each persisted in its own `pgdata-<name>` volume (`/var/lib/postgresql/data`)

Each service connects via `DATABASE_URL=postgres://postgres:postgres@postgres-<name>:5432/<db>` and waits on its Postgres `pg_isready` healthcheck. Tables are auto-created on startup (`CREATE TABLE IF NOT EXISTS`); no migrations or init scripts.

Open `http://localhost:8080/architecture` in a browser for a visual request-flow diagram. Flow intensity reflects live `GET /api/*` polls (button cycles Live/Demo/Paused; slow responses glow amber, failures red; hover a service for its latest status). Note: `architecture.html`'s telemetry base URL still falls back to `http://localhost:8000/api` off port `8000` (`resolveApiBase`), so on host `8080` the diagram renders but shows failed polls until that is updated.

## Prerequisites

- Docker + Docker Compose

## Run

```bash
docker compose up --build
```

Detached:

```bash
docker compose up --build -d
```

After a rebuild, restart nginx so it re-resolves recreated app containers:

```bash
docker compose restart nginx
```

## Verify

```bash
curl -i localhost:8080/
curl -i localhost:8080/architecture
curl localhost:8080/api/users
curl localhost:8080/api/products
curl localhost:8080/api/orders
curl localhost:8080/api/inventory
curl localhost:8080/api/reviews
```

By id:

```bash
curl localhost:8080/api/users/1
```

## API notes

All services return JSON; errors are `{"error": ...}` with `400` on invalid body and `404` on unknown id. `POST` returns `201`, `DELETE` returns `204`. `PUT` requires the full body (same validation as `POST`).

- users: `name` — required non-empty string (trimmed)
- products: `name` — required non-empty string; `price` — required finite number
- orders: `user_id`, `product_id`, `quantity` — positive integers
- inventory: `product_id` — positive integer, unique per product; `stock` — non-negative integer. Duplicate `product_id` returns `400 {"error":"product already has inventory"}` on `POST` and `PUT`
- reviews: `product_id`, `user_id` — positive integers; `rating` — integer 1–5; `comment` — optional/nullable string

## Local dev (without Docker)

In each service dir (`user-service/`, `product-service/`, `order-service/`, `inventory-service/`, `review-service/`):

```bash
npm install
node server.js
```

Set `DATABASE_URL` to that service's database with a matching local Postgres running, e.g.:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/users_db node server.js
```

Note: inter-service hostnames (`*-service`, `postgres-*`) only resolve inside the Compose network. From the host, go through `localhost:8080/api/*`. There are no `npm start` / test scripts; use `node server.js`.

## Troubleshooting

```bash
docker compose ps
docker compose logs <service>
docker compose restart nginx
```

Recreated app containers get new IPs that nginx caches — `restart nginx` fixes post-rebuild `502`s.

Teardown:

```bash
docker compose down
```

`docker compose down -v` also deletes the `pgdata-*` volumes and all database data.

## Adding a service

1. New dir with `server.js`, `package.json` (`express` + `pg`), `Dockerfile`, and `.dockerignore` (copy an existing service — each service dir has a `.dockerignore` covering `node_modules`, `npm-debug.log`, `.git`, `.gitignore`, `.env*`, `Dockerfile`, `.dockerignore`; there are still no lockfiles)
2. New `postgres-<name>` block with `POSTGRES_DB: <db>` and its own `pgdata-<name>` volume (the database is auto-created; no init script needed), plus a `pg_isready` healthcheck like the others
3. Compose block with `DATABASE_URL` pointing at the new container + `depends_on` it healthy; add to nginx `depends_on`
4. New `location /api/<name>` block in `nginx/nginx.conf` (the `= /` and `= /architecture` static locations stay untouched)
5. Document it here and in `AGENTS.md`
