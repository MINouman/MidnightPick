-- Subscription pricing: subscribed products receive 5% off the product price.
UPDATE subscriptions s
SET unit_price = ROUND(p.price * 0.95)::int,
    updated_at = NOW()
FROM products p
WHERE s.product_id = p.id
  AND s.status != 'cancelled'
  AND s.unit_price IS DISTINCT FROM ROUND(p.price * 0.95)::int;

UPDATE subscriptions
SET unit_price = ROUND(699 * 0.95)::int,
    updated_at = NOW()
WHERE product_id IS NULL
  AND status != 'cancelled'
  AND unit_price IS DISTINCT FROM ROUND(699 * 0.95)::int;
