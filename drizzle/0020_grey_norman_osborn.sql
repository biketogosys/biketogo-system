CREATE TYPE "public"."update_categoria" AS ENUM('novidade', 'melhoria', 'correcao');--> statement-breakpoint
CREATE TABLE "system_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"titulo" varchar(200) NOT NULL,
	"descricao" text NOT NULL,
	"categoria" "update_categoria" DEFAULT 'melhoria' NOT NULL,
	"autorId" integer,
	"criadoEm" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "system_updates_criado_em_idx" ON "system_updates" USING btree ("criadoEm");