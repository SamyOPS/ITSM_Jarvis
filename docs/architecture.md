# Architecture Rules

This project uses Supabase Auth for authentication and NestJS for business
rules. The database remains the final integrity layer, but V1 business
validation must be explicit in backend code as well.

## Source Of Truth

- `auth.users`: authentication identity and login lifecycle
- `public.users`: business profile (`role`, `group_id`, `is_active`,
  `display_name`)
- NestJS service role: only trusted server-side access to business tables
- Frontend: no direct access to business tables except reading its own profile
  when explicitly allowed by RLS

## Ticketing V1 Rules

- `tickets.number` follows `TICK-000001`
- categories are limited to 2 levels: root + child
- `tickets.status` transitions:
  - `OPEN -> IN_PROGRESS | RESOLVED | CLOSED`
  - `IN_PROGRESS -> RESOLVED | CLOSED`
  - `RESOLVED -> IN_PROGRESS | CLOSED`
  - `CLOSED` is terminal
- an assigned ticket may target a group only, or a specific active
  `AGENT`/`ADMIN` inside that same group
- `ticket_history.event_type` must stay inside the V1 controlled list
- history writing is owned by the backend use cases, not by the frontend and
  not by database triggers

## Backend Responsibilities

NestJS must duplicate the main SQL rules for:

- DTO validation and clearer error messages
- status transition validation before persistence
- assignment policy validation before persistence
- incident/request type consistency
- history event typing and writing conventions

SQL still protects final integrity if the backend misses a case.
