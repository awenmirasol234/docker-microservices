# docker-microservices

Minimal Docker Compose demo: five Express CRUD services behind an nginx reverse proxy.

## Architecture

- `user-service` — `GET/POST/PUT/DELETE /users`, listens `3001`, db `users_db`
- `product-service` — `GET/POST/PUT/DELETE /products`, listens `3002`, db `products_db`
- `order-service` — `GET/POST/PUT/DELETE /orders`, listens `3003`, db `orders_db`
- `inventory-service` — `GET/POST/PUT/DELETE /inventory`, listens `3004`, db `inventory_db`
- `review-service` — `GET/POST/PUT/DELETE /reviews`, listens `3005`, db `reviews_db`
- `nginx` — reverse proxy, listens `80` (host `8000`)
  - `/api/users` → `user-service:3001/users`
  - `/api/products` → `product-service:3002/products`
  - `/api/orders` → `order-service:3003/orders`
  - `/api/inventory` → `inventory-service:3004/inventory`
  - `/api/reviews` → `review-service:3005/reviews`
- `postgres` — Postgres 17, one container with one database per service, persisted in the `pgdata` volume

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
curl localhost:8000/api/orders
curl localhost:8000/api/inventory
curl localhost:8000/api/reviews
```

## Local dev (without Docker)

In each service dir (`user-service/`, `product-service/`, `order-service/`, `inventory-service/`, `review-service/`):

```bash
npm install
node server.js
```

Note: `DATABASE_URL` must point at that service's database, and inter-service hostnames (`*-service`) only resolve inside the Compose network. From the host, go through `localhost:8000/api/*`.
