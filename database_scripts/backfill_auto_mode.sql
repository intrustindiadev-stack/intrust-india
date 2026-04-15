-- Backfill auto_mode boolean field based on auto_mode_status
-- Ensures unified state across the system

UPDATE merchants
SET auto_mode = (auto_mode_status = 'active')
WHERE auto_mode IS DISTINCT FROM (auto_mode_status = 'active');

-- Verify summary
SELECT 
    COUNT(*) as total_merchants,
    COUNT(*) FILTER (WHERE auto_mode_status = 'active') as active_status_count,
    COUNT(*) FILTER (WHERE auto_mode = true) as auto_mode_true_count
FROM merchants;
