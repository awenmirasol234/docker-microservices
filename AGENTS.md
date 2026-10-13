# AGENTS.md

## Stack
Docker Compose + Node 24 (Express 5) + nginx reverse proxy + Postgres 17. No tests, no lint/typecheck, no CI.

## Services
- `user-service/server.js`: CRUD `/users`, listens `3001`, db `users_db`.
- `product-service/server.js`: CRUD `/products`, listens `3002`, db `products_db`.
- `order-service/server.js`: CRUD `/orders`, listens `3003`, db `orders_db`.
- `inventory-service/server.js`: CRUD `/inventory`, listens `3004`, db `inventory_db`.
- `review-service/server.js`: CRUD `/reviews`, listens `3005`, db `reviews_db`.
- `nginx/nginx.conf`: listens `80` (host `8000`). `/api/<name>` -> `<name>-service:<port>/<name>` for each service.

## Commands
- Build + run all: `docker compose up --build`
- Run detached: `docker compose up --build -d`
- After rebuild: `docker compose restart nginx` (it caches upstream IPs; recreated app containers get 502s until restart)
- Local dev without Docker (per service dir, with `DATABASE_URL` set): `npm install && node server.js`
- Verify: `curl localhost:8000/api/users`, `curl localhost:8000/api/products`, `curl localhost:8000/api/orders`, `curl localhost:8000/api/inventory`, `curl localhost:8000/api/reviews`
- New database on existing volume: `docker exec docker-microservices-postgres-1 psql -U postgres -c "CREATE DATABASE <db>;"`

## Gotchas
- No `npm start` / test scripts in any `package.json`; use `node server.js`.
- Inter-service hostnames (`*-service`) only resolve inside Compose network, not from host.
- `nginx.conf` maps one `location` per service (`/api/<name>` -> backend `/<name>`); adding a service needs a Compose block + `DATABASE_URL` + `location` block + `CREATE DATABASE`.
- `postgres/init.sql` only runs on first volume init; new databases need manual `createdb` on an existing `pgdata` volume.
