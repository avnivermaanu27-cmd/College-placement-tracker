# College Placement Tracker

A role-based placement tracking application built with Node.js, Express, and MySQL. It provides student, admin, and company portals for managing placement drives and applications.

## Features

- Student registration, profiles, eligible-drive recommendations, and applications
- Admin management of students, companies, drives, applications, and placement reports
- Company access to its placement drives and applications
- JWT authentication with role-based access

## Quick start with Docker

Copy `.env.docker.example` to `.env`, replace the example placeholders with local values, then run:

```sh
docker compose up -d --build
```

Open [http://localhost/login.html](http://localhost/login.html). See [Deployment](docs/DEPLOYMENT.md) for prerequisites and database initialization details.

Live URL supplied for the deployment: [https://collegeplacementtracker-production.up.railway.app/login.html](https://collegeplacementtracker-production.up.railway.app/login.html) (**TODO: confirm**).

## Documentation

- [Technical Documentation](docs/TECHNICAL_DOCUMENTATION.md)
- [Deployment](docs/DEPLOYMENT.md)
- [User Manual](docs/USER_MANUAL.md)
