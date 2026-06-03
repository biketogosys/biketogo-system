ALTER TABLE "accessories" ADD COLUMN "obrigatorio" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "accessory_units" ADD COLUMN "variante" varchar(100);