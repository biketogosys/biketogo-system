#!/bin/bash

# Test Lote 43a: Contract status flow
BASE_URL="https://3000-i6bodpzo40a1hwngpjs6w-e4348801.us2.manus.computer"

echo "=== Test 1: Create manual contract (status: pendente) ==="
curl -s -X POST "$BASE_URL/api/trpc/contracts.createManual" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": 1,
    "bikes": [
      {
        "bikeId": 1,
        "bikeSizeId": 1,
        "startDate": "2026-06-15",
        "endDate": "2026-06-20",
        "quantity": 1,
        "dailyRate": "50.00",
        "totalAmount": "250.00"
      }
    ]
  }' | jq '.result.data.json' 2>/dev/null || echo "ERROR: Failed to create contract"

echo ""
echo "=== Test 2: Confirm payment (pendente → ativo) ==="
curl -s -X POST "$BASE_URL/api/trpc/contracts.confirmPayment" \
  -H "Content-Type: application/json" \
  -d '{"contractId": 1}' | jq '.result.data.json' 2>/dev/null || echo "ERROR: Failed to confirm payment"

echo ""
echo "=== Test 3: Try to cancel non-pendente contract (should fail) ==="
curl -s -X POST "$BASE_URL/api/trpc/contracts.cancel" \
  -H "Content-Type: application/json" \
  -d '{"id": 1}' | jq '.result' 2>/dev/null || echo "ERROR: Failed to cancel"

echo ""
echo "=== Test 4: Get contract details (check status and rentals) ==="
curl -s -X POST "$BASE_URL/api/trpc/contracts.getById" \
  -H "Content-Type: application/json" \
  -d '{"id": 1}' | jq '.result.data.json | {status, valorTotal, rentals: (.rentals | map({status, paymentStatus}))}' 2>/dev/null || echo "ERROR: Failed to get contract"

echo ""
echo "=== Test 5: List rentals grouped by contract ==="
curl -s -X POST "$BASE_URL/api/trpc/rentals.listGroupedByContract" \
  -H "Content-Type: application/json" \
  -d '{"page": 1, "limit": 10}' | jq '.result.data.json | {total, items: (.items | map({id, status, rentals: (.rentals | length)}))}' 2>/dev/null || echo "ERROR: Failed to list grouped rentals"

