


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."assign_ticket_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.number is null or btrim(new.number) = '' then
    new.number := 'TICK-' || lpad(nextval('public.ticket_number_seq')::text, 6, '0');
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."assign_ticket_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_category_depth"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_parent_parent_id uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  select parent_id
  into v_parent_parent_id
  from public.categories
  where id = new.parent_id;

  if v_parent_parent_id is not null then
    raise exception 'Only 2 category levels are allowed in V1.';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."check_category_depth"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_incident_ticket_type"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_type varchar(20);
begin
  select type into v_type
  from public.tickets
  where id = new.ticket_id;

  if v_type is distinct from 'INCIDENT' then
    raise exception 'Ticket % must be INCIDENT.', new.ticket_id;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."check_incident_ticket_type"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_request_ticket_type"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_type varchar(20);
begin
  select type into v_type
  from public.tickets
  where id = new.ticket_id;

  if v_type is distinct from 'REQUEST' then
    raise exception 'Ticket % must be REQUEST.', new.ticket_id;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."check_request_ticket_type"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_ticket_assignment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_role varchar(20);
  v_group_id uuid;
  v_is_active boolean;
begin
  if new.assigned_to_user_id is null then
    return new;
  end if;

  if new.assignment_group_id is null then
    raise exception 'assignment_group_id is required when assigned_to_user_id is set.';
  end if;

  select role, group_id, is_active
  into v_role, v_group_id, v_is_active
  from public.users
  where id = new.assigned_to_user_id;

  if not found then
    raise exception 'Assigned user does not exist.';
  end if;

  if v_is_active is distinct from true then
    raise exception 'Assigned user must be active.';
  end if;

  if v_role not in ('ADMIN', 'AGENT') then
    raise exception 'Assigned user must be ADMIN or AGENT.';
  end if;

  if v_group_id is null then
    raise exception 'Assigned user must belong to a support group.';
  end if;

  if v_group_id <> new.assignment_group_id then
    raise exception 'Assigned user must belong to the assignment group.';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."check_ticket_assignment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_ticket_status_transition"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'CLOSED' and new.closed_at is null then
      new.closed_at := now();
    elsif new.status <> 'CLOSED' then
      new.closed_at := null;
    end if;

    return new;
  end if;

  if old.status = new.status then
    if new.status = 'CLOSED' and new.closed_at is null then
      new.closed_at := now();
    elsif new.status <> 'CLOSED' then
      new.closed_at := null;
    end if;

    return new;
  end if;

  if old.status = 'OPEN'
     and new.status not in ('IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED') then
    raise exception 'Invalid transition from OPEN to %', new.status;
  end if;

  if old.status = 'IN_PROGRESS'
     and new.status not in ('PENDING', 'RESOLVED', 'CLOSED') then
    raise exception 'Invalid transition from IN_PROGRESS to %', new.status;
  end if;

  if old.status = 'PENDING'
     and new.status not in ('IN_PROGRESS', 'RESOLVED', 'CLOSED') then
    raise exception 'Invalid transition from PENDING to %', new.status;
  end if;

  if old.status = 'RESOLVED'
     and new.status not in ('IN_PROGRESS', 'PENDING', 'CLOSED') then
    raise exception 'Invalid transition from RESOLVED to %', new.status;
  end if;

  if old.status = 'CLOSED' and new.status <> 'CLOSED' then
    raise exception 'CLOSED is terminal in V1.';
  end if;

  if new.status = 'CLOSED' and new.closed_at is null then
    new.closed_at := now();
  elsif new.status <> 'CLOSED' then
    new.closed_at := null;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."check_ticket_status_transition"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_auth_user_updated"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  update public.users
  set
    email = coalesce(new.email, public.users.email),
    display_name = coalesce(
      new.raw_user_meta_data ->> 'display_name',
      public.users.display_name
    ),
    updated_at = now()
  where id = new.id;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_auth_user_updated"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.users (
    id,
    email,
    display_name,
    role,
    is_active
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(coalesce(new.email, ''), '@', 1),
      'User'
    ),
    'DEMANDEUR',
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_ticket_attachment_paths"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.storage_path is null and new.file_path is not null then
    new.storage_path := new.file_path;
  end if;

  if new.file_path is null and new.storage_path is not null then
    new.file_path := new.storage_path;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_ticket_attachment_paths"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ai_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid",
    "user_id" "uuid",
    "action" character varying(50) NOT NULL,
    "input_text" "text",
    "output_text" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_ai_logs_action_not_blank" CHECK (("btrim"(("action")::"text") <> ''::"text"))
);


