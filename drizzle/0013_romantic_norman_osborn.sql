ALTER TYPE "public"."client_status" ADD VALUE 'recusado';--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "motivoRecusa" text;