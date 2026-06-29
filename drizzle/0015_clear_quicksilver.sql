CREATE TABLE "rental_bike_units" (
	"id" serial PRIMARY KEY NOT NULL,
	"rentalId" integer NOT NULL,
	"bikeUnitId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
