CREATE TYPE "public"."accessory_status" AS ENUM('available', 'rented', 'maintenance', 'lost');--> statement-breakpoint
CREATE TYPE "public"."admin_role" AS ENUM('admin', 'operator');--> statement-breakpoint
CREATE TYPE "public"."bike_category" AS ENUM('mtb', 'speed', 'gravel');--> statement-breakpoint
CREATE TYPE "public"."bike_status" AS ENUM('available', 'rented', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."client_source" AS ENUM('shopify', 'manual');--> statement-breakpoint
CREATE TYPE "public"."client_status" AS ENUM('lead', 'verified', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."doc_type" AS ENUM('rg_front', 'rg_back', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('pix', 'credit_card', 'debit_card', 'cash', 'stripe', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'partial', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_type" AS ENUM('online', 'presential');--> statement-breakpoint
CREATE TYPE "public"."rental_status" AS ENUM('active', 'returned', 'overdue', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."return_condition" AS ENUM('ok', 'damaged');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "accessories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"serialNumber" varchar(100),
	"quantity" integer DEFAULT 1 NOT NULL,
	"dailyRate" numeric(10, 2),
	"purchasePrice" numeric(10, 2),
	"status" "accessory_status" DEFAULT 'available' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(320) NOT NULL,
	"passwordHash" varchar(255) NOT NULL,
	"role" "admin_role" DEFAULT 'operator' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"lastLoginAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "bike_discount_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"bikeId" integer NOT NULL,
	"minDays" integer NOT NULL,
	"discountPercent" numeric(5, 2) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bikes" (
	"id" serial PRIMARY KEY NOT NULL,
	"serialNumber" varchar(100) NOT NULL,
	"model" varchar(100) NOT NULL,
	"brand" varchar(100),
	"category" "bike_category",
	"size" varchar(50),
	"color" varchar(50),
	"description" text,
	"weight" varchar(20),
	"weightLimit" varchar(20),
	"dailyRate" numeric(10, 2),
	"photoUrl" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"notes" text,
	"status" "bike_status" DEFAULT 'available' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bikes_serialNumber_unique" UNIQUE("serialNumber")
);
--> statement-breakpoint
CREATE TABLE "client_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"clientId" integer NOT NULL,
	"type" "doc_type" NOT NULL,
	"url" text NOT NULL,
	"cloudinaryPublicId" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"cpf" varchar(14),
	"rg" varchar(20),
	"birthDate" varchar(10),
	"gender" varchar(20),
	"height" varchar(10),
	"pedalFrequency" varchar(50),
	"origin" varchar(100),
	"phone" varchar(20),
	"email" varchar(320),
	"instagram" varchar(100),
	"accommodation" varchar(255),
	"zipCode" varchar(10),
	"street" varchar(255),
	"number" varchar(20),
	"neighborhood" varchar(100),
	"city" varchar(100),
	"state" varchar(50),
	"country" varchar(50) DEFAULT 'Brasil',
	"complement" varchar(100),
	"docFrontUrl" text,
	"docBackUrl" text,
	"lgpdConsent" boolean DEFAULT false NOT NULL,
	"lgpdConsentAt" timestamp,
	"status" "client_status" DEFAULT 'lead' NOT NULL,
	"receiveEmail" boolean DEFAULT true NOT NULL,
	"blocked" boolean DEFAULT false NOT NULL,
	"expiresAt" timestamp,
	"notes" text,
	"source" "client_source" DEFAULT 'manual' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"categoryId" integer NOT NULL,
	"description" text,
	"amount" numeric(10, 2) NOT NULL,
	"date" date NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rental_accessories" (
	"id" serial PRIMARY KEY NOT NULL,
	"rentalId" integer NOT NULL,
	"accessoryId" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"dailyRate" numeric(10, 2),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rentals" (
	"id" serial PRIMARY KEY NOT NULL,
	"clientId" integer NOT NULL,
	"bikeId" integer NOT NULL,
	"startDate" date NOT NULL,
	"endDate" date,
	"returnedAt" timestamp,
	"deliveryDate" date,
	"deliveryTime" varchar(5),
	"deliveryFee" numeric(10, 2),
	"dailyRate" numeric(10, 2),
	"discountPercent" numeric(5, 2),
	"subtotal" numeric(10, 2),
	"totalAmount" numeric(10, 2),
	"depositAmount" numeric(10, 2),
	"paymentType" "payment_type" DEFAULT 'presential',
	"paymentMethod" "payment_method",
	"paymentStatus" "payment_status" DEFAULT 'pending' NOT NULL,
	"stripeSessionId" varchar(255),
	"returnCondition" "return_condition",
	"status" "rental_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenue_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenues" (
	"id" serial PRIMARY KEY NOT NULL,
	"categoryId" integer NOT NULL,
	"description" text,
	"amount" numeric(10, 2) NOT NULL,
	"date" date NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
