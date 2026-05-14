-- Add new roles to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sales_exec';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sales_manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'employee';
