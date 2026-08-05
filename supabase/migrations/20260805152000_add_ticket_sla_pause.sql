alter table "public"."tickets"
  add column if not exists "sla_paused_at" timestamp with time zone,
  add column if not exists "sla_paused_duration_ms" bigint not null default 0;

alter table "public"."tickets"
  add constraint "chk_tickets_sla_paused_duration_non_negative"
  check ("sla_paused_duration_ms" >= 0) not valid;

alter table "public"."tickets"
  validate constraint "chk_tickets_sla_paused_duration_non_negative";

create index if not exists "idx_tickets_sla_paused_at"
  on "public"."tickets" using "btree" ("sla_paused_at");
