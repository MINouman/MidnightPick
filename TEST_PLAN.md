# Midnight Pick — Comprehensive Testing Plan

**Tester:** QA Team  
**Test Date:** June 13, 2026  
**Environment:** Development (localhost:3000)

---

## Test Categories

### 1. **Authentication & User Management**
- [ ] User Registration (phone + OTP)
- [ ] User Login
- [ ] Refresh Token
- [ ] Logout
- [ ] Profile Updates
- [ ] Address Management
- [ ] Payment Method Management

### 2. **Product & Shopping**
- [ ] Browse Products
- [ ] View Product Details
- [ ] Check Product Stock
- [ ] Add to Cart (via order endpoint)
- [ ] View Pricing

### 3. **Order Management**
- [ ] Place Order (authenticated)
- [ ] Place Guest Order
- [ ] Apply Coupon Code
- [ ] Verify Discount Calculation
- [ ] Order Status Updates
- [ ] Cancel Order
- [ ] Track Order
- [ ] View Order History

### 4. **Coupon & Discount System**
- [ ] Festival Coupon Validation
- [ ] Crew Coupon Validation
- [ ] Influencer Coupon Validation
- [ ] Coupon Per-Phone Limit Enforcement
- [ ] Expired Coupon Rejection
- [ ] Minimum Order Check
- [ ] Max Usage Check

### 5. **Points & Rewards**
- [ ] Points Accumulation on Order
- [ ] View Points Balance
- [ ] View Points History
- [ ] Redeem Points for Rewards
- [ ] Check Available Rewards
- [ ] Verify Points Deduction

### 6. **Crew Program**
- [ ] Apply to Crew
- [ ] View Crew Application Status
- [ ] Create Crew Coupon
- [ ] View Crew Activity
- [ ] Check Commission
- [ ] View Crew Profile

### 7. **Admin Features**
- [ ] View Admin Dashboard
- [ ] List All Orders
- [ ] Search Orders
- [ ] Update Order Status
- [ ] Create Walk-in Order
- [ ] Manage Products
- [ ] View Customer List
- [ ] Manage Coupons
- [ ] View Financial Reports
- [ ] Manage Crew Members
- [ ] View Point Redemptions

### 8. **Subscription System** (if applicable)
- [ ] Create Subscription
- [ ] Pause Subscription
- [ ] Resume Subscription
- [ ] Cancel Subscription
- [ ] View Subscription Status

### 9. **Mobile vs Desktop Consistency**
- [ ] Form Validation (Both platforms)
- [ ] Error Messages (Both platforms)
- [ ] Phone Number Format (Both platforms)
- [ ] Response Times (Both platforms)

### 10. **Security Testing**
- [ ] Concurrent Point Redemptions
- [ ] Concurrent Coupon Orders
- [ ] Invalid Phone Number Rejection
- [ ] Rate Limiting
- [ ] Authorization Checks
- [ ] CORS Validation

### 11. **Performance Testing**
- [ ] Query Response Times
- [ ] Large Dataset Handling
- [ ] Pagination Performance
- [ ] Index Effectiveness

### 12. **Bug Regression**
- [ ] Fix #1: Point Redemption (concurrent)
- [ ] Fix #2: Coupon Per-Phone (concurrent)
- [ ] Fix #3: Phone Validation
- [ ] Fix #4: Commission Precision
- [ ] Fix #5: Subscriptions Pagination
- [ ] Fix #6: Crew Commission Report

---

## Testing Environment

- **Backend URL:** http://localhost:3000
- **Database:** PostgreSQL (midnightpick_db)
- **Browser:** Chrome/Firefox (for frontend testing)
- **Test Users:** To be created during testing

---

## Success Criteria

- ✅ All tests pass
- ✅ No regression in existing features
- ✅ All critical fixes work as expected
- ✅ Performance improvements verified
- ✅ Security enhancements validated
- ✅ Error messages are clear and helpful

---

## Test Execution Log

(To be filled during testing)
