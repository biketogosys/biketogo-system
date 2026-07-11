CREATE INDEX "accessory_units_accessory_idx" ON "accessory_units" USING btree ("accessoryId");--> statement-breakpoint
CREATE INDEX "audit_logs_criado_em_idx" ON "audit_logs" USING btree ("criadoEm");--> statement-breakpoint
CREATE INDEX "bike_sizes_bike_idx" ON "bike_sizes" USING btree ("bikeId");--> statement-breakpoint
CREATE INDEX "client_documents_client_idx" ON "client_documents" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "contract_accessories_contract_idx" ON "contract_accessories" USING btree ("contractId");--> statement-breakpoint
CREATE INDEX "contracts_client_idx" ON "contracts" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "expenses" USING btree ("date");--> statement-breakpoint
CREATE INDEX "rental_accessories_rental_idx" ON "rental_accessories" USING btree ("rentalId");--> statement-breakpoint
CREATE INDEX "rentals_client_idx" ON "rentals" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "revenues_date_idx" ON "revenues" USING btree ("date");