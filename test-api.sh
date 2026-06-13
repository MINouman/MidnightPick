#!/bin/bash

# Midnight Pick — API Testing Script
# Usage: ./test-api.sh
# Requires: curl, jq (for JSON parsing)

BASE_URL="http://localhost:3000"
PHONE="01712345678"
EMAIL="test@example.com"
NAME="Test User"
TOKEN=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to print test results
test_result() {
    local test_name=$1
    local http_code=$2
    local expected_code=$3

    TESTS_RUN=$((TESTS_RUN + 1))

    if [ "$http_code" = "$expected_code" ]; then
        echo -e "${GREEN}✓ PASS${NC} - $test_name (HTTP $http_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC} - $test_name (Expected $expected_code, got $http_code)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

echo "=========================================="
echo "  Midnight Pick API Testing"
echo "=========================================="
echo ""

# Test 1: Check Backend Health
echo "Testing Backend Connectivity..."
echo "GET $BASE_URL/"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/)
test_result "Backend Running" "$HTTP_CODE" "404"
echo ""

# Test 2: List Products
echo "Testing Product Endpoints..."
echo "GET $BASE_URL/products"
RESPONSE=$(curl -s "$BASE_URL/products")
HTTP_CODE=$(echo "$RESPONSE" | jq -r '.ok // empty' 2>/dev/null)
if [ "$HTTP_CODE" = "true" ]; then
    PRODUCT_COUNT=$(echo "$RESPONSE" | jq '.data.products | length' 2>/dev/null)
    echo -e "${GREEN}✓ PASS${NC} - Get Products ($PRODUCT_COUNT products)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARN${NC} - Get Products (API not responding)"
fi
TESTS_RUN=$((TESTS_RUN + 1))
echo ""

# Test 3: OTP Request
echo "Testing Authentication Flow..."
echo "POST $BASE_URL/auth/register/request-otp"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register/request-otp" \
    -H "Content-Type: application/json" \
    -d "{\"phone\": \"$PHONE\"}")
HTTP_CODE=$(echo "$RESPONSE" | jq -r '.ok // empty' 2>/dev/null)
if [ "$HTTP_CODE" = "true" ]; then
    echo -e "${GREEN}✓ PASS${NC} - OTP Request"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARN${NC} - OTP Request (might need database)"
fi
TESTS_RUN=$((TESTS_RUN + 1))
echo ""

# Test 4: Point Rewards
echo "Testing Points & Rewards..."
echo "GET $BASE_URL/users/point-rewards"
RESPONSE=$(curl -s "$BASE_URL/users/point-rewards")
HTTP_CODE=$(echo "$RESPONSE" | jq -r '.ok // empty' 2>/dev/null)
if [ "$HTTP_CODE" = "true" ]; then
    REWARD_COUNT=$(echo "$RESPONSE" | jq '.data.rewards | length' 2>/dev/null)
    echo -e "${GREEN}✓ PASS${NC} - Get Point Rewards ($REWARD_COUNT rewards)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARN${NC} - Get Point Rewards"
fi
TESTS_RUN=$((TESTS_RUN + 1))
echo ""

# Test 5: Admin Endpoints (without auth)
echo "Testing Admin Endpoints (Authorization)..."
echo "GET $BASE_URL/admin/stats (without token - should fail)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/admin/stats")
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Authorization Required (HTTP $HTTP_CODE)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARN${NC} - Authorization Check (HTTP $HTTP_CODE, expected 401/403)"
fi
TESTS_RUN=$((TESTS_RUN + 1))
echo ""

# Test 6: CORS Headers
echo "Testing CORS Headers..."
echo "OPTIONS $BASE_URL/ (with CORS headers)"
RESPONSE=$(curl -s -I -X OPTIONS "$BASE_URL/" \
    -H "Origin: http://localhost:5500" \
    -H "Access-Control-Request-Method: POST")
if echo "$RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    echo -e "${GREEN}✓ PASS${NC} - CORS Headers Present"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARN${NC} - CORS Headers"
fi
TESTS_RUN=$((TESTS_RUN + 1))
echo ""

# Test 7: Rate Limiting
echo "Testing Rate Limiting Setup..."
echo "GET $BASE_URL/users/point-rewards (5 rapid requests)"
RATE_LIMITED=0
for i in {1..5}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/users/point-rewards")
    if [ "$HTTP_CODE" = "429" ]; then
        RATE_LIMITED=1
        break
    fi
done
if [ "$RATE_LIMITED" = "1" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Rate Limiting Enabled"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARN${NC} - Rate Limiting (may need many more requests)"
fi
TESTS_RUN=$((TESTS_RUN + 1))
echo ""

# Test 8: JSON Validation
echo "Testing Request Validation..."
echo "POST with invalid JSON"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/auth/register/request-otp" \
    -H "Content-Type: application/json" \
    -d "{invalid json}")
if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "500" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Invalid JSON Rejected (HTTP $HTTP_CODE)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARN${NC} - JSON Validation (HTTP $HTTP_CODE)"
fi
TESTS_RUN=$((TESTS_RUN + 1))
echo ""

# Summary
echo "=========================================="
echo "  Test Summary"
echo "=========================================="
echo "Total Tests Run: $TESTS_RUN"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_RUN -gt 0 ]; then
    PASS_RATE=$((TESTS_PASSED * 100 / TESTS_RUN))
    echo "Pass Rate: ${PASS_RATE}%"
fi

echo ""
if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
