# docker-microservices

Minimal Docker Compose demo: two Express services behind an nginx reverse proxy.

## Architecture

- `user-service` — Express 5, `GET /users`, listens `3001`
- `product-service` — Express 5, `GET /products`, listens `3002`
- `nginx` — reverse proxy, listens `80` (host `8000`)
  - `/api/users` → `user-service:3001/users`
  - `/api/products` → `product-service:3002/products`
- `postgres` — Postgres 17, one container with two databases: `users_db` (user-service) and `products_db` (product-service), persisted in the `pgdata` volume

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

## Verify

```bash
curl localhost:8000/api/users
curl localhost:8000/api/products
```

## Local dev (without Docker)

In each service dir (`user-service/`, `product-service/`):

```bash
npm install
node server.js
```

Note: inter-service hostnames (`user-service`, `product-service`) only resolve inside the Compose network. From the host, go through `localhost:8000/api/*`.
