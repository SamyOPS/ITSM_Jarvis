# ITSM Jarvis

Monorepo avec:
- `backend` (NestJS + TypeScript)
- `frontend` (React + TypeScript + Vite)

## Prerequisites
- Node.js LTS
- npm

## Quick Start

1. Clone and move into the repository.
2. Copy environment examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

On Windows PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

3. Install and run backend:

```bash
cd backend
npm install
npm run start:dev
```

4. In another terminal, install and run frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend runs on `http://localhost:3000`.
Frontend runs on `http://localhost:5173` by default.
