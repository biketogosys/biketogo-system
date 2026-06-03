CREATE TYPE "public"."accessory_return_status" AS ENUM('ok', 'danificado', 'perdido', 'roubado');--> statement-breakpoint
CREATE TYPE "public"."contract_status" AS ENUM('ativo', 'parcialmente_devolvido', 'encerrado');--> statement-breakpoint
CREATE TYPE "public"."maintenance_status" AS ENUM('em_andamento', 'concluida');--> statement-breakpoint
CREATE TYPE "public"."nacionalidade" AS ENUM('brasileiro', 'estrangeiro');--> statement-breakpoint
CREATE TYPE "public"."tipo_documento" AS ENUM('cpf', 'passaporte');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"adminId" integer,
	"acao" varchar(100) NOT NULL,
	"tabela" varchar(50) NOT NULL,
	"registroId" integer,
	"dadosAntes" jsonb,
	"dadosDepois" jsonb,
	"ip" varchar(45),
	"criadoEm" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bike_maintenance_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"bikeId" integer NOT NULL,
	"descricao" text NOT NULL,
	"custo" numeric(10, 2),
	"dataEntrada" timestamp DEFAULT now() NOT NULL,
	"dataPrevistaRetorno" timestamp,
	"status" "maintenance_status" DEFAULT 'em_andamento' NOT NULL,
	"fotos" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bike_sizes" (
	"id" serial PRIMARY KEY NOT NULL,
	"bikeId" integer NOT NULL,
	"tamanho" varchar(20) NOT NULL,
	"quantidadeTotal" integer DEFAULT 1 NOT NULL,
	"quantidadeDisponivel" integer DEFAULT 1 NOT NULL,
	"observacao" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_accessories" (
	"id" serial PRIMARY KEY NOT NULL,
	"contractId" integer NOT NULL,
	"accessoryId" integer NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"status" "accessory_return_status" DEFAULT 'ok' NOT NULL,
	"observacao" text,
	"fotoUrl" text
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"clientId" integer NOT NULL,
	"status" "contract_status" DEFAULT 'ativo' NOT NULL,
	"valorTotal" numeric(10, 2),
	"pdfUrl" text,
	"criadoEm" timestamp DEFAULT now() NOT NULL,
	"encerradoEm" timestamp,
	"deletedAt" timestamp,
	"pendenciaAcessorio" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accessories" ALTER COLUMN "category" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "accessories" ADD COLUMN "quantidadeTotal" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "accessories" ADD COLUMN "quantidadeDisponivel" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "nacionalidade" "nacionalidade";--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "tipo_documento" "tipo_documento";--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "numero_passaporte" varchar(50);--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "deletedAt" timestamp;--> statement-breakpoint
ALTER TABLE "rentals" ADD COLUMN "source" "client_source" DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE "rentals" ADD COLUMN "contractId" integer;--> statement-breakpoint
ALTER TABLE "rentals" ADD COLUMN "deletedAt" timestamp;