ALTER TABLE "public"."ai_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(120) NOT NULL,
    "parent_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_categories_name_not_blank" CHECK (("btrim"(("name")::"text") <> ''::"text")),
    CONSTRAINT "chk_categories_not_self_parent" CHECK ((("parent_id" IS NULL) OR ("parent_id" <> "id")))
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."categories" IS 'Categories V1 limitees a 2 niveaux : categorie principale + sous-categorie.';



CREATE TABLE IF NOT EXISTS "public"."channels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(50) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_channels_name_not_blank" CHECK (("btrim"(("name")::"text") <> ''::"text"))
);


ALTER TABLE "public"."channels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ci_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_ci_types_name_not_blank" CHECK (("btrim"(("name")::"text") <> ''::"text"))
);


ALTER TABLE "public"."ci_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cis" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(150) NOT NULL,
    "ci_type_id" "uuid" NOT NULL,
    "status" character varying(30) NOT NULL,
    "assigned_user_id" "uuid",
    "serial_number" character varying(120),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_cis_name_not_blank" CHECK (("btrim"(("name")::"text") <> ''::"text")),
    CONSTRAINT "chk_cis_serial_number_not_blank" CHECK ((("serial_number" IS NULL) OR ("btrim"(("serial_number")::"text") <> ''::"text"))),
    CONSTRAINT "chk_cis_status" CHECK ((("status")::"text" = ANY ((ARRAY['IN_SERVICE'::character varying, 'MAINTENANCE'::character varying, 'OUT_OF_SERVICE'::character varying])::"text"[])))
);


ALTER TABLE "public"."cis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."escalations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "from_group_id" "uuid",
    "to_group_id" "uuid",
    "triggered_by_user_id" "uuid",
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_escalations_groups_different" CHECK ((("from_group_id" IS NULL) OR ("to_group_id" IS NULL) OR ("from_group_id" <> "to_group_id")))
);


ALTER TABLE "public"."escalations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(120) NOT NULL,
    "description" "text",
    "level" character varying(20),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_groups_level" CHECK ((("level" IS NULL) OR (("level")::"text" = ANY ((ARRAY['N1'::character varying, 'N2'::character varying, 'N3'::character varying])::"text"[])))),
    CONSTRAINT "chk_groups_name_not_blank" CHECK (("btrim"(("name")::"text") <> ''::"text"))
);


ALTER TABLE "public"."groups" OWNER TO "postgres";


COMMENT ON COLUMN "public"."groups"."level" IS 'Niveau de support V1 limite a N1, N2 ou N3.';



CREATE TABLE IF NOT EXISTS "public"."incidents" (
    "ticket_id" "uuid" NOT NULL,
    "impact" character varying(20),
    "urgency" character varying(20),
    "root_cause" "text",
    "workaround" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_incidents_impact" CHECK ((("impact" IS NULL) OR (("impact")::"text" = ANY ((ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying])::"text"[])))),
    CONSTRAINT "chk_incidents_urgency" CHECK ((("urgency" IS NULL) OR (("urgency")::"text" = ANY ((ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying])::"text"[]))))
);


ALTER TABLE "public"."incidents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."priorities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(50) NOT NULL,
    "level" integer NOT NULL,
    "response_hours" integer,
    "resolution_hours" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_priorities_level_positive" CHECK (("level" > 0)),
    CONSTRAINT "chk_priorities_name_not_blank" CHECK (("btrim"(("name")::"text") <> ''::"text")),
    CONSTRAINT "chk_priorities_resolution_hours" CHECK ((("resolution_hours" IS NULL) OR ("resolution_hours" >= 0))),
    CONSTRAINT "chk_priorities_response_hours" CHECK ((("response_hours" IS NULL) OR ("response_hours" >= 0))),
    CONSTRAINT "chk_priorities_sla_order" CHECK ((("resolution_hours" IS NULL) OR ("response_hours" IS NULL) OR ("resolution_hours" >= "response_hours")))
);


