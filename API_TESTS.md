# OliveExpress™ API Testing Guide

## Quick API Tests

### 1. Check API Health
```bash
curl http://localhost:8787/
# Should return OpenAPI documentation
```

### 2. List All Ports (USA, Mexico, Jordan)
```bash
curl http://localhost:8787/oliveexpress/ports | jq
```

Expected: 18 ports across 3 regions

### 3. List Corridors
```bash
curl http://localhost:8787/oliveexpress/corridors | jq
```

Expected: 10 corridors (commercial + humanitarian)

### 4. Create a Shipment
```bash
curl -X POST http://localhost:8787/oliveexpress/shipments \
  -H "Content-Type: application/json" \
  -d '{
    "shipment_number": "SHP-TEST-001",
    "shipper_name": "Acme Corp",
    "shipper_darcloud_id": "DC-SHIPPER-001",
    "consignee_name": "Global Imports Ltd",
    "consignee_darcloud_id": "DC-CONSIGNEE-001",
    "carrier_id": 1,
    "origin_port_id": 1,
    "destination_port_id": 3,
    "transport_mode": "SEA",
    "cargo_type": "Electronics",
    "cargo_weight_kg": 5000,
    "cargo_volume_m3": 25,
    "cargo_value_usd": 50000,
    "shipment_type": "COMMERCIAL",
    "estimated_delivery": "2026-02-01T00:00:00Z"
  }' | jq
```

### 5. Onboard a Carrier
```bash
curl -X POST http://localhost:8787/oliveexpress/onboarding/carrier \
  -H "Content-Type: application/json" \
  -d '{
    "legal_name": "Swift Logistics Inc",
    "operating_name": "SwiftLog",
    "carrier_type": "TRUCK",
    "registration_country": "USA",
    "email": "ops@swiftlog.com",
    "phone": "+1-555-0100",
    "compliance_documents": [
      {
        "document_type": "LICENSE",
        "document_url": "https://docs.example.com/license.pdf",
        "issue_date": "2025-01-01T00:00:00Z",
        "expiry_date": "2027-01-01T00:00:00Z"
      }
    ]
  }' | jq
```

### 6. Deploy QuranChain Contract
```bash
curl -X POST http://localhost:8787/oliveexpress/quranchain/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "shipment_id": 1,
    "shipper_wallet": "0x1234567890abcdef",
    "carrier_wallet": "0xabcdef1234567890",
    "contract_value_usd": 7500
  }' | jq
```

Expected: Returns contract_id, transaction_hash, and founder_royalty_usd (2.5% = $187.50)

### 7. Fund Escrow
```bash
curl -X POST http://localhost:8787/oliveexpress/quranchain/escrow/fund \
  -H "Content-Type: application/json" \
  -d '{
    "contract_id": "QC-...",
    "shipment_id": 1,
    "funded_amount_usd": 7500
  }' | jq
```

### 8. AI Dispatch Optimization
```bash
curl -X POST http://localhost:8787/oliveexpress/ai/dispatch/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "shipment_id": 1,
    "origin_port_id": 1,
    "destination_port_id": 3,
    "cargo_weight_kg": 5000,
    "priority": "HIGH"
  }' | jq
```

Expected: Optimal carrier and route suggestion

### 9. Carrier Trust Scoring
```bash
curl -X POST http://localhost:8787/oliveexpress/ai/carrier/score \
  -H "Content-Type: application/json" \
  -d '{
    "carrier_id": 1
  }' | jq
```

Expected: Trust score 0-100 with contributing factors

### 10. Live Operations Map
```bash
curl "http://localhost:8787/oliveexpress/operations/live-map?region=USA" | jq
```

### 11. Port Congestion Status
```bash
curl "http://localhost:8787/oliveexpress/operations/port-congestion?region=ALL" | jq
```

### 12. Revenue Analytics
```bash
curl "http://localhost:8787/oliveexpress/treasury/revenue/analytics?region=USA" | jq
```

### 13. Generate Invoice
```bash
curl -X POST http://localhost:8787/oliveexpress/treasury/invoice/generate \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Acme Corp",
    "customer_darcloud_id": "DC-CUSTOMER-001",
    "customer_wallet": "0xabcd1234",
    "invoice_type": "MERCHANT",
    "shipment_ids": [1, 2, 3],
    "due_days": 30
  }' | jq
```

