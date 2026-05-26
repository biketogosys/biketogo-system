ALTER TYPE "public"."tipo_documento" ADD VALUE 'rg' BEFORE 'passaporte';--> statement-breakpoint
ALTER TYPE "public"."tipo_documento" ADD VALUE 'cnh';--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "weight" varchar(10);