ALTER TABLE "public"."priorities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."requests" (
    "ticket_id" "uuid" NOT NULL,
    "request_type" character varying(30),
    "approval_status" character varying(20),
    "fulfilled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_requests_approval_status" CHECK ((("approval_status" IS NULL) OR (("approval_status")::"text" = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying])::"text"[])))),
    CONSTRAINT "chk_requests_fulfilled_consistency" CHECK ((("fulfilled_at" IS NULL) OR (("approval_status")::"text" = 'APPROVED'::"text"))),
    CONSTRAINT "chk_requests_request_type" CHECK ((("request_type" IS NULL) OR (("request_type")::"text" = ANY ((ARRAY['ACCESS'::character varying, 'HARDWARE'::character varying, 'SOFTWARE'::character varying, 'OTHER'::character varying])::"text"[]))))
);


ALTER TABLE "public"."requests" OWNER TO "postgres";


COMMENT ON COLUMN "public"."requests"."approval_status" IS 'Nullable en V1 : null = pas encore soumis ou pas encore traite.';



COMMENT ON COLUMN "public"."requests"."fulfilled_at" IS 'Renseigne uniquement si approval_status = APPROVED.';



CREATE TABLE IF NOT EXISTS "public"."ticket_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "uploaded_by_user_id" "uuid" NOT NULL,
    "file_name" character varying(255) NOT NULL,
    "file_path" "text" NOT NULL,
    "mime_type" character varying(120),
    "file_size" bigint,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "bucket_id" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "size_bytes" bigint NOT NULL,
    CONSTRAINT "chk_ticket_attachments_file_name_not_blank" CHECK (("btrim"(("file_name")::"text") <> ''::"text")),
    CONSTRAINT "chk_ticket_attachments_file_path_not_blank" CHECK (("btrim"("file_path") <> ''::"text")),
    CONSTRAINT "chk_ticket_attachments_file_size" CHECK ((("file_size" IS NULL) OR ("file_size" >= 0))),
    CONSTRAINT "chk_ticket_attachments_size_bytes_non_negative" CHECK (("size_bytes" >= 0))
);


ALTER TABLE "public"."ticket_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "author_user_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "is_internal" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_ticket_comments_body_not_blank" CHECK (("btrim"("body") <> ''::"text"))
);


ALTER TABLE "public"."ticket_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "actor_user_id" "uuid",
    "field_name" character varying(100),
    "old_value" "text",
    "new_value" "text",
    "event_type" character varying(50) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payload" "jsonb",
    CONSTRAINT "chk_ticket_history_event_type" CHECK ((("event_type")::"text" = ANY ((ARRAY['CREATED'::character varying, 'STATUS_CHANGED'::character varying, 'PRIORITY_CHANGED'::character varying, 'CATEGORY_CHANGED'::character varying, 'ASSIGNED'::character varying, 'UNASSIGNED'::character varying, 'COMMENT_ADDED'::character varying, 'COMMENT_DELETED'::character varying, 'ATTACHMENT_ADDED'::character varying, 'ATTACHMENT_DELETED'::character varying, 'ESCALATED'::character varying, 'RESOLVED'::character varying, 'CLOSED'::character varying])::"text"[])))
);


ALTER TABLE "public"."ticket_history" OWNER TO "postgres";


COMMENT ON COLUMN "public"."ticket_history"."event_type" IS 'Liste V1 stabilisee. Ecriture recommandee uniquement par le backend NestJS.';



