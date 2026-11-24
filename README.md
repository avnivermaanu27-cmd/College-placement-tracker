# College Placement Tracker

A role-based placement tracking application built with Node.js, Express, and MySQL. It provides student, admin, and company portals for managing placement drives and applications.

## Features

- Student registration, profiles, eligible-drive recommendations, and applications
- Admin management of students, companies, drives, applications, and placement reports
- Company access to its placement drives and applications
- JWT authentication with role-based access

## Architecture & Technology Stacks

The project features a dual-stack architecture:
1. **C++ Core Engine & Console Application (`cpp/`)**:
   - Menu-driven console interface for Admin, Student, and Company portals.
   - High-performance in-memory matching algorithm (CGPA, branch, and skill weighting).
   - Automated test suite covering unit tests, integration workflows, security validations, and benchmarks.
2. **Web Application & REST API (Node.js/Express/MySQL)**:
   - Full graphical web portals (`public/`) with student registration, drive management, and dashboard.
   - RESTful backend services (`routes/`, `controllers/`) and persistent relational database storage (`database/`).

## C++ Core Engine (Quick Start)

Navigate to the `cpp/` directory or run the commands from the project root:

```sh
# Build C++ tracker and test suite
make -C cpp

# Run the interactive console application
./cpp/tracker
# (or with npm: npm run cpp:run)

# Run the 7/7 matching algorithm self-test
./cpp/tracker --selftest
# (or with npm: npm run cpp:selftest)

# Run the performance benchmark
./cpp/tracker --bench
# (or with npm: npm run cpp:bench)

# Run the full automated C++ test suite
make -C cpp test
# (or with npm: npm run cpp:test)
```

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
