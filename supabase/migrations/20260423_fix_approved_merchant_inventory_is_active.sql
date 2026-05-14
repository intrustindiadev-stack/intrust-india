-- Fix: Restore is_active = true for all merchant_inventory records
-- belonging to currently approved merchants (corrupted by the toggle-suspend bug).
-- Affects 20 rows across 3 merchants: "jai santoshi maa" (3), "My store" (11), "RUNNR DEVS" (6).
UPDATE merchant_inventory mi
SET is_active = true
FROM merchants m
WHERE mi.merchant_id = m.id
  AND m.status = 'approved'
  AND mi.is_active = false;
