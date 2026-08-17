#!/bin/sh
set -e

echo "Running prisma db push..."
npx --yes prisma@7.9.1 db push --schema prisma/schema.prisma --datasource-uri "$DATABASE_URL" --accept-data-loss --skip-generate

echo "Starting application..."
exec node server.js