CREATE SEQUENCE IF NOT EXISTS "public"."ticket_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ticket_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "number" character varying(30) NOT NULL,
    "type" character varying(20) NOT NULL,
    "status" character varying(20) DEFAULT 'OPEN'::character varying NOT NULL,
    "title" character varying(200) NOT NULL,
    "description" "text" NOT NULL,
    "priority_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "channel_id" "uuid",
    "created_by_user_id" "uuid" NOT NULL,
    "requested_for_user_id" "uuid",
    "assignment_group_id" "uuid",
    "assigned_to_user_id" "uuid",
    "ci_id" "uuid",
    "response_due_at" timestamp with time zone,
    "resolution_due_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "archived_at" timestamp with time zone,
    CONSTRAINT "chk_tickets_closed_at_consistency" CHECK ((((("status")::"text" = 'CLOSED'::"text") AND ("closed_at" IS NOT NULL)) OR ((("status")::"text" <> 'CLOSED'::"text") AND ("closed_at" IS NULL)))),
    CONSTRAINT "chk_tickets_description_not_blank" CHECK (("btrim"("description") <> ''::"text")),
    CONSTRAINT "chk_tickets_due_dates" CHECK ((("response_due_at" IS NULL) OR ("resolution_due_at" IS NULL) OR ("response_due_at" <= "resolution_due_at"))),
    CONSTRAINT "chk_tickets_number_format" CHECK ((("number")::"text" ~ '^TICK-[0-9]{6}$'::"text")),
    CONSTRAINT "chk_tickets_number_not_blank" CHECK (("btrim"(("number")::"text") <> ''::"text")),
    CONSTRAINT "chk_tickets_status" CHECK ((("status")::"text" = ANY (ARRAY[('OPEN'::character varying)::"text", ('IN_PROGRESS'::character varying)::"text", ('PENDING'::character varying)::"text", ('RESOLVED'::character varying)::"text", ('CLOSED'::character varying)::"text"]))),
    CONSTRAINT "chk_tickets_title_not_blank" CHECK (("btrim"(("title")::"text") <> ''::"text")),
    CONSTRAINT "chk_tickets_type" CHECK ((("type")::"text" = ANY ((ARRAY['INCIDENT'::character varying, 'REQUEST'::character varying])::"text"[])))
);


ALTER TABLE "public"."tickets" OWNER TO "postgres";


COMMENT ON TABLE "public"."tickets" IS 'En V1, un ticket peut etre assigne a un groupe seul, ou a un agent/admin actif appartenant a ce groupe.';



COMMENT ON COLUMN "public"."tickets"."number" IS 'Numero ticket genere automatiquement au format TICK-000001.';



