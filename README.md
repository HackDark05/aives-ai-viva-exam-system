# AIVES — AI Viva Exam System

Login and home pages for an oral-exam workspace.

| Layer | Stack |
| --- | --- |
| Frontend | Next.js + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL |

## Run locally

You need **Node.js 22+**, **npm**, and **Docker** (for Postgres).

```bash
docker compose up -d
cd backend
npx prisma migrate dev --name init
npm run start:dev
```

In another terminal:

```bash
cd frontend
npm run dev
```

From the repo root you can also run both apps together after the database is migrated:

```bash
npm install
npm run dev
```

- App: [http://localhost:3001](http://localhost:3001)
- API: [http://localhost:4000/api/health](http://localhost:4000/api/health)

Postgres is mapped to **5433** so it does not collide with other local databases on 5432. The Next.js app uses **3001** for the same reason.

## Demo login

Password for every demo account: `demo1234`

| Role | Email |
| --- | --- |
| Administrator | `jordan.h@example.net` |
| Examiner | `priya.s@example.net` |
| Candidate | `ivan.p@example.net` |

Sign in as the administrator to assign roles. Login returns a JWT that includes `sub`, `email`, and `role`.

## Layout

```
frontend/   Next.js app (login + home)
backend/    NestJS API (auth + users)
docker-compose.yml   PostgreSQL 16
```