Expected: Invoice with founder royalty deducted

### 14. Update Shipment Status
```bash
curl -X PUT http://localhost:8787/oliveexpress/shipments/1 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_TRANSIT"
  }' | jq
```

### 15. Track Shipment
```bash
curl -X POST http://localhost:8787/oliveexpress/tracking/update \
  -H "Content-Type: application/json" \
  -d '{
    "shipment_id": 1,
    "event_type": "CHECKPOINT",
    "latitude": 34.0522,
    "longitude": -118.2437,
    "location_name": "Los Angeles Port",
    "event_data": {
      "checkpoint": "Port entry",
      "customs_cleared": true
    }
  }' | jq
```

---

## Database Verification

### Check All Tables
```bash
npx wrangler d1 execute DB --local \
  --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

Expected: 28+ tables

### Verify Port Data
```bash
npx wrangler d1 execute DB --local \
  --command "SELECT region, COUNT(*) as count FROM ports GROUP BY region;"
```

Expected:
- USA: 8
- MEXICO: 6
- JORDAN: 4

### Check Corridors
```bash
npx wrangler d1 execute DB --local \
  --command "SELECT corridor_type, COUNT(*) as count FROM corridors GROUP BY corridor_type;"
```

Expected:
- COMMERCIAL: 7
- HUMANITARIAN: 2
- NGO: 1

---

## Integration Tests

### Full Shipment Lifecycle
1. Create carrier (onboarding)
2. Create shipment
3. Deploy QuranChain contract
4. Fund escrow
5. Update tracking (checkpoints)
6. Mark delivered
7. Release escrow
8. Generate invoice
9. Verify founder royalty collected

### Multi-Regional Test
1. Create USA → Mexico shipment
2. Create Mexico → Jordan shipment
3. Verify cross-border customs handling
4. Check corridor optimization

### Humanitarian Route Test
1. Create NGO shipment
2. Verify zakat-exempt status
3. Confirm 0% royalty
4. Track through humanitarian corridor

---

## Performance Tests

### Load Test Endpoints
```bash
# Test 100 concurrent port queries
ab -n 100 -c 10 http://localhost:8787/oliveexpress/ports

# Test shipment creation throughput
ab -n 50 -c 5 -p shipment.json -T application/json \
  http://localhost:8787/oliveexpress/shipments
```

### Database Query Performance
```bash
# Check largest tables
npx wrangler d1 execute DB --local \
  --command "SELECT name, COUNT(*) FROM sqlite_master 
             JOIN (SELECT 'shipments' as name UNION ALL SELECT 'carriers') 
             GROUP BY name;"
```

---

## Deployment Tests

### TypeScript Compilation
```bash
npx tsc --noEmit
```

Expected: No errors

### Migrations (Local)
```bash
npm run seedLocalDb
```

Expected: All migrations applied ✅

### Migrations (Remote)
```bash
npm run predeploy
```

Expected: All migrations applied to production DB

### Full Deployment
```bash
npm run deploy
```

Expected: Deployed to Cloudflare Workers

---

## Security Tests

### Validate On-Chain Settlement
- ✓ No bank account integration
- ✓ QuranChain wallets only
- ✓ Smart contract enforcement
- ✓ Founder royalty immutable

### Verify Zakat Compliance
- ✓ NGO routes marked exempt
- ✓ Humanitarian shipments tracked
- ✓ 0% royalty on exempt routes
- ✓ Transparent reporting

### Access Control
- ✓ Rate limiting enabled
- ✓ HTTPS enforced
- ✓ No credential storage
- ✓ DarCloud identity verification

---

## Expected Results Summary

**Database**: 28 tables, 18 ports, 10 corridors  
**API**: 60+ endpoints operational  
**Regions**: USA (8), Mexico (6), Jordan (4)  
**QuranChain**: Contracts, escrow, disputes active  
**AI**: Optimization, scoring, prediction live  
**Revenue**: Invoicing, analytics, settlement enabled  
**Compliance**: Zakat tracking, royalty enforcement  

**Status**: ✅ ALL SYSTEMS OPERATIONAL