COMMENT ON COLUMN "public"."tickets"."status" IS 'Workflow V1 controle en base. CLOSED est terminal.';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" character varying(255) NOT NULL,
    "display_name" character varying(150) NOT NULL,
    "role" character varying(20) DEFAULT 'DEMANDEUR'::character varying NOT NULL,
    "group_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "first_name" "text",
    "last_name" "text",
    CONSTRAINT "chk_users_display_name_not_blank" CHECK (("btrim"(("display_name")::"text") <> ''::"text")),
    CONSTRAINT "chk_users_email_format" CHECK ((POSITION(('@'::"text") IN ("email")) > 1)),
    CONSTRAINT "chk_users_email_not_blank" CHECK (("btrim"(("email")::"text") <> ''::"text")),
    CONSTRAINT "chk_users_role" CHECK ((("role")::"text" = ANY ((ARRAY['ADMIN'::character varying, 'AGENT'::character varying, 'DEMANDEUR'::character varying])::"text"[])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS 'Source de verite metier : role, group_id, is_active. Source auth/identite : auth.users.';



ALTER TABLE ONLY "public"."ai_logs"
    ADD CONSTRAINT "ai_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channels"
    ADD CONSTRAINT "channels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ci_types"
    ADD CONSTRAINT "ci_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cis"
    ADD CONSTRAINT "cis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."escalations"
    ADD CONSTRAINT "escalations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."incidents"
    ADD CONSTRAINT "incidents_pkey" PRIMARY KEY ("ticket_id");



ALTER TABLE ONLY "public"."priorities"
    ADD CONSTRAINT "priorities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_pkey" PRIMARY KEY ("ticket_id");



ALTER TABLE ONLY "public"."ticket_attachments"
    ADD CONSTRAINT "ticket_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_comments"
    ADD CONSTRAINT "ticket_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_history"
    ADD CONSTRAINT "ticket_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_number_key" UNIQUE ("number");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_ai_logs_action" ON "public"."ai_logs" USING "btree" ("action");



CREATE INDEX "idx_ai_logs_created_at" ON "public"."ai_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ai_logs_ticket_id" ON "public"."ai_logs" USING "btree" ("ticket_id");



CREATE INDEX "idx_ai_logs_user_id" ON "public"."ai_logs" USING "btree" ("user_id");



CREATE INDEX "idx_categories_parent_id" ON "public"."categories" USING "btree" ("parent_id");



CREATE INDEX "idx_cis_assigned_user_id" ON "public"."cis" USING "btree" ("assigned_user_id");



CREATE INDEX "idx_cis_ci_type_id" ON "public"."cis" USING "btree" ("ci_type_id");



CREATE INDEX "idx_cis_status" ON "public"."cis" USING "btree" ("status");



CREATE INDEX "idx_escalations_created_at" ON "public"."escalations" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_escalations_from_group_id" ON "public"."escalations" USING "btree" ("from_group_id");



CREATE INDEX "idx_escalations_ticket_created_at" ON "public"."escalations" USING "btree" ("ticket_id", "created_at" DESC);



CREATE INDEX "idx_escalations_ticket_id" ON "public"."escalations" USING "btree" ("ticket_id");



CREATE INDEX "idx_escalations_to_group_id" ON "public"."escalations" USING "btree" ("to_group_id");



CREATE INDEX "idx_escalations_triggered_by_user_id" ON "public"."escalations" USING "btree" ("triggered_by_user_id");



CREATE INDEX "idx_ticket_attachments_created_at" ON "public"."ticket_attachments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ticket_attachments_ticket_id" ON "public"."ticket_attachments" USING "btree" ("ticket_id");



CREATE INDEX "idx_ticket_attachments_uploaded_by_user_id" ON "public"."ticket_attachments" USING "btree" ("uploaded_by_user_id");



CREATE INDEX "idx_ticket_comments_author_user_id" ON "public"."ticket_comments" USING "btree" ("author_user_id");



CREATE INDEX "idx_ticket_comments_created_at" ON "public"."ticket_comments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ticket_comments_ticket_created_at" ON "public"."ticket_comments" USING "btree" ("ticket_id", "created_at" DESC);



CREATE INDEX "idx_ticket_comments_ticket_id" ON "public"."ticket_comments" USING "btree" ("ticket_id");



CREATE INDEX "idx_ticket_history_actor_user_id" ON "public"."ticket_history" USING "btree" ("actor_user_id");



CREATE INDEX "idx_ticket_history_created_at" ON "public"."ticket_history" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ticket_history_event_type" ON "public"."ticket_history" USING "btree" ("event_type");



CREATE INDEX "idx_ticket_history_ticket_created_at" ON "public"."ticket_history" USING "btree" ("ticket_id", "created_at" DESC);



CREATE INDEX "idx_ticket_history_ticket_id" ON "public"."ticket_history" USING "btree" ("ticket_id");



CREATE INDEX "idx_tickets_archived_at" ON "public"."tickets" USING "btree" ("archived_at");



CREATE INDEX "idx_tickets_assigned_to_user_id" ON "public"."tickets" USING "btree" ("assigned_to_user_id");



CREATE INDEX "idx_tickets_assignment_group_id" ON "public"."tickets" USING "btree" ("assignment_group_id");



CREATE INDEX "idx_tickets_assignment_group_status" ON "public"."tickets" USING "btree" ("assignment_group_id", "status");



CREATE INDEX "idx_tickets_category_id" ON "public"."tickets" USING "btree" ("category_id");



CREATE INDEX "idx_tickets_channel_id" ON "public"."tickets" USING "btree" ("channel_id");



CREATE INDEX "idx_tickets_ci_id" ON "public"."tickets" USING "btree" ("ci_id");



CREATE INDEX "idx_tickets_closed_at" ON "public"."tickets" USING "btree" ("closed_at");



CREATE INDEX "idx_tickets_created_at" ON "public"."tickets" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_tickets_created_by_user_id" ON "public"."tickets" USING "btree" ("created_by_user_id");



CREATE INDEX "idx_tickets_number" ON "public"."tickets" USING "btree" ("number");



CREATE INDEX "idx_tickets_priority_id" ON "public"."tickets" USING "btree" ("priority_id");



CREATE INDEX "idx_tickets_requested_for_user_id" ON "public"."tickets" USING "btree" ("requested_for_user_id");



CREATE INDEX "idx_tickets_status" ON "public"."tickets" USING "btree" ("status");



CREATE INDEX "idx_tickets_status_priority" ON "public"."tickets" USING "btree" ("status", "priority_id");



CREATE INDEX "idx_tickets_type" ON "public"."tickets" USING "btree" ("type");



CREATE INDEX "idx_users_group_id" ON "public"."users" USING "btree" ("group_id");



CREATE INDEX "idx_users_is_active" ON "public"."users" USING "btree" ("is_active");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE UNIQUE INDEX "uq_categories_child_name" ON "public"."categories" USING "btree" ("parent_id", "lower"(("name")::"text")) WHERE ("parent_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_categories_root_name" ON "public"."categories" USING "btree" ("lower"(("name")::"text")) WHERE ("parent_id" IS NULL);



CREATE UNIQUE INDEX "uq_channels_name" ON "public"."channels" USING "btree" ("lower"(("name")::"text"));



CREATE UNIQUE INDEX "uq_ci_types_name" ON "public"."ci_types" USING "btree" ("lower"(("name")::"text"));



CREATE UNIQUE INDEX "uq_cis_serial_number" ON "public"."cis" USING "btree" ("lower"(("serial_number")::"text")) WHERE ("serial_number" IS NOT NULL);



CREATE UNIQUE INDEX "uq_groups_name" ON "public"."groups" USING "btree" ("lower"(("name")::"text"));



CREATE UNIQUE INDEX "uq_priorities_level" ON "public"."priorities" USING "btree" ("level");



CREATE UNIQUE INDEX "uq_priorities_name" ON "public"."priorities" USING "btree" ("lower"(("name")::"text"));



CREATE UNIQUE INDEX "uq_users_email" ON "public"."users" USING "btree" ("lower"(("email")::"text"));



CREATE OR REPLACE TRIGGER "trg_categories_check_depth" BEFORE INSERT OR UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."check_category_depth"();



CREATE OR REPLACE TRIGGER "trg_categories_set_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_channels_set_updated_at" BEFORE UPDATE ON "public"."channels" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_ci_types_set_updated_at" BEFORE UPDATE ON "public"."ci_types" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_cis_set_updated_at" BEFORE UPDATE ON "public"."cis" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_groups_set_updated_at" BEFORE UPDATE ON "public"."groups" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_incidents_check_ticket_type" BEFORE INSERT OR UPDATE ON "public"."incidents" FOR EACH ROW EXECUTE FUNCTION "public"."check_incident_ticket_type"();



CREATE OR REPLACE TRIGGER "trg_incidents_set_updated_at" BEFORE UPDATE ON "public"."incidents" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_priorities_set_updated_at" BEFORE UPDATE ON "public"."priorities" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_requests_check_ticket_type" BEFORE INSERT OR UPDATE ON "public"."requests" FOR EACH ROW EXECUTE FUNCTION "public"."check_request_ticket_type"();



CREATE OR REPLACE TRIGGER "trg_requests_set_updated_at" BEFORE UPDATE ON "public"."requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_ticket_attachments_sync_paths" BEFORE INSERT OR UPDATE ON "public"."ticket_attachments" FOR EACH ROW EXECUTE FUNCTION "public"."sync_ticket_attachment_paths"();



CREATE OR REPLACE TRIGGER "trg_ticket_comments_set_updated_at" BEFORE UPDATE ON "public"."ticket_comments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_tickets_assign_number" BEFORE INSERT ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."assign_ticket_number"();



CREATE OR REPLACE TRIGGER "trg_tickets_check_assignment" BEFORE INSERT OR UPDATE ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."check_ticket_assignment"();



CREATE OR REPLACE TRIGGER "trg_tickets_check_status_transition" BEFORE INSERT OR UPDATE ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."check_ticket_status_transition"();



CREATE OR REPLACE TRIGGER "trg_tickets_set_updated_at" BEFORE UPDATE ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_users_set_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."ai_logs"
    ADD CONSTRAINT "ai_logs_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ai_logs"
    ADD CONSTRAINT "ai_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cis"
    ADD CONSTRAINT "cis_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cis"
    ADD CONSTRAINT "cis_ci_type_id_fkey" FOREIGN KEY ("ci_type_id") REFERENCES "public"."ci_types"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."escalations"
    ADD CONSTRAINT "escalations_from_group_id_fkey" FOREIGN KEY ("from_group_id") REFERENCES "public"."groups"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."escalations"
    ADD CONSTRAINT "escalations_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."escalations"
    ADD CONSTRAINT "escalations_to_group_id_fkey" FOREIGN KEY ("to_group_id") REFERENCES "public"."groups"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."escalations"
    ADD CONSTRAINT "escalations_triggered_by_user_id_fkey" FOREIGN KEY ("triggered_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."incidents"
    ADD CONSTRAINT "incidents_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_attachments"
    ADD CONSTRAINT "ticket_attachments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_attachments"
    ADD CONSTRAINT "ticket_attachments_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ticket_comments"
    ADD CONSTRAINT "ticket_comments_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ticket_comments"
    ADD CONSTRAINT "ticket_comments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_history"
    ADD CONSTRAINT "ticket_history_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ticket_history"
    ADD CONSTRAINT "ticket_history_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_assignment_group_id_fkey" FOREIGN KEY ("assignment_group_id") REFERENCES "public"."groups"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_ci_id_fkey" FOREIGN KEY ("ci_id") REFERENCES "public"."cis"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_priority_id_fkey" FOREIGN KEY ("priority_id") REFERENCES "public"."priorities"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_requested_for_user_id_fkey" FOREIGN KEY ("requested_for_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."ai_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."channels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ci_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cis" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."escalations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."incidents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."priorities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tickets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_select_own_profile" ON "public"."users" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



COMMENT ON POLICY "users_select_own_profile" ON "public"."users" IS 'Lecture du propre profil uniquement. Le reste du metier passe par NestJS.';





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."assign_ticket_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."assign_ticket_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_ticket_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_category_depth"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_category_depth"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_category_depth"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_incident_ticket_type"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_incident_ticket_type"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_incident_ticket_type"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_request_ticket_type"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_request_ticket_type"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_request_ticket_type"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_ticket_assignment"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_ticket_assignment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_ticket_assignment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_ticket_status_transition"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_ticket_status_transition"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_ticket_status_transition"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_auth_user_updated"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_auth_user_updated"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_auth_user_updated"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_ticket_attachment_paths"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_ticket_attachment_paths"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_ticket_attachment_paths"() TO "service_role";


















GRANT ALL ON TABLE "public"."ai_logs" TO "anon";
GRANT ALL ON TABLE "public"."ai_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_logs" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."channels" TO "anon";
GRANT ALL ON TABLE "public"."channels" TO "authenticated";
GRANT ALL ON TABLE "public"."channels" TO "service_role";



GRANT ALL ON TABLE "public"."ci_types" TO "anon";
GRANT ALL ON TABLE "public"."ci_types" TO "authenticated";
GRANT ALL ON TABLE "public"."ci_types" TO "service_role";



GRANT ALL ON TABLE "public"."cis" TO "anon";
GRANT ALL ON TABLE "public"."cis" TO "authenticated";
GRANT ALL ON TABLE "public"."cis" TO "service_role";



GRANT ALL ON TABLE "public"."escalations" TO "anon";
GRANT ALL ON TABLE "public"."escalations" TO "authenticated";
GRANT ALL ON TABLE "public"."escalations" TO "service_role";



GRANT ALL ON TABLE "public"."groups" TO "anon";
GRANT ALL ON TABLE "public"."groups" TO "authenticated";
GRANT ALL ON TABLE "public"."groups" TO "service_role";



GRANT ALL ON TABLE "public"."incidents" TO "anon";
GRANT ALL ON TABLE "public"."incidents" TO "authenticated";
GRANT ALL ON TABLE "public"."incidents" TO "service_role";



GRANT ALL ON TABLE "public"."priorities" TO "anon";
GRANT ALL ON TABLE "public"."priorities" TO "authenticated";
GRANT ALL ON TABLE "public"."priorities" TO "service_role";



GRANT ALL ON TABLE "public"."requests" TO "anon";
GRANT ALL ON TABLE "public"."requests" TO "authenticated";
GRANT ALL ON TABLE "public"."requests" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_attachments" TO "anon";
GRANT ALL ON TABLE "public"."ticket_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_comments" TO "anon";
GRANT ALL ON TABLE "public"."ticket_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_comments" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_history" TO "anon";
GRANT ALL ON TABLE "public"."ticket_history" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ticket_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ticket_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ticket_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."tickets" TO "anon";
GRANT ALL ON TABLE "public"."tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."tickets" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

alter table "public"."cis" drop constraint "chk_cis_status";

alter table "public"."groups" drop constraint "chk_groups_level";

alter table "public"."incidents" drop constraint "chk_incidents_impact";

alter table "public"."incidents" drop constraint "chk_incidents_urgency";

alter table "public"."requests" drop constraint "chk_requests_approval_status";

alter table "public"."requests" drop constraint "chk_requests_request_type";

alter table "public"."ticket_history" drop constraint "chk_ticket_history_event_type";

alter table "public"."tickets" drop constraint "chk_tickets_type";

alter table "public"."users" drop constraint "chk_users_role";

alter table "public"."cis" add constraint "chk_cis_status" CHECK (((status)::text = ANY ((ARRAY['IN_SERVICE'::character varying, 'MAINTENANCE'::character varying, 'OUT_OF_SERVICE'::character varying])::text[]))) not valid;

alter table "public"."cis" validate constraint "chk_cis_status";

alter table "public"."groups" add constraint "chk_groups_level" CHECK (((level IS NULL) OR ((level)::text = ANY ((ARRAY['N1'::character varying, 'N2'::character varying, 'N3'::character varying])::text[])))) not valid;

alter table "public"."groups" validate constraint "chk_groups_level";

alter table "public"."incidents" add constraint "chk_incidents_impact" CHECK (((impact IS NULL) OR ((impact)::text = ANY ((ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying])::text[])))) not valid;

alter table "public"."incidents" validate constraint "chk_incidents_impact";

alter table "public"."incidents" add constraint "chk_incidents_urgency" CHECK (((urgency IS NULL) OR ((urgency)::text = ANY ((ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying])::text[])))) not valid;

alter table "public"."incidents" validate constraint "chk_incidents_urgency";

alter table "public"."requests" add constraint "chk_requests_approval_status" CHECK (((approval_status IS NULL) OR ((approval_status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying])::text[])))) not valid;

