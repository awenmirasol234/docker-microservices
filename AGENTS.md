# AGENTS.md

## Stack
Docker Compose + Node 24 (Express 5) + nginx reverse proxy. No DB, no tests, no lint/typecheck, no CI.

## Services
- `user-service/server.js`: `GET /users`, listens `3001`.
- `product-service/server.js`: `GET /products`, listens `3002`.
- `nginx/nginx.conf`: listens `80` (host `8000`). `/api/users` -> `user-service:3001/users`, `/api/products` -> `product-service:3002/products`.

## Commands
- Build + run all: `docker compose up --build`
- Run detached: `docker compose up --build -d`
- Local dev without Docker (per service dir): `npm install && node server.js`
- Verify: `curl localhost:8000/api/users`, `curl localhost:8000/api/products`

## Gotchas
- No `npm start` / test scripts in either `package.json`; use `node server.js`.
- Inter-service hostnames (`user-service`, `product-service`) only resolve inside Compose network, not from host.
- `nginx.conf` maps exact backend paths (`/users`, `/products`); adding a new endpoint requires both a new Express route and a new `location` block.
