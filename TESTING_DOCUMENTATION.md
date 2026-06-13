# Midnight Pick — Complete Testing Documentation

**Prepared:** June 13, 2026  
**For:** QA & Testing Team  
**Purpose:** Comprehensive testing of Midnight Pick platform with all security fixes

---

## Quick Reference

### Key Testing Documents
1. **TEST_PLAN.md** — Overview of all test categories
2. **COMPREHENSIVE_TEST_CASES.md** — Detailed test cases (10 parts)
3. **TEST_RESULTS.md** — Testing results tracker
4. **test-api.sh** — Automated API testing script

### Environment Setup
```
Backend: http://localhost:3000
Database: PostgreSQL (midnightpick_db)
Redis: localhost:6379
Frontend: http://localhost:5500
```

### Default Test User
```
Phone: 01712345678
Email: test@example.com
Name: Test User
```

---

## Testing Scope

### 6 Critical Security Fixes (MUST TEST)
1. **Fix #1:** Point Redemption Race Condition
   - Test concurrent redemptions
   - Verify atomic operation with FOR UPDATE lock
   
2. **Fix #2:** Coupon Per-Phone Usage Race Condition
   - Test concurrent orders with same phone
   - Verify per-phone limits enforced
   
3. **Fix #3:** Phone Number Normalization
   - Test invalid phone rejection
   - Verify INVALID_PHONE error

4. **Fix #4:** Commission Calculation Precision
   - Test Decimal.js precision
   - Verify 2 decimal place accuracy
   
5. **Fix #5:** Subscriptions Pagination
   - Test page/limit parameters
   - Verify total count returned
   
6. **Fix #6:** Crew Commission in Financials
   - Verify crew_commission field exists
   - Check crew commissions included in report

### 10 Major Features to Test
1. Authentication & User Management
2. Product Browsing
3. Order Management
4. Coupons & Discounts
5. Points & Rewards
6. Crew Program
7. Admin Dashboard
8. Security
9. Performance
10. Mobile vs Desktop Consistency

---

## Testing Phases

### Phase 1: Setup & Connectivity (30 minutes)
- [ ] Backend server running
- [ ] Database connection verified
- [ ] API endpoints accessible
- [ ] Test user created

### Phase 2: Critical Fixes Validation (2 hours)
- [ ] Fix #1: Run concurrent redemption tests
- [ ] Fix #2: Run concurrent coupon tests
- [ ] Fix #3: Test invalid phone rejection
- [ ] Fix #4: Verify commission precision
- [ ] Fix #5: Test pagination functionality
- [ ] Fix #6: Verify crew commission in reports

### Phase 3: Feature Testing (4 hours)
- [ ] Authentication flows
- [ ] Product catalog
- [ ] Order creation & management
- [ ] Coupon application
- [ ] Points redemption
- [ ] Crew functionality
- [ ] Admin dashboard

### Phase 4: Security Testing (1 hour)
- [ ] Authorization checks
- [ ] Rate limiting
- [ ] Input validation
- [ ] CORS headers

### Phase 5: Performance Testing (1 hour)
- [ ] Query response times
- [ ] Index effectiveness
- [ ] Concurrent request handling

### Phase 6: Regression Testing (1 hour)
- [ ] Previous features still work
- [ ] No new bugs introduced
- [ ] Mobile/desktop consistency

---

## Testing Checklist

### Pre-Testing
- [ ] Review all 6 critical fixes
- [ ] Understand test scope
- [ ] Set up test environment
- [ ] Create test user accounts
- [ ] Document baseline metrics

### Testing Execution
- [ ] Run TEST_PLAN categories
- [ ] Execute COMPREHENSIVE_TEST_CASES
- [ ] Log all results in TEST_RESULTS.md
- [ ] Run test-api.sh automated tests
- [ ] Document any issues found

### Post-Testing
- [ ] Analyze test results
- [ ] Document bugs found
- [ ] Verify all critical fixes work
- [ ] Check performance improvements
- [ ] Create final test report

---

## How to Use Testing Documents

### For Manual Testing
1. Open **COMPREHENSIVE_TEST_CASES.md**
2. Go to relevant section (e.g., "Part 3: Order Management")
3. Follow Steps listed
4. Compare Expected vs Actual
5. Log Result in TEST_RESULTS.md

**Example:**
```
Section: Test 3.1: Place Order with Valid Coupon
Steps:
  1. POST /orders
  2. Body: { items: [...], coupon_code: "..." }
  
Expected:
  - Order created with MP-XXXX ref
  - Discount applied correctly
  - Total calculated properly

Actual:
  [Describe what actually happened]

Result: [ ] PASS [ ] FAIL
```

### For Automated Testing
```bash
chmod +x test-api.sh
./test-api.sh

# Outputs test results summary
```

### For Regression Testing
1. Keep a baseline from previous test run
2. Run same tests again
3. Compare results
4. Flag any regressions

---

## Critical Test Scenarios

### Scenario 1: Customer Places Order with Coupon
```
1. Customer registers/logs in
2. Views products
3. Selects product + quantity
4. Applies coupon code "WELCOME10"
5. Provides delivery address
6. Selects payment method
7. Completes order

Expected:
- Order created successfully
- Coupon discount applied
- Points calculated (0.5 per taka)
- Order reference (MP-XXXX)

Verify:
- [ ] Order in database
- [ ] Discount calculated correctly
- [ ] Points balance updated
- [ ] Email/SMS sent
```