alter table "public"."requests" validate constraint "chk_requests_approval_status";

alter table "public"."requests" add constraint "chk_requests_request_type" CHECK (((request_type IS NULL) OR ((request_type)::text = ANY ((ARRAY['ACCESS'::character varying, 'HARDWARE'::character varying, 'SOFTWARE'::character varying, 'OTHER'::character varying])::text[])))) not valid;

alter table "public"."requests" validate constraint "chk_requests_request_type";

alter table "public"."ticket_history" add constraint "chk_ticket_history_event_type" CHECK (((event_type)::text = ANY ((ARRAY['CREATED'::character varying, 'STATUS_CHANGED'::character varying, 'PRIORITY_CHANGED'::character varying, 'CATEGORY_CHANGED'::character varying, 'ASSIGNED'::character varying, 'UNASSIGNED'::character varying, 'COMMENT_ADDED'::character varying, 'COMMENT_DELETED'::character varying, 'ATTACHMENT_ADDED'::character varying, 'ATTACHMENT_DELETED'::character varying, 'ESCALATED'::character varying, 'RESOLVED'::character varying, 'CLOSED'::character varying])::text[]))) not valid;

alter table "public"."ticket_history" validate constraint "chk_ticket_history_event_type";

alter table "public"."tickets" add constraint "chk_tickets_type" CHECK (((type)::text = ANY ((ARRAY['INCIDENT'::character varying, 'REQUEST'::character varying])::text[]))) not valid;

alter table "public"."tickets" validate constraint "chk_tickets_type";

alter table "public"."users" add constraint "chk_users_role" CHECK (((role)::text = ANY ((ARRAY['ADMIN'::character varying, 'AGENT'::character varying, 'DEMANDEUR'::character varying])::text[]))) not valid;

alter table "public"."users" validate constraint "chk_users_role";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

CREATE TRIGGER on_auth_user_updated AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_updated();


  create policy "ticket_attachments_delete_own_folder"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'ticket-attachments'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "ticket_attachments_insert_own_folder"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'ticket-attachments'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "ticket_attachments_select_authenticated"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'ticket-attachments'::text));



  create policy "ticket_attachments_update_own_folder"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'ticket-attachments'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)))
with check (((bucket_id = 'ticket-attachments'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



