CREATE INDEX "bike_units_size_status_idx" ON "bike_units" USING btree ("bikeSizeId","status");--> statement-breakpoint
CREATE INDEX "rbu_rental_idx" ON "rental_bike_units" USING btree ("rentalId");--> statement-breakpoint
CREATE INDEX "rbu_bike_unit_idx" ON "rental_bike_units" USING btree ("bikeUnitId");--> statement-breakpoint
CREATE INDEX "rentals_size_dates_idx" ON "rentals" USING btree ("bikeSizeId","startDate","endDate");--> statement-breakpoint
CREATE INDEX "rentals_contract_idx" ON "rentals" USING btree ("contractId");