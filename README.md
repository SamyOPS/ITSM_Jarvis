# ITSM_Jarvis / TikIA

Squelette technique minimal pour une future application de ticketing / ITSM avec frontend et backend separes.

La base de donnees est geree via Supabase. Il n'y a donc pas de base PostgreSQL locale ni de `docker-compose.yml` dans ce depot.

## Principes retenus

- frontend et backend independants
- un `package.json` dans `frontend/` et un autre dans `backend/`
- pas de `package.json` racine
- architecture backend inspiree de la Clean Architecture
- aucune logique metier implementee a ce stade

## Pourquoi deux `package.json`

Le frontend et le backend sont traites comme deux projets distincts :

- `frontend/package.json` contient uniquement les dependances React, TypeScript et Vite
- `backend/package.json` contient uniquement les dependances NestJS et TypeScript

Cette separation evite une structure monorepo inutilement lourde pour ce stade du projet.

## Structure

```text
.
|-- .gitignore
|-- README.md
|-- backend
|   |-- .env.example
|   |-- nest-cli.json
|   |-- package.json
|   |-- tsconfig.build.json
|   |-- tsconfig.json
|   `-- src
|       |-- app.module.ts
|       |-- main.ts
|       |-- application
|       |   |-- dto
|       |   |   `-- .gitkeep
|       |   |-- ports
|       |   |   `-- .gitkeep
|       |   `-- use-cases
|       |       `-- .gitkeep
|       |-- domain
|       |   |-- entities
|       |   |   `-- .gitkeep
|       |   |-- repositories
|       |   |   `-- .gitkeep
|       |   |-- services
|       |   |   `-- .gitkeep
|       |   `-- value-objects
|       |       `-- .gitkeep
|       |-- infrastructure
|       |   |-- config
|       |   |   `-- app.config.ts
|       |   |-- database
|       |   |   `-- README.md
|       |   |-- modules
|       |   |   `-- infrastructure.module.ts
|       |   `-- repositories
|       |       `-- .gitkeep
|       `-- presentation
|           |-- controllers
|           |   `-- .gitkeep
|           |-- dto
|           |   `-- .gitkeep
|           `-- modules
|               `-- presentation.module.ts
`-- frontend
    |-- .env.example
    |-- index.html
    |-- package.json
    |-- tsconfig.app.json
    |-- tsconfig.json
    |-- tsconfig.node.json
    |-- vite.config.ts
    `-- src
        |-- app
        |   `-- App.tsx
        |-- components
        |   `-- .gitkeep
        |-- features
        |   `-- .gitkeep
        |-- main.tsx
        |-- pages
        |   `-- .gitkeep
        |-- services
        |   `-- api
        |       `-- client.ts
        |-- shared
        |   `-- styles
        |       `-- global.css
        `-- types
            `-- .gitkeep
```

## Role des dossiers

### `backend/src`

- `application/` : futurs use cases, DTO applicatifs, ports
- `domain/` : futures entites, value objects, contrats de repository, services metier
- `infrastructure/` : configuration technique, acces donnees, adapters Supabase
- `presentation/` : future exposition HTTP avec controllers et DTO d'entree/sortie

### `frontend/src`

- `app/` : point d'entree applicatif
- `pages/` : futurs ecrans
- `components/` : composants reutilisables
- `features/` : regroupement futur par fonctionnalite
- `services/` : acces API et integrations
- `shared/` : styles et utilitaires transverses
- `types/` : types partages cote front

## Variables d'environnement

### Backend

Le fichier [backend/.env.example](c:/Users/Utilisateur/Desktop/Codes/Jarvis_Connect/TikAI/jarvis/backend/.env.example) prepare la configuration minimale pour :

- le port de l'API
- l'URL Supabase
- la cle publique ou serveur selon les besoins futurs

### Frontend

Le fichier [frontend/.env.example](c:/Users/Utilisateur/Desktop/Codes/Jarvis_Connect/TikAI/jarvis/frontend/.env.example) prepare la configuration minimale pour :

- l'URL de l'API backend
- l'URL Supabase publique
- la cle publique Supabase

## Demarrage

Installer et lancer chaque projet separement :

```bash
cd backend
npm install
npm run start:dev
```

```bash
cd frontend
npm install
npm run dev
```

## Notes

- aucune fonctionnalite metier n'est presente
- aucune route metier n'est creee
- aucune integration Supabase reelle n'est encore implementee
