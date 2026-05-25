CREATE TYPE "public"."accessory_unit_status" AS ENUM('disponivel', 'alugado', 'perdido', 'manutencao', 'roubado');--> statement-breakpoint
CREATE TABLE "accessory_units" (
	"id" serial PRIMARY KEY NOT NULL,
	"accessoryId" integer NOT NULL,
	"serialNumber" varchar(50),
	"status" "accessory_unit_status" DEFAULT 'disponivel' NOT NULL,
	"observacao" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bike_maintenance_logs" ADD COLUMN "tamanhoBikeId" integer;--> statement-breakpoint
ALTER TABLE "bike_maintenance_logs" ADD COLUMN "quantidadeAfetada" integer DEFAULT 1 NOT NULL;