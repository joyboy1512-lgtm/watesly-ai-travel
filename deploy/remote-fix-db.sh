#!/usr/bin/env bash
set -euo pipefail
cd /var/www/weekendgate

PASS=$(grep POSTGRES_PASSWORD docker-compose.yml | head -1 | awk '{print $2}' | tr -d '\r')
echo "Using DB password length: ${#PASS}"

sed -i "s|^DATABASE_PASSWORD=.*|DATABASE_PASSWORD=${PASS}|" .env
sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://watesly:${PASS}@127.0.0.1:5433/watesly_travel?schema=public|" .env
cp .env packages/database/.env
mkdir -p apps/api
cp .env apps/api/.env

# Recreate only weekendgate compose stack volumes
docker compose -p weekendgate down
rm -rf docker-data/postgres docker-data/redis
mkdir -p docker-data/postgres docker-data/redis
docker compose -p weekendgate up -d
sleep 10
docker exec watesly-travel-postgres pg_isready -U watesly -d watesly_travel

export DATABASE_URL="postgresql://watesly:${PASS}@127.0.0.1:5433/watesly_travel?schema=public"
pnpm --filter @watesly-travel/database exec prisma migrate deploy
pnpm db:seed
echo DB_READY
