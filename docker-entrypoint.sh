#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "Running prisma db push..."
  npx --yes prisma@7.9.1 db push --schema prisma/schema.prisma || echo "db push failed but continuing"
else
  echo "DATABASE_URL not set; skipping schema sync."
fi

echo "Starting application..."
exec node server.js
