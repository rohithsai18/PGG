$ErrorActionPreference = 'Stop'

$DB_CONTAINER = if ($env:DB_CONTAINER) { $env:DB_CONTAINER } else { 'real-estate-booking-db' }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { '5436' }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { 'root' }
$DB_PASSWORD = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { 'password' }
$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { 'real_estate_demo' }

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error "Docker is not installed or not available on PATH. Install Docker Desktop, or point apps/api/.env DATABASE_URL to a running PostgreSQL instance such as Neon."
  exit 1
}

$running = docker ps --format '{{.Names}}'
if ($running -contains $DB_CONTAINER) {
  Write-Output "Postgres container '$DB_CONTAINER' is already running on port $DB_PORT."
  exit 0
}

$existing = docker ps -a --format '{{.Names}}'
if ($existing -contains $DB_CONTAINER) {
  Write-Output "Starting existing Postgres container '$DB_CONTAINER'..."
  docker start $DB_CONTAINER | Out-Null
} else {
  Write-Output "Creating Postgres container '$DB_CONTAINER' on port $DB_PORT..."
  docker run -d `
    --name $DB_CONTAINER `
    -e "POSTGRES_USER=$DB_USER" `
    -e "POSTGRES_PASSWORD=$DB_PASSWORD" `
    -e "POSTGRES_DB=$DB_NAME" `
    -p "${DB_PORT}:5432" `
    --health-cmd "pg_isready -U $DB_USER -d $DB_NAME" `
    --health-interval 5s `
    --health-timeout 3s `
    --health-retries 20 `
    postgres:16 | Out-Null
}

Write-Output 'Waiting for Postgres to become healthy...'
for ($i = 0; $i -lt 30; $i++) {
  $health = docker inspect --format='{{.State.Health.Status}}' $DB_CONTAINER 2>$null
  if ($health -eq 'healthy') {
    Write-Output 'Postgres is healthy.'
    exit 0
  }

  Start-Sleep -Seconds 1
}

Write-Output 'Postgres did not become healthy in time. Check logs with:'
Write-Output "docker logs $DB_CONTAINER"
exit 1
