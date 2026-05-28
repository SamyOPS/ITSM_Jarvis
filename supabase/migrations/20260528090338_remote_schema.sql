alter table "public"."cis" drop constraint "chk_cis_status";

alter table "public"."groups" drop constraint "chk_groups_level";

alter table "public"."incidents" drop constraint "chk_incidents_impact";

alter table "public"."incidents" drop constraint "chk_incidents_urgency";

alter table "public"."requests" drop constraint "chk_requests_approval_status";

alter table "public"."requests" drop constraint "chk_requests_request_type";

alter table "public"."ticket_history" drop constraint "chk_ticket_history_event_type";

alter table "public"."tickets" drop constraint "chk_tickets_type";

alter table "public"."users" drop constraint "chk_users_role";

alter table "public"."cis" add column "archived_at" timestamp with time zone;

alter table "public"."cis" add column "brand" character varying(120);

alter table "public"."cis" add column "comment" text;

alter table "public"."cis" add column "ip_address" character varying(45);

alter table "public"."cis" add column "location" character varying(150);

alter table "public"."cis" add column "mac_address" character varying(50);

alter table "public"."cis" add column "model" character varying(120);

alter table "public"."cis" add column "purchase_date" date;

alter table "public"."cis" add column "warranty_end_date" date;

CREATE INDEX idx_cis_archived_at ON public.cis USING btree (archived_at);

CREATE INDEX idx_cis_brand ON public.cis USING btree (brand);

CREATE INDEX idx_cis_location ON public.cis USING btree (location);

alter table "public"."cis" add constraint "chk_cis_brand_not_blank" CHECK (((brand IS NULL) OR (btrim((brand)::text) <> ''::text))) not valid;

alter table "public"."cis" validate constraint "chk_cis_brand_not_blank";

alter table "public"."cis" add constraint "chk_cis_comment_not_blank" CHECK (((comment IS NULL) OR (btrim(comment) <> ''::text))) not valid;

alter table "public"."cis" validate constraint "chk_cis_comment_not_blank";

alter table "public"."cis" add constraint "chk_cis_ip_address_not_blank" CHECK (((ip_address IS NULL) OR (btrim((ip_address)::text) <> ''::text))) not valid;

alter table "public"."cis" validate constraint "chk_cis_ip_address_not_blank";

alter table "public"."cis" add constraint "chk_cis_location_not_blank" CHECK (((location IS NULL) OR (btrim((location)::text) <> ''::text))) not valid;

alter table "public"."cis" validate constraint "chk_cis_location_not_blank";

alter table "public"."cis" add constraint "chk_cis_mac_address_not_blank" CHECK (((mac_address IS NULL) OR (btrim((mac_address)::text) <> ''::text))) not valid;

alter table "public"."cis" validate constraint "chk_cis_mac_address_not_blank";

alter table "public"."cis" add constraint "chk_cis_model_not_blank" CHECK (((model IS NULL) OR (btrim((model)::text) <> ''::text))) not valid;

alter table "public"."cis" validate constraint "chk_cis_model_not_blank";

alter table "public"."cis" add constraint "chk_cis_warranty_dates" CHECK (((purchase_date IS NULL) OR (warranty_end_date IS NULL) OR (purchase_date <= warranty_end_date))) not valid;

alter table "public"."cis" validate constraint "chk_cis_warranty_dates";

alter table "public"."cis" add constraint "chk_cis_status" CHECK (((status)::text = ANY (ARRAY['IN_SERVICE'::text, 'IN_STOCK'::text, 'MAINTENANCE'::text, 'OUT_OF_SERVICE'::text, 'LOST'::text, 'RETIRED'::text, 'ARCHIVED'::text]))) not valid;

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


