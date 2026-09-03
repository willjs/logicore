#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "Running prisma migrate deploy..."
  npx --yes prisma@7.9.1 migrate deploy --schema prisma/schema.prisma
else
  echo "DATABASE_URL not set; skipping migrations."
fi

echo "Starting application..."
exec node server.js
