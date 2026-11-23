# Deployment

## Local with Docker Compose

### Prerequisites

- Docker Engine with the Docker Compose plugin (`docker compose`)
- A copy of the repository

### Start the application

1. Create a local `.env` from the placeholder template. In PowerShell:

   ```powershell
   Copy-Item .env.docker.example .env
   ```

2. Edit `.env` and replace the example placeholders with local values. Do not commit this file or use example values as production secrets.
3. Build and start the services:

   ```sh
   docker compose up -d --build
   ```

4. Check service status:

   ```sh
   docker compose ps
   ```

5. Open [http://localhost/login.html](http://localhost/login.html).

### Database initialization

The Compose MySQL service mounts `database/schema.sql`, `database/optimization.sql`, and `database/seed.sql` into MySQL's initialization directory in that order. MySQL runs these initialization scripts when it initializes a new, empty data directory; a retained `mysql_data` volume is not reinitialized on every start.

`database/migration_milestone3.sql` is not mounted. Its `skills` column additions are already present in `schema.sql`, so running that migration against this schema would try to add existing columns.

### Stop

Stop and remove the Compose containers and network with:

```sh
docker compose down
```

This command does not remove the named database volume.

## Cloud on Railway

The application is deployed on Railway as two services in one project.

- The app service is built from the repository `Dockerfile` and runs as one application service.
- A Railway MySQL service provides the database. The scripts `schema.sql`, `optimization.sql` and `seed.sql` were loaded once into the `college_placement_tracker` database with a MySQL client. `migration_milestone3.sql` was not loaded because its columns already exist in `schema.sql`.
- Configure the app service with these variable names only: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET` and `JWT_EXPIRES_IN`. Do not place secret values in this document.
- Railway supplies `PORT`; on Railway the server listens on port 8080.
- Public URL: [https://collegeplacementtracker-production.up.railway.app/login.html](https://collegeplacementtracker-production.up.railway.app/login.html)

The repository does not contain Railway service configuration, so the service topology, database initialization history, variable values, and live availability must be confirmed in Railway. Never publish database passwords or JWT secrets.
