#!/bin/bash
# Test DarCloud AI endpoints locally

echo "🧪 Testing DarCloud AI Endpoints Locally"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

BASE_URL="${1:-http://localhost:8787}"

# Test 1: AI Health
echo "1️⃣  Testing AI Health..."
curl -s "$BASE_URL/ai/health" | jq '.'
echo ""

# Test 2: List AI Models
echo "2️⃣  Testing AI Models List..."
curl -s "$BASE_URL/ai/models" | jq '.models.text_generation'
echo ""

# Test 3: Text Generation (requires Workers AI in production)
echo "3️⃣  Testing Text Generation..."
curl -s -X POST "$BASE_URL/ai/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is DarCloud?",
    "model": "@cf/meta/llama-3.1-8b-instruct",
    "max_tokens": 50
  }' | jq '.'
echo ""

# Test 4: Infrastructure Status
echo "4️⃣  Testing Infrastructure Status..."
curl -s "$BASE_URL/fungi/sentinel/health" | jq '.'
echo ""

echo "✅ Tests complete!"
echo ""
echo "Note: AI generation only works in production with Workers AI."
echo "To deploy: npm run deploy:darcloud"
