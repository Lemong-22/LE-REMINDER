# LE-REMINDER Docker Development Environment
# =============================================

# Build and start all services
docker compose up -d

# Build without starting
docker compose build

# Stop all services
docker compose down

# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f web

# Restart a service
docker compose restart web

# Access the web container
docker compose exec web /bin/sh

# Access the database container
docker compose exec db /bin/sh

# Push database schema
docker compose exec web bun run db:push

# Open Drizzle Studio
docker compose run --rm db-studio

# Rebuild without cache
docker compose build --no-cache

# Clean up everything (including volumes)
docker compose down -v