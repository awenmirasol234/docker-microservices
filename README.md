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
- `postgres-*` — five Postgres 17 containers (`postgres-users`, `postgres-products`, `postgres-orders`, `postgres-inventory`, `postgres-reviews`), one database per service, each persisted in its own `pgdata-<name>` volume

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
curl localhost:8000/api/users
curl localhost:8000/api/products
curl localhost:8000/api/orders
curl localhost:8000/api/inventory
curl localhost:8000/api/reviews
```

## API notes

All services: `GET` (list + by id), `POST` (201), `PUT`, `DELETE` (204); `400` on invalid body, `404` on unknown id.

- orders: `user_id`, `product_id`, `quantity` — positive integers
- inventory: `product_id` — positive integer, unique per product; `stock` — non-negative integer
- reviews: `product_id`, `user_id` — positive integers; `rating` — integer 1–5; `comment` — optional string
- users: `name` — required non-empty string
- products: `name` — required non-empty string; `price` — number

## Local dev (without Docker)

In each service dir (`user-service/`, `product-service/`, `order-service/`, `inventory-service/`, `review-service/`):

```bash
npm install
node server.js
```

Note: `DATABASE_URL` must point at that service's database, and inter-service hostnames (`*-service`) only resolve inside the Compose network. From the host, go through `localhost:8000/api/*`.

## Adding a service

1. New dir with `server.js`, `package.json` (`express` + `pg`), `Dockerfile`, `.dockerignore` (copy an existing service)
2. New `postgres-<name>` block with `POSTGRES_DB: <db>` and its own `pgdata-<name>` volume (the database is auto-created; no init script needed)
3. Compose block with `DATABASE_URL` pointing at the new container + `depends_on` it healthy; add to nginx `depends_on`
4. New `location /api/<name>` block in `nginx/nginx.conf`
5. Document it here and in `AGENTS.md`