### Scenario 2: Admin Manages Order
```
1. Admin views orders list
2. Searches for specific order
3. Updates order status to "delivered"
4. Views commission generated
5. Reviews financial report

Expected:
- Points awarded to customer
- Commission created for crew
- Crew commission shown in report
- Financial metrics updated

Verify:
- [ ] Order status changed
- [ ] Points awarded
- [ ] Commission calculated (Decimal.js precision)
- [ ] Crew commission in financials
```

### Scenario 3: Crew Member Manages Coupon
```
1. Crew member creates coupon "CREW20"
2. Sets max_usage_per_phone = 1
3. Customer places order with coupon
4. Same customer tries coupon again

Expected:
- First order succeeds
- Second order fails with COUPON_EXHAUSTED
- Error: per-phone limit enforced

Verify:
- [ ] Coupon created correctly
- [ ] First order uses coupon
- [ ] Second order rejected
- [ ] Error message clear
```

---

## Performance Testing Baseline

### Query Performance Targets (After Indexes)
| Query | Target | Measurement Method |
|-------|--------|-------------------|
| GET /products | < 100ms | curl -w "@time.txt" |
| GET /admin/orders | < 500ms | Query execution time |
| GET /admin/crew/members | < 1000ms | Response time |
| GET /admin/financials | < 2000ms | Response time |

### Success Criteria
- [ ] 50%+ improvement over baseline
- [ ] Query times stable under load
- [ ] No timeout errors

---

## Bug Tracking Template

When you find a bug, document it like this:

```
**Bug #[NUMBER]**

Title: [Short descriptive title]

Severity: [ ] CRITICAL [ ] HIGH [ ] MEDIUM [ ] LOW

Steps to Reproduce:
1. [First step]
2. [Second step]
3. [Continue...]

Expected Result:
[What should happen]

Actual Result:
[What actually happened]

Environment:
- Browser: [e.g., Chrome 90]
- OS: [e.g., Windows 10]
- Timestamp: [When it happened]

Attachment:
[Screenshot or log if available]

Assigned To: [QA Lead]
Status: NEW
```

---

## Test Report Structure

After testing, create a report with:

1. **Executive Summary**
   - Total tests run
   - Pass/fail rate
   - Critical issues found
   - Overall status

2. **Critical Fixes Summary**
   - Each fix tested (yes/no)
   - Results for each fix
   - Any failures noted

3. **Feature Testing Results**
   - By category (auth, orders, etc)
   - Pass/fail count
   - Notable issues

4. **Performance Results**
   - Query times measured
   - Improvement % calculated
   - Index effectiveness verified

5. **Security Assessment**
   - Authorization checks
   - Rate limiting tested
   - No vulnerabilities found

6. **Sign-Off**
   - Tester name
   - Date
   - Approved/Not approved
   - Notes

---

## Tools & Prerequisites

### Required Tools
- **curl** — For API testing
- **jq** — For JSON parsing
- **PostgreSQL client** — For database verification
- **Browser** — For frontend testing

### Installation (Linux)
```bash
sudo apt-get install curl jq postgresql-client
```

### Test Data Setup
```sql
-- Create test user
INSERT INTO users (phone, email, name, role) 
VALUES ('01712345678', 'test@example.com', 'Test User', 'user');

-- Create test coupon
INSERT INTO coupons (code, type, discount_type, discount_value, min_order, max_uses)
VALUES ('WELCOME10', 'festival', 'pct', 10, 0, 100);

-- Create test reward
INSERT INTO point_rewards (label, pts_cost, worth, is_active, sort_order)
VALUES ('₳500 Voucher', 250, '₳500', true, 0);
```

---

## Testing Timeline

### Day 1: Setup & Critical Fixes (4 hours)
- [ ] Environment setup
- [ ] Test all 6 critical fixes
- [ ] Document results

### Day 2: Feature Testing (6 hours)
- [ ] Complete feature test suite
- [ ] Test all major workflows
- [ ] Document any issues

### Day 3: Security & Performance (4 hours)
- [ ] Security testing
- [ ] Performance benchmarking
- [ ] Regression testing

### Day 4: Final Validation (2 hours)
- [ ] Verify all fixes
- [ ] Finalize bug reports
- [ ] Create final test report

---

## Sign-Off Criteria

✅ **Ready for Staging When:**
- [ ] All 6 critical fixes tested & working
- [ ] 95%+ of test cases pass
- [ ] No critical bugs found
- [ ] Performance targets met
- [ ] Security checks pass
- [ ] No regressions detected

❌ **Not Ready When:**
- [ ] Critical fix failures
- [ ] Security vulnerabilities found
- [ ] Performance regressions
- [ ] Major feature failures

---

## Contact & Support

**QA Lead:** [Name]  
**Backend Dev:** [Name]  
**Escalation:** [Process]  

---

## Appendix: Common Issues & Resolutions

### Issue: "Backend not running"
**Solution:**
```bash
cd backend
npm install
node src/app.js
```

### Issue: "Database connection error"
**Solution:**
```bash
# Check PostgreSQL
psql -U postgres -d midnightpick_db -c "SELECT 1"

# Check environment
cat .env | grep DATABASE_URL
```

### Issue: "Rate limiting prevents testing"
**Solution:**
```bash
# Wait between requests or:
# Use different IP (curl --interface option)
# Use different user agents
```

### Issue: "Test user already exists"
**Solution:**
```sql
DELETE FROM users WHERE phone = '01712345678';
-- Cascade will delete related data
```

---

**Testing Ready:** ✅ YES  
**All Documentation Complete:** ✅ YES  
**Estimated Testing Time:** 16-20 hours  
**Status:** Ready for QA Execution

