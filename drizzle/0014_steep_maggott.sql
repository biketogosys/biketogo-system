CREATE TYPE "public"."bike_unit_status" AS ENUM('disponivel', 'alugado', 'perdido', 'manutencao', 'roubado');--> statement-breakpoint
CREATE TABLE "bike_units" (
	"id" serial PRIMARY KEY NOT NULL,
	"bikeSizeId" integer NOT NULL,
	"numeroSistema" varchar(50) NOT NULL,
	"status" "bike_unit_status" DEFAULT 'disponivel' NOT NULL,
	"observacao" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
