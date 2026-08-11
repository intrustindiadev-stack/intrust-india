# INTRUST INDIA — FULL SECURITY AUDIT

## 1. Executive Summary
This report contains a full-platform security audit covering authentication, authorization, RPCs, RLS, payment security, and HR/CRM modules.

## 7. PostgreSQL Function / RPC Audit

### Function: `check_rate_limit`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_key text, p_max_requests integer, p_window_seconds integer`

### Function: `sync_crm_pipeline_stage`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `customer_purchase_from_merchant`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_inventory_id uuid, p_quantity integer, p_customer_id uuid`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `sync_platform_retail_price`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: ``

### Function: `order_groups_merchant_update_guard`
- **Security Definer**: False
- **Has auth.uid() check**: True
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: ``

### Function: `update_merchant_inventory_stock`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=False
- **Is Financial/Reward**: False
- **Arguments**: `p_inventory_id uuid, p_new_stock integer`

### Function: `enforce_flash_sale_max_active`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `trg_route_user_to_crm`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `purchase_platform_products`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_product_id uuid, p_quantity integer, p_merchant_id uuid`

### Function: `encrypt_pii`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `data text, secret_key text`

### Function: `decrypt_pii`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `encrypted_data text, secret_key text`

### Function: `wallet_activate_gold_subscription`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=False
- **Is Financial/Reward**: True
- **Arguments**: `p_user_id uuid, p_package_key text, p_idempotency_key text DEFAULT NULL::text`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `update_updated_at_column`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `update_reward_tree_stats`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_user_id uuid`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `admin_update_team`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=False, authenticated=False, PUBLIC=False
- **Is Financial/Reward**: False
- **Arguments**: `p_team_id uuid, p_expected_version integer DEFAULT NULL::integer, p_name text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_region_level text DEFAULT NULL::text, p_state text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_area text DEFAULT NULL::text, p_parent_team_id uuid DEFAULT NULL::uuid, p_team_lead_id uuid DEFAULT NULL::uuid, p_color text DEFAULT NULL::text, p_retain_old_lead boolean DEFAULT true, p_caller_id uuid DEFAULT NULL::uuid, p_reason text DEFAULT NULL::text, p_request_id text DEFAULT NULL::text`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `admin_bulk_transfer_members`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=False, authenticated=False, PUBLIC=False
- **Is Financial/Reward**: False
- **Arguments**: `p_source_team_id uuid, p_target_team_id uuid, p_user_ids uuid[], p_caller_id uuid DEFAULT NULL::uuid, p_reason text DEFAULT NULL::text, p_request_id text DEFAULT NULL::text`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `admin_create_team`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=False, authenticated=False, PUBLIC=False
- **Is Financial/Reward**: False
- **Arguments**: `p_name text, p_region_level text, p_description text DEFAULT NULL::text, p_state text DEFAULT 'Madhya Pradesh'::text, p_city text DEFAULT NULL::text, p_area text DEFAULT NULL::text, p_parent_team_id uuid DEFAULT NULL::uuid, p_team_lead_id uuid DEFAULT NULL::uuid, p_color text DEFAULT '#6366f1'::text, p_caller_id uuid DEFAULT NULL::uuid, p_request_id text DEFAULT NULL::text`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `admin_add_team_member`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=False, authenticated=False, PUBLIC=False
- **Is Financial/Reward**: False
- **Arguments**: `p_team_id uuid, p_user_id uuid, p_caller_id uuid DEFAULT NULL::uuid, p_reason text DEFAULT NULL::text, p_request_id text DEFAULT NULL::text`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `admin_remove_team_member`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=False, authenticated=False, PUBLIC=False
- **Is Financial/Reward**: False
- **Arguments**: `p_user_id uuid, p_caller_id uuid DEFAULT NULL::uuid, p_team_id uuid DEFAULT NULL::uuid, p_reason text DEFAULT NULL::text, p_request_id text DEFAULT NULL::text`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `admin_deactivate_team`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=False, authenticated=False, PUBLIC=False
- **Is Financial/Reward**: False
- **Arguments**: `p_team_id uuid, p_expected_version integer DEFAULT NULL::integer, p_caller_id uuid DEFAULT NULL::uuid, p_reason text DEFAULT NULL::text, p_request_id text DEFAULT NULL::text`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `award_team_incentive`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=False, authenticated=True, PUBLIC=False
- **Is Financial/Reward**: True
- **Arguments**: `p_team_id uuid, p_incentive_type text, p_allocation_mode text, p_input_amount_paise bigint, p_include_lead boolean DEFAULT true, p_description text DEFAULT NULL::text, p_internal_note text DEFAULT NULL::text, p_effective_date date DEFAULT CURRENT_DATE, p_payroll_month integer DEFAULT NULL::integer, p_payroll_year integer DEFAULT NULL::integer, p_idempotency_key text DEFAULT NULL::text, p_caller_id uuid DEFAULT NULL::uuid`

### Function: `transition_incentive_batch`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=False, authenticated=True, PUBLIC=False
- **Is Financial/Reward**: True
- **Arguments**: `p_batch_id uuid, p_target_action text, p_expected_status text, p_expected_version integer, p_reason text DEFAULT NULL::text, p_caller_id uuid DEFAULT NULL::uuid`

### Function: `preview_team_incentive`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=False, authenticated=True, PUBLIC=False
- **Is Financial/Reward**: True
- **Arguments**: `p_team_id uuid, p_allocation_mode text, p_input_amount_paise bigint, p_include_lead boolean DEFAULT true`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `clock_in_attendance`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_lat numeric DEFAULT NULL::numeric, p_lng numeric DEFAULT NULL::numeric, p_employee_id uuid DEFAULT NULL::uuid`

### Function: `clock_out_attendance`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_lat numeric DEFAULT NULL::numeric, p_lng numeric DEFAULT NULL::numeric, p_employee_id uuid DEFAULT NULL::uuid`

### Function: `review_leave_request`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_request_id uuid, p_action text, p_note text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid`

### Function: `hr_override_attendance`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_attendance_id uuid, p_status text, p_reason text, p_actor_id uuid DEFAULT NULL::uuid`

### Function: `recalculate_user_tier`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_user_id uuid`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `sync_product_category_name`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=False
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `get_applied_migrations`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `admin_update_user_role`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=False, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_target_user_id uuid, p_new_role text`

### Function: `admin_reassign_lead`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=False, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_lead_id uuid, p_new_rep_id uuid`

### Function: `merchant_unlist_from_marketplace`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_coupon_id uuid`

### Function: `submit_leave_request`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_leave_type text, p_from_date date, p_to_date date, p_reason text DEFAULT NULL::text, p_employee_id uuid DEFAULT NULL::uuid`

### Function: `adjust_employee_leave_balance`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=False, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_balance_id uuid, p_delta_days numeric, p_reason text, p_actor_id uuid DEFAULT NULL::uuid`

### Function: `admin_review_leave_request`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=False, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_request_id uuid, p_action text, p_note text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid`

### Function: `hr_review_leave_request`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_request_id uuid, p_action text, p_note text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid`

### Function: `close_stale_attendance`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=False
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `cancel_leave_request`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_request_id uuid, p_reason text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid`

### Function: `crm_bulk_assign_leads`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_lead_ids uuid[], p_new_rep_id uuid`

### Function: `touch_team_service_areas_updated_at`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `crm_log_routing_change`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `crm_current_role`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `crm_preview_team_for_location`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_pincode text, p_zone text, p_area text, p_city text, p_state text`

### Function: `crm_reroute_leads`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `update_merchant_approved_at`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `crm_pick_team_rep`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_team_id uuid`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `crm_authorized_team_ids`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `crm_territory_dashboard`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_team_id uuid DEFAULT NULL::uuid`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `update_crm_lead_remarks_updated_at`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `set_limit`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `real`

### Function: `show_limit`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `show_trgm`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `text`

### Function: `similarity`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `text, text`

### Function: `similarity_op`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `text, text`

### Function: `word_similarity`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `text, text`

### Function: `word_similarity_op`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `text, text`

### Function: `word_similarity_commutator_op`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `text, text`

### Function: `similarity_dist`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `text, text`

### Function: `word_similarity_dist_op`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `text, text`

### Function: `word_similarity_dist_commutator_op`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `text, text`

### Function: `gtrgm_in`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `cstring`

### Function: `gtrgm_out`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `gtrgm`

### Function: `gtrgm_consistent`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `internal, text, smallint, oid, internal`

### Function: `gtrgm_distance`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `internal, text, smallint, oid, internal`

### Function: `gtrgm_compress`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `internal`

### Function: `gtrgm_decompress`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `internal`

### Function: `gtrgm_penalty`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `internal, internal, internal`

### Function: `gtrgm_picksplit`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `internal, internal`

### Function: `gtrgm_union`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `internal, internal`

### Function: `gtrgm_same`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `gtrgm, gtrgm, internal`

### Function: `gin_extract_value_trgm`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `text, internal`

### Function: `gin_extract_query_trgm`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `text, internal, smallint, internal, internal, internal, internal`

### Function: `gin_trgm_consistent`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `internal, smallint, text, integer, internal, internal, internal, internal`

### Function: `gin_trgm_triconsistent`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `internal, smallint, text, integer, internal, internal, internal`

### Function: `strict_word_similarity`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `text, text`

### Function: `strict_word_similarity_op`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `text, text`

### Function: `strict_word_similarity_commutator_op`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `text, text`

### Function: `strict_word_similarity_dist_op`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `text, text`

### Function: `strict_word_similarity_dist_commutator_op`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `text, text`

### Function: `gtrgm_options`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `internal`

### Function: `purchase_coupon`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_coupon_id uuid, p_payment_reference text`

### Function: `fn_sync_lead_team`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `normalize_kyc_status`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `fn_sync_leads_on_team_transfer`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `cancel_stale_gateway_drafts`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: ``

### Function: `add_to_shopping_cart`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_customer_id uuid, p_inventory_id uuid, p_product_id uuid, p_quantity integer, p_is_platform boolean`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `admin_bulk_insert_coupons_v2`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=False, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `coupons_data jsonb`

### Function: `get_wholesale_purchase_batch`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_batch_id uuid`

### Function: `trg_route_solar_to_crm`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `sync_merchant_to_crm`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `finalize_gateway_orders`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_group_id uuid, p_customer_id uuid, p_amount_paise bigint`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `get_user_id_by_phone`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `phone_number text`

### Function: `get_storefront_page`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_merchant_slug text, p_offset integer DEFAULT 0, p_limit integer DEFAULT 24, p_search text DEFAULT ''::text, p_category text DEFAULT ''::text, p_last_id uuid DEFAULT NULL::uuid`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `admin_mark_expired_coupons`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=False, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `update_admin_tasks_updated_at`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `perform_wallet_adjustment`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_target_user_id uuid, p_wallet_type text, p_operation text, p_amount_paise bigint, p_admin_user_id uuid, p_reason text, p_idempotency_key uuid, p_ip_address text DEFAULT '0.0.0.0'::text, p_user_agent text DEFAULT ''::text`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `add_to_shopping_cart`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_customer_id uuid, p_inventory_id uuid, p_quantity integer`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `calculate_and_distribute_rewards`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=False
- **Is Financial/Reward**: True
- **Arguments**: `p_event_type text, p_source_user_id uuid, p_reference_id uuid DEFAULT NULL::uuid, p_reference_type text DEFAULT NULL::text, p_amount_paise bigint DEFAULT 0`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `check_merchant_group_access`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `grp_id uuid`

### Function: `check_platform_inventory_stock_update`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `get_kyc_dashboard_stats`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `audit_crm_leads_changes`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `crm_match_team_for_location`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_pincode text, p_zone text, p_area text, p_city text, p_state text, OUT out_team_id uuid, OUT out_match_type territory_area_type`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `crm_bulk_preview_team_for_location`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_locations jsonb`

### Function: `customer_checkout_v4`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_customer_id uuid`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `distribute_merchant_referral_reward`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_new_merchant_id uuid`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `draft_cart_orders`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_customer_id uuid`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `decrement_inventory`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_merchant_id uuid, p_product_id uuid, p_quantity integer`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `merchant_request_payout`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_user_id uuid, p_amount_paise bigint, p_source text, p_reference_id uuid, p_idempotency_key text, p_requested_ip text DEFAULT NULL::text, p_requested_user_agent text DEFAULT NULL::text`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `convert_points_to_wallet`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=False
- **Is Financial/Reward**: True
- **Arguments**: `p_user_id uuid, p_points bigint`

### Function: `customer_bulk_purchase_v2`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=False
- **Is Financial/Reward**: True
- **Arguments**: `p_items jsonb[], p_customer_id uuid`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `audit_kyc_automation`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `generate_product_slug`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `merchant_bulk_purchase_coupons`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_coupon_ids uuid[], p_merchant_id uuid DEFAULT NULL::uuid`

### Function: `handle_new_user_wallet`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: ``

### Function: `has_hr_manager_access`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `crm_convert_lead_to_customer`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=False
- **Is Financial/Reward**: False
- **Arguments**: `p_lead_id uuid, p_user_id uuid, p_notes text DEFAULT NULL::text`

### Function: `crm_convert_lead_to_merchant`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=False
- **Is Financial/Reward**: False
- **Arguments**: `p_lead_id uuid, p_merchant_id uuid, p_notes text DEFAULT NULL::text`

### Function: `is_admin`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `get_my_coupon_code`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_coupon_id uuid`

### Function: `handle_new_user`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: ``

### Function: `reset_otp_rate_limit`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=False, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_phone text`

### Function: `get_user_id_by_email`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `email_address text`

### Function: `admin_get_takeover_orders`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: False
- **Grants**: anon=False, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_status text DEFAULT NULL::text`

### Function: `merchant_purchase_coupon`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_coupon_id uuid, p_quantity integer DEFAULT 1, p_merchant_id uuid DEFAULT NULL::uuid`

### Function: `merchant_update_listing_price`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_coupon_id uuid, p_new_selling_price_paise bigint`

### Function: `normalize_in_phone`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_raw text`

### Function: `purchase_platform_products_bulk`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_items jsonb[], p_merchant_id uuid`

### Function: `publish_leave_policy_year`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_policy_year_id uuid, p_actor_id uuid DEFAULT NULL::uuid`

### Function: `set_updated_at`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `settle_store_credit_for_cart`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_udhari_request_id uuid, p_customer_user_id uuid`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `settle_udhari_gateway_payment`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_udhari_request_id uuid, p_customer_user_id uuid, p_amount_paise bigint, p_customer_email text DEFAULT NULL::text`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `reset_expiry_clock_on_activity`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: ``

### Function: `get_admin_merchant_custom_counts`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=False
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `update_solar_leads_updated_at`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `update_payout_requests_updated_at`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `update_order_status_v2`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_order_id uuid, p_delivery_status text, p_tracking_number text DEFAULT NULL::text, p_estimated_delivery_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_status_notes text DEFAULT NULL::text`

### Function: `merchant_list_to_marketplace`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_coupon_id uuid, p_selling_price_paise bigint`

### Function: `merchant_escalate_order`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_order_id uuid, p_merchant_id uuid`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `finalize_coupon_purchase`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_order_id uuid, p_payment_id text`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `merchant_cancel_pending_payout`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_user_id uuid, p_request_id uuid`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `admin_suspend_user`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=False, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_user_id uuid, p_reason text`

### Function: `merchants_block_sensitive_column_updates`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: ``

### Function: `sync_user_profile_team_id`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `rollback_rate_limit`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_key text`

### Function: `check_team_hierarchy_integrity`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `merge_duplicate_user_data`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=False, authenticated=False, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_duplicate_id uuid, p_original_id uuid`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `update_order_delivery_v3`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_order_id uuid, p_new_status text, p_tracking_number text, p_estimated_at timestamp with time zone, p_status_notes text, p_is_admin boolean DEFAULT false, p_is_merchant boolean DEFAULT false, p_is_customer boolean DEFAULT false`

### Function: `notify_crm_task_changes`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `customer_purchase_from_platform`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=False
- **Is Financial/Reward**: True
- **Arguments**: `p_product_id uuid, p_quantity integer, p_customer_id uuid`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `fn_sync_leave_policy_to_balances`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `notify_crm_team_members_changes`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `admin_reject_payout`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=False, authenticated=True, PUBLIC=False
- **Is Financial/Reward**: True
- **Arguments**: `p_request_id uuid, p_admin_user_id uuid, p_admin_note text`

### Function: `admin_link_email_identity`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=False, authenticated=True, PUBLIC=False
- **Is Financial/Reward**: False
- **Arguments**: `target_user_id uuid, target_email text`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `admin_update_order_status`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_order_id uuid, p_delivery_status text, p_tracking_number text DEFAULT NULL::text, p_estimated_delivery_date date DEFAULT NULL::date`

### Function: `merchant_activate_auto_mode`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_merchant_id uuid, p_price_paise bigint, p_description text, p_metadata jsonb DEFAULT '{}'::jsonb`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `crm_route_lead_territory`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `increment_customer_wallet`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_user_id uuid, p_amount_paise bigint, p_type text, p_description text, p_reference_id text DEFAULT NULL::text, p_reference_type text DEFAULT NULL::text`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `build_merchant_tree_path`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_new_merchant_id uuid, p_parent_merchant_id uuid`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `admin_update_product_stock`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=False, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_id uuid, p_admin_stock integer`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `admin_takeover_single_order`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=False, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_order_id uuid, p_admin_id uuid DEFAULT NULL::uuid`

### Function: `sync_kyc_status_to_user_profiles`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `procure_from_merchant`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=False
- **Is Financial/Reward**: True
- **Arguments**: `p_merchant_id uuid, p_items jsonb, p_idempotency_key uuid, p_admin_id uuid DEFAULT NULL::uuid`

### Function: `merchant_get_my_orders_debug`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_merchant_id uuid, p_status text DEFAULT NULL::text`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `respond_store_credit_request`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_udhari_request_id uuid, p_merchant_user_id uuid, p_action text, p_duration_days integer DEFAULT NULL::integer`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `get_merchant_categories`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_merchant_slug text`

### Function: `customer_bulk_purchase`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_items jsonb, p_customer_id uuid`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `build_reward_tree_path`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=False
- **Is Financial/Reward**: True
- **Arguments**: `p_new_user_id uuid, p_parent_id uuid`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `notify_admin_task_changes`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `notify_user_profile_changes`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `wallet_buy_gift_card`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_user_id uuid, p_coupon_id uuid`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `update_updated_at`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `update_wallet_balance`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: ``

### Function: `merchant_approve_udhari_request`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=False
- **Is Financial/Reward**: True
- **Arguments**: `p_request_id uuid, p_duration_days integer, p_merchant_note text, p_disclaimer_accepted boolean`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `generate_merchant_slug`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `admin_bulk_insert_coupons`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=False, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `coupons_data jsonb`

### Function: `crm_check_customer_for_lead`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=False
- **Is Financial/Reward**: False
- **Arguments**: `p_lead_id uuid`

### Function: `admin_get_all_orders`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=False, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_limit integer DEFAULT 200, p_offset integer DEFAULT 0`

### Function: `warn_expiring_reward_points`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: ``

### Function: `settle_udhari_payment`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_udhari_request_id uuid, p_customer_user_id uuid, p_extra_fee_paise bigint, p_customer_email text DEFAULT NULL::text`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `upsert_platform_setting`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_key text, p_value text`

### Function: `admin_get_order_detail`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=False, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_order_id uuid`

### Function: `notify_crm_lead_changes`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `merchant_get_my_orders`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_merchant_id uuid, p_status text DEFAULT NULL::text`

### Function: `admin_update_shopping_product`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: False
- **Grants**: anon=False, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_id uuid, p_title text, p_description text, p_category text, p_category_id uuid, p_wholesale_price bigint, p_retail_price bigint, p_mrp_paise bigint, p_admin_stock integer, p_product_images text[], p_is_active boolean, p_gst_percentage integer DEFAULT 0, p_hsn_code text DEFAULT NULL::text`

### Function: `team_get_user_subtree`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=False
- **Is Financial/Reward**: False
- **Arguments**: `p_user_id uuid`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `create_notification`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_user_id uuid, p_title text, p_body text, p_type text, p_priority text, p_action_url text, p_reference_type text, p_reference_id uuid, p_idempotency_key text DEFAULT NULL::text`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `notify_hrm_leave_requests`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `merchant_reject_udhari_request`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=False
- **Is Financial/Reward**: True
- **Arguments**: `p_request_id uuid, p_merchant_note text`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `request_store_credit_for_cart`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_customer_id uuid, p_group_id uuid, p_merchant_id uuid, p_amount_paise bigint, p_duration_days integer`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `notify_team_members_changes`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `sync_user_to_crm`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `crm_check_merchant_for_lead`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=False
- **Is Financial/Reward**: False
- **Arguments**: `p_lead_id uuid`

### Function: `get_admin_shopping_stats`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=False
- **Is Financial/Reward**: True
- **Arguments**: ``

### Function: `admin_unsuspend_user`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=False, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: `p_user_id uuid`

### Function: `admin_insert_shopping_product`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: False
- **Grants**: anon=False, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_title text, p_description text, p_category text, p_category_id uuid, p_wholesale_price bigint, p_retail_price bigint, p_mrp_paise bigint, p_admin_stock integer, p_product_images text[], p_is_active boolean DEFAULT false, p_gst_percentage integer DEFAULT 0, p_hsn_code text DEFAULT NULL::text`

### Function: `admin_takeover_stale_orders`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=False, authenticated=False, PUBLIC=False
- **Is Financial/Reward**: True
- **Arguments**: ``

### Function: `atomic_customer_wallet_credit`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: False
- **Grants**: anon=False, authenticated=False, PUBLIC=False
- **Is Financial/Reward**: True
- **Arguments**: `p_user_id uuid, p_amount_paise bigint, p_type text, p_description text, p_reference_id text, p_reference_type text`

### Function: `admin_approve_payout`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=False, authenticated=True, PUBLIC=False
- **Is Financial/Reward**: True
- **Arguments**: `p_payout_request_id uuid, p_admin_user_id uuid, p_admin_note text DEFAULT NULL::text, p_utr_reference text DEFAULT NULL::text`

### Function: `user_profiles_block_sensitive_column_updates`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: ``

### Function: `award_individual_incentive`
- **Security Definer**: True
- **Has auth.uid() check**: True
- **Has search_path**: True
- **Grants**: anon=False, authenticated=True, PUBLIC=False
- **Is Financial/Reward**: True
- **Arguments**: `p_employee_id uuid, p_incentive_type text, p_amount_paise bigint, p_description text DEFAULT NULL::text, p_internal_note text DEFAULT NULL::text, p_effective_date date DEFAULT CURRENT_DATE, p_payroll_month integer DEFAULT NULL::integer, p_payroll_year integer DEFAULT NULL::integer, p_idempotency_key text DEFAULT NULL::text, p_caller_id uuid DEFAULT NULL::uuid`

### Function: `update_solar_leads_mod_time`
- **Security Definer**: False
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `finalize_wholesale_gateway_purchase`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_draft_id uuid, p_amount_paise bigint`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `trg_route_merchant_to_crm`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: False
- **Arguments**: ``

### Function: `buy_coupon_merchant`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: `p_user_id uuid, p_coupon_id uuid`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `expire_stale_reward_points`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=True
- **Is Financial/Reward**: True
- **Arguments**: ``

### Function: `calculate_leave_days_breakdown`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: True
- **Grants**: anon=True, authenticated=True, PUBLIC=False
- **Is Financial/Reward**: False
- **Arguments**: `p_from_date date, p_to_date date, p_employee_id uuid DEFAULT NULL::uuid`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

### Function: `create_wholesale_draft`
- **Security Definer**: True
- **Has auth.uid() check**: False
- **Has search_path**: False
- **Grants**: anon=True, authenticated=True, PUBLIC=False
- **Is Financial/Reward**: True
- **Arguments**: `p_merchant_id uuid, p_items jsonb`
- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)

## 6. RLS Audit

### Table: `merchant_udhari_settings`
- **SELECT** (`Allow authenticated users to read udhari settings`):
  - Roles: ['authenticated']
  - Using: `true`
- **SELECT** (`merchant_read_udhari_settings`):
  - Roles: ['public']
  - Using: `(merchant_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = auth.uid())))`
- **UPDATE** (`merchant_update_udhari_settings`):
  - Roles: ['public']
  - Using: `(merchant_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = auth.uid())))`
  - **⚠️ WARNING**: Simple ownership check on UPDATE. Needs column-level guards.
- **SELECT** (`service_role_read_udhari_settings`):
  - Roles: ['public']
  - Using: `(auth.role() = 'service_role'::text)`

### Table: `giftcards`
- **DELETE** (`Admins can delete giftcards`):
  - Roles: ['public']
  - Using: `(( SELECT user_profiles.role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))`
- **INSERT** (`Admins can insert giftcards`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `(( SELECT user_profiles.role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))`
- **UPDATE** (`Admins can update giftcards`):
  - Roles: ['public']
  - Using: `(( SELECT user_profiles.role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))`
- **SELECT** (`Admins can view all giftcards`):
  - Roles: ['public']
  - Using: `(( SELECT user_profiles.role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))`
- **SELECT** (`Public can view active giftcards`):
  - Roles: ['public']
  - Using: `(is_active = true)`

### Table: `incentives`
- **ALL** (`Enable all actions for hr_manager and admin`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = auth.uid()) AND (up.role = ANY (ARRAY['admin'::user_role, 'hr_manager'::user_role])))))`
- **SELECT** (`Enable read access for own incentives`):
  - Roles: ['public']
  - Using: `(employee_id = auth.uid())`

### Table: `reward_tree_paths`
- **SELECT** (`Admins can view all tree paths`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))))`
- **INSERT** (`Service role can insert tree paths`):
  - Roles: ['service_role']
  - Using: `None`
  - With Check: `true`
- **SELECT** (`Service role can select tree paths`):
  - Roles: ['service_role']
  - Using: `true`
- **SELECT** (`Users can view own tree paths`):
  - Roles: ['public']
  - Using: `((ancestor_id = auth.uid()) OR (descendant_id = auth.uid()))`

### Table: `orders`
- **INSERT** (`users_insert_own_orders`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `(( SELECT auth.uid() AS uid) = user_id)`
- **SELECT** (`users_view_own_orders`):
  - Roles: ['public']
  - Using: `(( SELECT auth.uid() AS uid) = user_id)`

### Table: `reward_configuration`
- **ALL** (`Admins can manage reward config`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))))`
- **SELECT** (`Anyone can view active reward config`):
  - Roles: ['public']
  - Using: `(is_active = true)`
- **ALL** (`Service role can manage reward config`):
  - Roles: ['service_role']
  - Using: `true`
  - With Check: `true`
- **SELECT** (`Service role can select reward config`):
  - Roles: ['service_role']
  - Using: `true`

### Table: `shopping_products`
- **ALL** (`Admins can manage products`):
  - Roles: ['authenticated']
  - Using: `is_admin()`
  - With Check: `is_admin()`
- **INSERT** (`Merchants can insert custom products`):
  - Roles: ['authenticated']
  - Using: `None`
  - With Check: `true`
- **SELECT** (`Merchants can view own products`):
  - Roles: ['authenticated']
  - Using: `((is_active = true) OR (submitted_by_merchant_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = ( SELECT auth.uid() AS uid)))))`
- **UPDATE** (`Merchants update own products`):
  - Roles: ['authenticated']
  - Using: `(submitted_by_merchant_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = ( SELECT auth.uid() AS uid))))`
  - With Check: `(submitted_by_merchant_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = ( SELECT auth.uid() AS uid))))`
  - **⚠️ WARNING**: Simple ownership check on UPDATE. Needs column-level guards.

### Table: `leave_policies`
- **SELECT** (`workforce_view_active_leave_policies`):
  - Roles: ['public']
  - Using: `((is_active = true) OR (( SELECT (user_profiles.role)::text AS role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'super_admin'::text])))`

### Table: `teams`
- **SELECT** (`teams_select_authenticated`):
  - Roles: ['authenticated']
  - Using: `true`
- **ALL** (`teams_write_admin`):
  - Roles: ['authenticated']
  - Using: `(( SELECT user_profiles.role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))`

### Table: `crm_lead_activities`
- **SELECT** (`RM can view activities on their leads, Managers/Admins can view`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM crm_leads l
  WHERE ((l.id = crm_lead_activities.lead_id) AND ((l.assigned_to = auth.uid()) OR (l.created_by = auth.uid()) OR (( SELECT (user_profiles.role)::text AS role
           FROM user_profiles
          WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['relationship_manager'::text, 'admin'::text, 'super_admin'::text]))))))`
- **INSERT** (`System/RM can insert activities`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `(( SELECT (user_profiles.role)::text AS role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['relationship_exec'::text, 'relationship_manager'::text, 'admin'::text, 'super_admin'::text]))`

### Table: `training_materials`
- **SELECT** (`all_view_training`):
  - Roles: ['public']
  - Using: `(auth.role() = 'authenticated'::text)`
- **ALL** (`hr_manage_training`):
  - Roles: ['public']
  - Using: `(( SELECT user_profiles.role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['hr_manager'::user_role, 'admin'::user_role, 'super_admin'::user_role]))`

### Table: `career_job_roles`
- **ALL** (`Admins can manage job roles`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND ((user_profiles.role)::text = ANY (ARRAY['admin'::text, 'super_admin'::text, 'hr_manager'::text])))))`
- **SELECT** (`Anyone can view active job roles`):
  - Roles: ['public']
  - Using: `(is_active = true)`

### Table: `leave_request_actions`
- **SELECT** (`view_authorized_leave_request_actions`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM leave_requests lr
  WHERE ((lr.id = leave_request_actions.leave_request_id) AND ((lr.employee_id = auth.uid()) OR (( SELECT (user_profiles.role)::text AS role
           FROM user_profiles
          WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['hr_manager'::text, 'admin'::text, 'super_admin'::text]))))))`

### Table: `otp_codes`
- **ALL** (`deny_all_otp_codes`):
  - Roles: ['public']
  - Using: `false`
  - With Check: `false`

### Table: `team_service_areas`
- **SELECT** (`tsa_select_all`):
  - Roles: ['authenticated']
  - Using: `true`

### Table: `leave_requests`
- **SELECT** (`emp_view_own_or_authorized_leave_requests`):
  - Roles: ['public']
  - Using: `((employee_id = auth.uid()) OR (( SELECT (user_profiles.role)::text AS role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['hr_manager'::text, 'admin'::text, 'super_admin'::text])))`

### Table: `panel_access_requests`
- **SELECT** (`Admins can read all access requests`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))))`
- **UPDATE** (`Admins can update access requests`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))))`
- **INSERT** (`HR can create access requests`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'hr_manager'::user_role))))`
- **SELECT** (`HR can read access requests`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'hr_manager'::user_role))))`
- **SELECT** (`Users can read their own access requests`):
  - Roles: ['public']
  - Using: `(user_id = auth.uid())`

### Table: `kyc_document_reviews`
- **SELECT** (`Employees can view own reviews`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM kyc_submissions s
  WHERE ((s.id = kyc_document_reviews.submission_id) AND (s.user_id = auth.uid()))))`
- **INSERT** (`HR/Admin can insert reviews`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `(( SELECT (user_profiles.role)::text AS role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['hr_manager'::text, 'admin'::text, 'super_admin'::text]))`
- **SELECT** (`HR/Admin can view all reviews`):
  - Roles: ['public']
  - Using: `(( SELECT (user_profiles.role)::text AS role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['hr_manager'::text, 'admin'::text, 'super_admin'::text]))`

### Table: `payroll_line_items`
- **SELECT** (`emp_read_own_payroll_items`):
  - Roles: ['authenticated']
  - Using: `(employee_id = auth.uid())`
- **SELECT** (`hr_read_payroll_items`):
  - Roles: ['authenticated']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = auth.uid()) AND (up.role = ANY (ARRAY['hr_manager'::user_role, 'admin'::user_role, 'super_admin'::user_role])))))`

### Table: `admin_permissions`
- **SELECT** (`Admins can view all permissions`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'::user_role))))`
- **ALL** (`Service role can manage permissions`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `true`

### Table: `payout_request_events`
- **SELECT** (`admin_view_all_payout_request_events`):
  - Roles: ['public']
  - Using: `is_admin()`
- **SELECT** (`merchant_view_own_payout_request_events`):
  - Roles: ['public']
  - Using: `(payout_id IN ( SELECT payout_requests.id
   FROM payout_requests
  WHERE (payout_requests.user_id = auth.uid())))`

### Table: `webchat_messages`
- **INSERT** (`Users can insert their own messages`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `(auth.uid() = user_id)`
- **SELECT** (`Users can view their own messages`):
  - Roles: ['public']
  - Using: `(auth.uid() = user_id)`

### Table: `restock_notifications`
- **UPDATE** (`admin_update_restock_notifications`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))))`
- **SELECT** (`admin_view_restock_notifications`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))))`
- **INSERT** (`public_insert_restock_notifications`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `true`

### Table: `shopping_orders`
- **SELECT** (`Users can view own purchase history`):
  - Roles: ['public']
  - Using: `(((buyer_type = 'customer'::text) AND (buyer_id = ( SELECT auth.uid() AS uid))) OR ((buyer_type = 'merchant'::text) AND (buyer_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = ( SELECT auth.uid() AS uid))))) OR ((seller_type = 'merchant'::text) AND (seller_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = ( SELECT auth.uid() AS uid))))))`

### Table: `attendance`
- **INSERT** (`employee_insert_attendance`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `(auth.uid() = employee_id)`
- **UPDATE** (`employee_update_own_attendance`):
  - Roles: ['public']
  - Using: `(employee_id = auth.uid())`
  - **⚠️ WARNING**: Simple ownership check on UPDATE. Needs column-level guards.
- **SELECT** (`employee_view_own_attendance`):
  - Roles: ['authenticated']
  - Using: `((employee_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['hr_manager'::user_role, 'admin'::user_role, 'super_admin'::user_role]))))))`
- **ALL** (`hr_all_attendance`):
  - Roles: ['public']
  - Using: `(( SELECT user_profiles.role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['hr_manager'::user_role, 'admin'::user_role, 'super_admin'::user_role]))`

### Table: `reward_points_balance`
- **SELECT** (`Admins can view all balances`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))))`
- **INSERT** (`Service role can insert balance`):
  - Roles: ['service_role']
  - Using: `None`
  - With Check: `true`
- **SELECT** (`Service role can select balance`):
  - Roles: ['service_role']
  - Using: `true`
- **UPDATE** (`Service role can update balance`):
  - Roles: ['service_role']
  - Using: `true`
  - With Check: `true`
- **SELECT** (`Users can view own balance`):
  - Roles: ['public']
  - Using: `(user_id = auth.uid())`

### Table: `shopping_order_items`
- **SELECT** (`Merchants view sold items`):
  - Roles: ['public']
  - Using: `(seller_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = ( SELECT auth.uid() AS uid))))`
- **SELECT** (`Users view own items`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM shopping_order_groups
  WHERE ((shopping_order_groups.id = shopping_order_items.group_id) AND (shopping_order_groups.customer_id = ( SELECT auth.uid() AS uid)))))`

### Table: `wallet_adjustment_logs`
- **SELECT** (`Admins can view all adjustment logs`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'::user_role))))`
- **INSERT** (`Service role can insert adjustment logs`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `true`
- **SELECT** (`Users can view own adjustment logs`):
  - Roles: ['public']
  - Using: `(target_user_id = auth.uid())`

### Table: `shopping_categories`
- **ALL** (`Admins can manage categories`):
  - Roles: ['authenticated']
  - Using: `is_admin()`
  - With Check: `is_admin()`
- **SELECT** (`Everyone can view active categories`):
  - Roles: ['public']
  - Using: `((is_active = true) OR is_admin())`

### Table: `shopping_order_groups`
- **SELECT** (`Admins can view all order groups`):
  - Roles: ['authenticated']
  - Using: `is_admin()`
- **UPDATE** (`Merchants update own order group status`):
  - Roles: ['public']
  - Using: `(merchant_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = ( SELECT auth.uid() AS uid))))`
  - With Check: `(merchant_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = ( SELECT auth.uid() AS uid))))`
  - **⚠️ WARNING**: Simple ownership check on UPDATE. Needs column-level guards.
- **SELECT** (`Merchants view group if sold item`):
  - Roles: ['public']
  - Using: `check_merchant_group_access(id)`
- **SELECT** (`Merchants view own order groups`):
  - Roles: ['public']
  - Using: `(merchant_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = ( SELECT auth.uid() AS uid))))`
- **SELECT** (`Users view own order groups`):
  - Roles: ['public']
  - Using: `(customer_id = ( SELECT auth.uid() AS uid))`

### Table: `pending_refunds`
- **SELECT** (`Merchants can view their own pending refunds`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM merchants m
  WHERE ((m.id = pending_refunds.merchant_id) AND (m.user_id = auth.uid()))))`

### Table: `reward_transactions`
- **SELECT** (`Admins can view all transactions`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))))`
- **INSERT** (`Service role can insert transactions`):
  - Roles: ['service_role']
  - Using: `None`
  - With Check: `true`
- **SELECT** (`Service role can select transactions`):
  - Roles: ['service_role']
  - Using: `true`
- **SELECT** (`Users can view own transactions`):
  - Roles: ['public']
  - Using: `(user_id = auth.uid())`

### Table: `udhari_requests`
- **INSERT** (`customers_insert_shop_udhari`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `((auth.uid() = customer_id) AND (source_type = 'shop_order'::text))`
- **SELECT** (`customers_view_own_udhari`):
  - Roles: ['public']
  - Using: `(auth.uid() = customer_id)`
- **SELECT** (`merchants_view_own_udhari`):
  - Roles: ['public']
  - Using: `(merchant_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = auth.uid())))`
- **SELECT** (`service_role_read_udhari_requests`):
  - Roles: ['public']
  - Using: `(auth.role() = 'service_role'::text)`

### Table: `merchant_investment_orders`
- **ALL** (`Admins can manage all investment orders`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))))`
- **SELECT** (`Merchants can view their investment orders`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM merchants
  WHERE ((merchants.id = merchant_investment_orders.merchant_id) AND (merchants.user_id = auth.uid()))))`

### Table: `audit_logs_crm`
- **INSERT** (`crm_insert_audit_logs_crm`):
  - Roles: ['authenticated']
  - Using: `None`
  - With Check: `true`
- **SELECT** (`crm_read_audit_logs_crm`):
  - Roles: ['authenticated']
  - Using: `(( SELECT user_profiles.role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['sales_manager'::user_role, 'admin'::user_role, 'super_admin'::user_role]))`

### Table: `merchant_tree_paths`
- **SELECT** (`Admins can view all merchant tree paths`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))))`
- **SELECT** (`Merchants can view own tree paths`):
  - Roles: ['authenticated']
  - Using: `((ancestor_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = auth.uid()))) OR (descendant_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = auth.uid()))))`
- **INSERT** (`Service role can insert merchant tree paths`):
  - Roles: ['service_role']
  - Using: `None`
  - With Check: `true`
- **SELECT** (`Service role can select merchant tree paths`):
  - Roles: ['service_role']
  - Using: `true`

### Table: `crm_tasks`
- **DELETE** (`crm_tasks_delete`):
  - Roles: ['authenticated']
  - Using: `(( SELECT user_profiles.role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['sales_manager'::user_role, 'admin'::user_role, 'super_admin'::user_role]))`
- **INSERT** (`crm_tasks_insert`):
  - Roles: ['authenticated']
  - Using: `None`
  - With Check: `(EXISTS ( SELECT 1
   FROM crm_leads l
  WHERE ((l.id = crm_tasks.lead_id) AND ((l.assigned_to = auth.uid()) OR (l.created_by = auth.uid()) OR (( SELECT user_profiles.role
           FROM user_profiles
          WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['sales_manager'::user_role, 'admin'::user_role, 'super_admin'::user_role]))))))`
- **SELECT** (`crm_tasks_select`):
  - Roles: ['authenticated']
  - Using: `((assigned_to = auth.uid()) OR (EXISTS ( SELECT 1
   FROM crm_leads l
  WHERE ((l.id = crm_tasks.lead_id) AND ((l.assigned_to = auth.uid()) OR (l.created_by = auth.uid()) OR (( SELECT user_profiles.role
           FROM user_profiles
          WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['sales_manager'::user_role, 'admin'::user_role, 'super_admin'::user_role])))))) OR (( SELECT user_profiles.role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['sales_manager'::user_role, 'admin'::user_role, 'super_admin'::user_role])))`
- **UPDATE** (`crm_tasks_update`):
  - Roles: ['authenticated']
  - Using: `((assigned_to = auth.uid()) OR (EXISTS ( SELECT 1
   FROM crm_leads l
  WHERE ((l.id = crm_tasks.lead_id) AND ((l.assigned_to = auth.uid()) OR (l.created_by = auth.uid()) OR (( SELECT user_profiles.role
           FROM user_profiles
          WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['sales_manager'::user_role, 'admin'::user_role, 'super_admin'::user_role])))))))`

### Table: `merchant_inventory`
- **SELECT** (`Anyone can view active inventory`):
  - Roles: ['public']
  - Using: `(is_active = true)`
- **DELETE** (`Merchants delete own inventory`):
  - Roles: ['authenticated']
  - Using: `(merchant_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = ( SELECT auth.uid() AS uid))))`
- **INSERT** (`Merchants insert own inventory`):
  - Roles: ['authenticated']
  - Using: `None`
  - With Check: `(merchant_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = ( SELECT auth.uid() AS uid))))`
- **UPDATE** (`Merchants update own inventory`):
  - Roles: ['authenticated']
  - Using: `(merchant_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = ( SELECT auth.uid() AS uid))))`
  - With Check: `(merchant_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = ( SELECT auth.uid() AS uid))))`
  - **⚠️ WARNING**: Simple ownership check on UPDATE. Needs column-level guards.
- **SELECT** (`Merchants view own inventory`):
  - Roles: ['authenticated']
  - Using: `(merchant_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = ( SELECT auth.uid() AS uid))))`

### Table: `coupon_codes`
- **INSERT** (`Admins can insert codes`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'::user_role))))`
- **SELECT** (`View own secrets`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM coupons
  WHERE ((coupons.id = coupon_codes.coupon_id) AND ((coupons.purchased_by = auth.uid()) OR (EXISTS ( SELECT 1
           FROM user_profiles
          WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'::user_role))))))))`

### Table: `merchants`
- **SELECT** (`Public can view approved merchants`):
  - Roles: ['public']
  - Using: `(status = 'approved'::text)`
- **SELECT** (`merchants_admin_select`):
  - Roles: ['public']
  - Using: `((user_id = ( SELECT auth.uid() AS uid)) OR is_admin())`
- **DELETE** (`merchants_delete_policy`):
  - Roles: ['public']
  - Using: `(( SELECT user_profiles.role
   FROM user_profiles
  WHERE (user_profiles.id = ( SELECT auth.uid() AS uid))) = 'admin'::user_role)`
- **INSERT** (`merchants_insert_policy`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `(user_id = ( SELECT auth.uid() AS uid))`
- **UPDATE** (`merchants_update_policy`):
  - Roles: ['public']
  - Using: `(user_id = ( SELECT auth.uid() AS uid))`
  - With Check: `(user_id = ( SELECT auth.uid() AS uid))`
  - **⚠️ WARNING**: Simple ownership check on UPDATE. Needs column-level guards.

### Table: `solar_lead_events`
- **ALL** (`Admins can view events`):
  - Roles: ['authenticated']
  - Using: `((auth.jwt() ->> 'role'::text) = ANY (ARRAY['admin'::text, 'super_admin'::text]))`
  - **⚠️ WARNING**: Uses JWT metadata for authorization
- **SELECT** (`Customers can view their own events`):
  - Roles: ['authenticated']
  - Using: `(EXISTS ( SELECT 1
   FROM solar_leads
  WHERE ((solar_leads.id = solar_lead_events.lead_id) AND (solar_leads.user_id = auth.uid()))))`

### Table: `transaction_logs`
- **SELECT** (`No read access on logs for users`):
  - Roles: ['public']
  - Using: `false`

### Table: `customer_wallet_transactions`
- **SELECT** (`App admins can view all wallet txs`):
  - Roles: ['public']
  - Using: `is_admin()`
- **SELECT** (`Users can view their own transactions`):
  - Roles: ['public']
  - Using: `(( SELECT auth.uid() AS uid) = user_id)`

### Table: `reward_distribution_log`
- **SELECT** (`Admins can view reward distribution logs`):
  - Roles: ['authenticated']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))))`

### Table: `audit_logs_hrm`
- **INSERT** (`hr_insert_audit_logs_hrm`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['hr_manager'::user_role, 'admin'::user_role, 'super_admin'::user_role])))))`
- **SELECT** (`hr_read_audit_logs_hrm`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['hr_manager'::user_role, 'admin'::user_role, 'super_admin'::user_role])))))`

### Table: `crm_lead_notes`
- **INSERT** (`RM can add notes to their leads`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `((auth.uid() = author_id) AND (EXISTS ( SELECT 1
   FROM crm_leads l
  WHERE ((l.id = crm_lead_notes.lead_id) AND ((l.assigned_to = auth.uid()) OR (l.created_by = auth.uid()) OR (( SELECT (user_profiles.role)::text AS role
           FROM user_profiles
          WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['relationship_manager'::text, 'admin'::text, 'super_admin'::text])))))))`
- **SELECT** (`RM can view notes on their leads, Managers/Admins can view all`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM crm_leads l
  WHERE ((l.id = crm_lead_notes.lead_id) AND ((l.assigned_to = auth.uid()) OR (l.created_by = auth.uid()) OR (( SELECT (user_profiles.role)::text AS role
           FROM user_profiles
          WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['relationship_manager'::text, 'admin'::text, 'super_admin'::text]))))))`

### Table: `auth_tokens`
- **ALL** (`auth_tokens_service_only`):
  - Roles: ['public']
  - Using: `false`
  - With Check: `false`

### Table: `webchat_sessions`
- **INSERT** (`Users can insert their own sessions`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `(auth.uid() = user_id)`
- **ALL** (`Users can insert/update their own sessions`):
  - Roles: ['public']
  - Using: `(auth.uid() = user_id)`
  - **⚠️ WARNING**: Simple ownership check on UPDATE. Needs column-level guards.
- **SELECT** (`Users can view their own sessions`):
  - Roles: ['public']
  - Using: `(auth.uid() = user_id)`

### Table: `crm_lead_services`
- **DELETE** (`crm_lead_services_delete`):
  - Roles: ['authenticated']
  - Using: `(( SELECT user_profiles.role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['sales_manager'::user_role, 'admin'::user_role, 'super_admin'::user_role]))`
- **INSERT** (`crm_lead_services_insert`):
  - Roles: ['authenticated']
  - Using: `None`
  - With Check: `(EXISTS ( SELECT 1
   FROM crm_leads l
  WHERE ((l.id = crm_lead_services.lead_id) AND ((l.assigned_to = auth.uid()) OR (l.created_by = auth.uid()) OR (( SELECT user_profiles.role
           FROM user_profiles
          WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['sales_manager'::user_role, 'admin'::user_role, 'super_admin'::user_role]))))))`
- **SELECT** (`crm_lead_services_select`):
  - Roles: ['authenticated']
  - Using: `(EXISTS ( SELECT 1
   FROM crm_leads l
  WHERE ((l.id = crm_lead_services.lead_id) AND ((l.assigned_to = auth.uid()) OR (l.created_by = auth.uid()) OR (( SELECT user_profiles.role
           FROM user_profiles
          WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['sales_manager'::user_role, 'admin'::user_role, 'super_admin'::user_role]))))))`
- **UPDATE** (`crm_lead_services_update`):
  - Roles: ['authenticated']
  - Using: `(EXISTS ( SELECT 1
   FROM crm_leads l
  WHERE ((l.id = crm_lead_services.lead_id) AND ((l.assigned_to = auth.uid()) OR (l.created_by = auth.uid()) OR (( SELECT user_profiles.role
           FROM user_profiles
          WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['sales_manager'::user_role, 'admin'::user_role, 'super_admin'::user_role]))))))`

### Table: `flash_sale_items`
- **ALL** (`Admins manage flash sale`):
  - Roles: ['authenticated']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = auth.uid()) AND (up.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))))`
  - With Check: `(EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = auth.uid()) AND (up.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))))`
- **SELECT** (`Public can view live flash sale`):
  - Roles: ['public']
  - Using: `((is_active = true) AND ((ends_at IS NULL) OR (ends_at > now())) AND (starts_at <= now()))`

### Table: `reward_daily_caps`
- **SELECT** (`Admins can view all caps`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))))`
- **INSERT** (`Service role can insert daily caps`):
  - Roles: ['service_role']
  - Using: `None`
  - With Check: `true`
- **SELECT** (`Service role can select daily caps`):
  - Roles: ['service_role']
  - Using: `true`
- **UPDATE** (`Service role can update daily caps`):
  - Roles: ['service_role']
  - Using: `true`
  - With Check: `true`
- **SELECT** (`Users can view own caps`):
  - Roles: ['public']
  - Using: `(user_id = auth.uid())`

### Table: `shopping_cart`
- **ALL** (`Users can manage own cart`):
  - Roles: ['public']
  - Using: `(customer_id = ( SELECT auth.uid() AS uid))`
  - With Check: `(customer_id = ( SELECT auth.uid() AS uid))`
  - **⚠️ WARNING**: Simple ownership check on UPDATE. Needs column-level guards.

### Table: `crm_lead_routing_log`
- **SELECT** (`routing_log_select`):
  - Roles: ['authenticated']
  - Using: `((crm_current_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])) OR ((crm_current_role() = 'relationship_manager'::text) AND (to_team_id = ANY (crm_authorized_team_ids()))))`

### Table: `kyc_submissions`
- **INSERT** (`Employees can insert own submissions`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `(user_id = auth.uid())`
- **UPDATE** (`Employees can update own submissions`):
  - Roles: ['public']
  - Using: `(user_id = auth.uid())`
  - With Check: `(user_id = auth.uid())`
  - **⚠️ WARNING**: Simple ownership check on UPDATE. Needs column-level guards.
- **SELECT** (`Employees can view own submissions`):
  - Roles: ['public']
  - Using: `(user_id = auth.uid())`
- **UPDATE** (`HR/Admin can update submissions`):
  - Roles: ['public']
  - Using: `(( SELECT (user_profiles.role)::text AS role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['hr_manager'::text, 'admin'::text, 'super_admin'::text]))`
- **SELECT** (`HR/Admin can view all submissions`):
  - Roles: ['public']
  - Using: `(( SELECT (user_profiles.role)::text AS role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['hr_manager'::text, 'admin'::text, 'super_admin'::text]))`

### Table: `employee_leave_balances`
- **SELECT** (`emp_view_own_leave_balances`):
  - Roles: ['public']
  - Using: `((employee_id = auth.uid()) OR (( SELECT (user_profiles.role)::text AS role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['hr_manager'::text, 'admin'::text, 'super_admin'::text])))`
- **SELECT** (`employee_view_own_leave_balances`):
  - Roles: ['authenticated']
  - Using: `((employee_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['hr_manager'::user_role, 'admin'::user_role, 'super_admin'::user_role]))))))`

### Table: `merchant_transactions`
- **SELECT** (`Merchants can view own transactions`):
  - Roles: ['public']
  - Using: `(merchant_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = auth.uid())))`
- **ALL** (`Service role has full access to merchant_transactions`):
  - Roles: ['service_role']
  - Using: `true`
  - With Check: `true`
- **SELECT** (`merchant_transactions_admin_select`):
  - Roles: ['public']
  - Using: `is_admin()`
- **SELECT** (`merchant_transactions_select_own`):
  - Roles: ['authenticated']
  - Using: `(merchant_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = auth.uid())))`

### Table: `crm_lead_remarks`
- **DELETE** (`crm_lead_remarks_delete`):
  - Roles: ['public']
  - Using: `((author_id = auth.uid()) OR (( SELECT (user_profiles.role)::text AS role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'super_admin'::text])))`
- **INSERT** (`crm_lead_remarks_insert`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `((author_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM crm_leads l
  WHERE ((l.id = crm_lead_remarks.lead_id) AND ((l.assigned_to = auth.uid()) OR (l.created_by = auth.uid()) OR (( SELECT (user_profiles.role)::text AS role
           FROM user_profiles
          WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['relationship_exec'::text, 'relationship_manager'::text, 'admin'::text, 'super_admin'::text])))))))`
- **SELECT** (`crm_lead_remarks_select`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM crm_leads l
  WHERE ((l.id = crm_lead_remarks.lead_id) AND ((l.assigned_to = auth.uid()) OR (l.created_by = auth.uid()) OR (( SELECT (user_profiles.role)::text AS role
           FROM user_profiles
          WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['relationship_manager'::text, 'admin'::text, 'super_admin'::text]))))))`
- **UPDATE** (`crm_lead_remarks_update`):
  - Roles: ['public']
  - Using: `((author_id = auth.uid()) OR (( SELECT (user_profiles.role)::text AS role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'super_admin'::text])))`

### Table: `career_applications`
- **ALL** (`Admins can manage all applications`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND ((user_profiles.role)::text = ANY (ARRAY['admin'::text, 'super_admin'::text, 'hr_manager'::text])))))`
- **INSERT** (`Users can insert applications`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `(auth.uid() = user_id)`
- **UPDATE** (`Users can update pending applications`):
  - Roles: ['public']
  - Using: `((auth.uid() = user_id) AND (status = 'pending'::text))`
  - **⚠️ WARNING**: Simple ownership check on UPDATE. Needs column-level guards.
- **SELECT** (`Users can view own applications`):
  - Roles: ['public']
  - Using: `(auth.uid() = user_id)`

### Table: `platform_procurement_items`
- **ALL** (`procurement_items_admin_all`):
  - Roles: ['public']
  - Using: `is_admin()`
  - With Check: `is_admin()`
- **SELECT** (`procurement_items_merchant_select`):
  - Roles: ['public']
  - Using: `(procurement_id IN ( SELECT platform_procurement_orders.id
   FROM platform_procurement_orders
  WHERE (platform_procurement_orders.merchant_id IN ( SELECT merchants.id
           FROM merchants
          WHERE (merchants.user_id = auth.uid())))))`

### Table: `leave_balance_adjustments`
- **SELECT** (`view_authorized_leave_balance_adjustments`):
  - Roles: ['public']
  - Using: `((employee_id = auth.uid()) OR (( SELECT (user_profiles.role)::text AS role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['hr_manager'::text, 'admin'::text, 'super_admin'::text])))`

### Table: `notifications`
- **INSERT** (`Service role can insert notifications`):
  - Roles: ['service_role']
  - Using: `None`
  - With Check: `true`
- **INSERT** (`users_insert_own_notifications`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `(auth.uid() = user_id)`
- **UPDATE** (`users_update_own_notifications`):
  - Roles: ['public']
  - Using: `(auth.uid() = user_id)`
  - With Check: `(auth.uid() = user_id)`
  - **⚠️ WARNING**: Simple ownership check on UPDATE. Needs column-level guards.
- **SELECT** (`users_view_own_notifications`):
  - Roles: ['public']
  - Using: `(auth.uid() = user_id)`

### Table: `whatsapp_message_logs`
- **INSERT** (`Agents can insert whatsapp logs`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `((auth.uid() = agent_id) OR (auth.uid() = user_id) OR (auth.uid() IS NOT NULL))`
- **UPDATE** (`Agents can update own whatsapp logs`):
  - Roles: ['public']
  - Using: `((auth.uid() = agent_id) OR (auth.uid() = user_id) OR (( SELECT user_profiles.role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))`
- **SELECT** (`Agents can view their tenant or own whatsapp logs`):
  - Roles: ['public']
  - Using: `((auth.uid() = agent_id) OR (auth.uid() = user_id) OR (( SELECT user_profiles.role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'sales_manager'::user_role, 'relationship_manager'::user_role])))`
- **SELECT** (`admins_read_all_logs`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))))`
- **ALL** (`service_role_all_logs`):
  - Roles: ['public']
  - Using: `true`
  - With Check: `true`
- **SELECT** (`users_read_own_logs`):
  - Roles: ['public']
  - Using: `(auth.uid() = user_id)`

### Table: `employees`
- **SELECT** (`Employees can view own profile, HR/Admins can view all`):
  - Roles: ['public']
  - Using: `((user_id = auth.uid()) OR (( SELECT user_profiles.role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['hr_manager'::user_role, 'admin'::user_role, 'super_admin'::user_role])))`
- **ALL** (`HR/Admins can insert/update employees`):
  - Roles: ['public']
  - Using: `(( SELECT user_profiles.role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['hr_manager'::user_role, 'admin'::user_role, 'super_admin'::user_role]))`

### Table: `audit_logs`
- **INSERT** (`authenticated_can_insert_audit_logs`):
  - Roles: ['authenticated']
  - Using: `None`
  - With Check: `true`

### Table: `payout_pii_access_log`
- **SELECT** (`admin_select_pii_log`):
  - Roles: ['service_role']
  - Using: `true`
- **INSERT** (`service_role_insert_pii_log`):
  - Roles: ['service_role']
  - Using: `None`
  - With Check: `true`

### Table: `organization_policy`
- **SELECT** (`authenticated_read_org_policy`):
  - Roles: ['authenticated']
  - Using: `true`

### Table: `coupons`
- **INSERT** (`Admins can create coupons`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))))`
- **UPDATE** (`Admins can update coupons`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))))`
- **SELECT** (`Admins can view all coupons`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))))`
- **SELECT** (`Customers can view marketplace coupons`):
  - Roles: ['public']
  - Using: `((listed_on_marketplace = true) AND (status = 'available'::coupon_status) AND (merchant_id IS NOT NULL) AND (valid_until >= now()))`
- **UPDATE** (`Merchants can update own coupons`):
  - Roles: ['public']
  - Using: `(merchant_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = auth.uid())))`
  - **⚠️ WARNING**: Simple ownership check on UPDATE. Needs column-level guards.
- **SELECT** (`Merchants can view own inventory`):
  - Roles: ['public']
  - Using: `(merchant_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = auth.uid())))`
- **SELECT** (`Merchants can view platform inventory`):
  - Roles: ['public']
  - Using: `((EXISTS ( SELECT 1
   FROM merchants
  WHERE ((merchants.user_id = auth.uid()) AND (merchants.status = 'approved'::text)))) AND (merchant_id IS NULL) AND (status = 'available'::coupon_status))`
- **SELECT** (`Users can view ordered coupons`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM orders
  WHERE ((orders.giftcard_id = coupons.id) AND (orders.user_id = auth.uid()))))`
- **SELECT** (`Users can view their own purchased coupons`):
  - Roles: ['public']
  - Using: `(purchased_by = auth.uid())`

### Table: `incentive_allocations`
- **SELECT** (`emp_read_own_allocations`):
  - Roles: ['authenticated']
  - Using: `(employee_id = auth.uid())`
- **SELECT** (`hr_read_allocations`):
  - Roles: ['authenticated']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = auth.uid()) AND (up.role = ANY (ARRAY['hr_manager'::user_role, 'admin'::user_role, 'super_admin'::user_role])))))`

### Table: `wallet_transactions`
- **SELECT** (`Admins can view all wallet transactions`):
  - Roles: ['public']
  - Using: `(( SELECT user_profiles.role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = 'admin'::user_role)`
- **INSERT** (`Users insert own wallet transactions`):
  - Roles: ['authenticated']
  - Using: `None`
  - With Check: `(auth.uid() = user_id)`
- **SELECT** (`Users view own wallet transactions`):
  - Roles: ['authenticated']
  - Using: `(auth.uid() = user_id)`

### Table: `platform_banners`
- **DELETE** (`Allow admin full delete access to banners`):
  - Roles: ['public']
  - Using: `is_admin()`
- **INSERT** (`Allow admin full insert access to banners`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `is_admin()`
- **SELECT** (`Allow admin full select access to banners`):
  - Roles: ['public']
  - Using: `is_admin()`
- **UPDATE** (`Allow admin full update access to banners`):
  - Roles: ['public']
  - Using: `is_admin()`
- **SELECT** (`Allow public read access to active banners`):
  - Roles: ['anon', 'authenticated']
  - Using: `(is_active = true)`

### Table: `user_channel_bindings`
- **ALL** (`service_role_all_bindings`):
  - Roles: ['public']
  - Using: `true`
  - With Check: `true`
- **SELECT** (`users_read_own_binding`):
  - Roles: ['public']
  - Using: `(auth.uid() = user_id)`

### Table: `user_profiles`
- **UPDATE** (`HR managers can update all profiles`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = auth.uid()) AND (up.role = ANY (ARRAY['hr_manager'::user_role, 'admin'::user_role, 'super_admin'::user_role])))))`
  - With Check: `(EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = auth.uid()) AND (up.role = ANY (ARRAY['hr_manager'::user_role, 'admin'::user_role, 'super_admin'::user_role])))))`
- **SELECT** (`HR managers can view all profiles`):
  - Roles: ['public']
  - Using: `((auth.uid() = id) OR is_admin() OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = auth.uid()) AND (up.role = ANY (ARRAY['hr_manager'::user_role, 'admin'::user_role, 'super_admin'::user_role]))))))`
- **UPDATE** (`Users can update own profile`):
  - Roles: ['public']
  - Using: `((( SELECT auth.uid() AS uid) = id) OR is_admin())`
  - With Check: `((( SELECT auth.uid() AS uid) = id) OR is_admin())`
  - **⚠️ WARNING**: Simple ownership check on UPDATE. Needs column-level guards.
- **SELECT** (`Users can view own profile`):
  - Roles: ['public']
  - Using: `((( SELECT auth.uid() AS uid) = id) OR is_admin())`
- **INSERT** (`insert_own_profile`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `(( SELECT auth.uid() AS uid) = id)`
- **SELECT** (`view_customer_profiles_for_merchants`):
  - Roles: ['public']
  - Using: `((EXISTS ( SELECT 1
   FROM (merchant_ratings mr
     JOIN merchants m ON ((mr.merchant_id = m.id)))
  WHERE ((mr.customer_id = user_profiles.id) AND (m.user_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM (shopping_order_groups sog
     JOIN merchants m ON ((sog.merchant_id = m.id)))
  WHERE ((sog.customer_id = user_profiles.id) AND (m.user_id = ( SELECT auth.uid() AS uid))))))`

### Table: `kyc_submission_files`
- **DELETE** (`Employees can delete own files`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM kyc_submissions s
  WHERE ((s.id = kyc_submission_files.submission_id) AND (s.user_id = auth.uid()) AND (s.status = ANY (ARRAY['draft'::kyc_submission_status, 'rejected'::kyc_submission_status])))))`
- **INSERT** (`Employees can insert own files`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `(EXISTS ( SELECT 1
   FROM kyc_submissions s
  WHERE ((s.id = kyc_submission_files.submission_id) AND (s.user_id = auth.uid()))))`
- **SELECT** (`Employees can view own files`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM kyc_submissions s
  WHERE ((s.id = kyc_submission_files.submission_id) AND (s.user_id = auth.uid()))))`
- **SELECT** (`HR/Admin can view all files`):
  - Roles: ['public']
  - Using: `(( SELECT (user_profiles.role)::text AS role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['hr_manager'::text, 'admin'::text, 'super_admin'::text]))`

### Table: `udhari_reminders`
- **SELECT** (`customers_view_own_reminders`):
  - Roles: ['public']
  - Using: `(udhari_request_id IN ( SELECT udhari_requests.id
   FROM udhari_requests
  WHERE (udhari_requests.customer_id = auth.uid())))`

### Table: `admin_tasks`
- **SELECT** (`admins_select_own_tasks`):
  - Roles: ['public']
  - Using: `(assigned_to = auth.uid())`
- **UPDATE** (`admins_update_own_task_status`):
  - Roles: ['public']
  - Using: `(assigned_to = auth.uid())`
  - **⚠️ WARNING**: Simple ownership check on UPDATE. Needs column-level guards.

### Table: `leave_policy_years`
- **SELECT** (`workforce_view_published_policy_years`):
  - Roles: ['public']
  - Using: `((status = 'published'::text) OR (( SELECT (user_profiles.role)::text AS role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'super_admin'::text])))`

### Table: `platform_settings`
- **ALL** (`Allow admins to manage platform settings`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))))`
  - With Check: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))))`
- **SELECT** (`Allow public read access to platform settings`):
  - Roles: ['public']
  - Using: `true`
- **ALL** (`Service role can manage platform settings`):
  - Roles: ['service_role']
  - Using: `true`
  - With Check: `true`

### Table: `transactions`
- **INSERT** (`Users can insert own transactions`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `(auth.uid() = user_id)`
- **SELECT** (`Users can view own transactions`):
  - Roles: ['public']
  - Using: `(auth.uid() = user_id)`

### Table: `platform_procurement_orders`
- **ALL** (`procurement_orders_admin_all`):
  - Roles: ['public']
  - Using: `is_admin()`
  - With Check: `is_admin()`
- **SELECT** (`procurement_orders_merchant_select`):
  - Roles: ['public']
  - Using: `(merchant_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = auth.uid())))`

### Table: `merchant_investments`
- **ALL** (`Admins can manage all investments`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))))`
- **INSERT** (`Merchants can create investment requests`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `(EXISTS ( SELECT 1
   FROM merchants
  WHERE ((merchants.id = merchant_investments.merchant_id) AND (merchants.user_id = auth.uid()))))`
- **SELECT** (`Merchants can view their own investments`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM merchants
  WHERE ((merchants.id = merchant_investments.merchant_id) AND (merchants.user_id = auth.uid()))))`

### Table: `merchant_ratings`
- **SELECT** (`Anyone can read ratings`):
  - Roles: ['authenticated']
  - Using: `true`
- **INSERT** (`Customers can insert own ratings`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `(( SELECT auth.uid() AS uid) = customer_id)`

### Table: `kyc_records`
- **SELECT** (`Admins can view all KYC`):
  - Roles: ['authenticated']
  - Using: `is_admin()`
- **INSERT** (`Users can create own KYC`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `(auth.uid() = user_id)`
- **SELECT** (`Users can view own KYC`):
  - Roles: ['public']
  - Using: `(auth.uid() = user_id)`

### Table: `incentive_batches`
- **SELECT** (`emp_read_batches`):
  - Roles: ['authenticated']
  - Using: `(EXISTS ( SELECT 1
   FROM incentive_allocations ia
  WHERE ((ia.batch_id = incentive_batches.id) AND (ia.employee_id = auth.uid()))))`
- **SELECT** (`hr_read_batches`):
  - Roles: ['authenticated']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = auth.uid()) AND (up.role = ANY (ARRAY['hr_manager'::user_role, 'admin'::user_role, 'super_admin'::user_role])))))`

### Table: `user_wishlists`
- **ALL** (`wishlist_owner_all`):
  - Roles: ['public']
  - Using: `(( SELECT auth.uid() AS uid) = user_id)`
  - With Check: `(( SELECT auth.uid() AS uid) = user_id)`
  - **⚠️ WARNING**: Simple ownership check on UPDATE. Needs column-level guards.

### Table: `reward_redemption_requests`
- **ALL** (`Admins can manage all requests`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))))`
- **INSERT** (`Users can insert own requests`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `(user_id = auth.uid())`
- **SELECT** (`Users can view own requests`):
  - Roles: ['public']
  - Using: `(user_id = auth.uid())`

### Table: `nfc_orders`
- **ALL** (`Nexus: Admin Orders`):
  - Roles: ['public']
  - Using: `is_admin()`
- **INSERT** (`Nexus: Create Order`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `true`
- **SELECT** (`Nexus: View Own Order`):
  - Roles: ['authenticated']
  - Using: `(auth.uid() = user_id)`

### Table: `crm_leads`
- **DELETE** (`Managers/Admins can delete leads`):
  - Roles: ['public']
  - Using: `(( SELECT user_profiles.role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['sales_manager'::user_role, 'admin'::user_role, 'super_admin'::user_role]))`
- **INSERT** (`RM can insert leads`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `(( SELECT (user_profiles.role)::text AS role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['relationship_exec'::text, 'relationship_manager'::text, 'admin'::text, 'super_admin'::text]))`
- **UPDATE** (`RM can update their own leads, Managers/Admins can update all`):
  - Roles: ['public']
  - Using: `((auth.uid() = assigned_to) OR (auth.uid() = created_by) OR (( SELECT (user_profiles.role)::text AS role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['relationship_manager'::text, 'admin'::text, 'super_admin'::text])))`
- **SELECT** (`crm_leads_select_exec`):
  - Roles: ['authenticated']
  - Using: `((crm_current_role() = 'relationship_exec'::text) AND ((assigned_to = auth.uid()) OR (created_by = auth.uid()) OR ((assigned_team_id IS NOT NULL) AND (assigned_team_id = ANY (crm_authorized_team_ids())))))`
- **SELECT** (`crm_leads_select_manager`):
  - Roles: ['authenticated']
  - Using: `((crm_current_role() = 'relationship_manager'::text) AND (assigned_team_id = ANY (crm_authorized_team_ids())))`
- **SELECT** (`crm_leads_select_super`):
  - Roles: ['authenticated']
  - Using: `(crm_current_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]))`
- **SELECT** (`crm_leads_select_territory_scoped`):
  - Roles: ['public']
  - Using: `
CASE
    WHEN (( SELECT (user_profiles.role)::text AS role
       FROM user_profiles
      WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'super_admin'::text])) THEN true
    WHEN (( SELECT (user_profiles.role)::text AS role
       FROM user_profiles
      WHERE (user_profiles.id = auth.uid())) = 'relationship_manager'::text) THEN ((auth.uid() = assigned_to) OR (auth.uid() = created_by) OR (assigned_team_id IN ( SELECT t.team_id
       FROM team_get_user_subtree(auth.uid()) t(team_id))) OR (assigned_to IN ( SELECT tm.user_id
       FROM team_members tm
      WHERE (tm.team_id IN ( SELECT t.team_id
               FROM team_get_user_subtree(auth.uid()) t(team_id))))))
    WHEN (( SELECT (user_profiles.role)::text AS role
       FROM user_profiles
      WHERE (user_profiles.id = auth.uid())) = 'relationship_exec'::text) THEN ((auth.uid() = assigned_to) OR (auth.uid() = created_by))
    ELSE false
END`

### Table: `team_members`
- **SELECT** (`team_members_select_authenticated`):
  - Roles: ['authenticated']
  - Using: `true`
- **ALL** (`team_members_write_admin_manager`):
  - Roles: ['authenticated']
  - Using: `(( SELECT user_profiles.role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'relationship_manager'::user_role]))`

### Table: `solar_leads`
- **ALL** (`Admins can do everything on solar_leads`):
  - Roles: ['authenticated']
  - Using: `((auth.jwt() ->> 'role'::text) = ANY (ARRAY['admin'::text, 'super_admin'::text]))`
  - **⚠️ WARNING**: Uses JWT metadata for authorization
- **SELECT** (`Customers can view their own active leads`):
  - Roles: ['authenticated']
  - Using: `(auth.uid() = user_id)`
- **ALL** (`admin_full_access_solar_leads`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))))`
  - With Check: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))))`
- **INSERT** (`anon_can_insert_solar_lead`):
  - Roles: ['anon']
  - Using: `None`
  - With Check: `true`
- **INSERT** (`authenticated_can_insert_solar_lead`):
  - Roles: ['authenticated']
  - Using: `None`
  - With Check: `true`
- **SELECT** (`users_can_read_own_solar_leads`):
  - Roles: ['authenticated']
  - Using: `((user_id = auth.uid()) OR (user_id IS NULL))`

### Table: `merchant_notification_settings`
- **INSERT** (`Merchants can insert their own notification settings`):
  - Roles: ['authenticated']
  - Using: `None`
  - With Check: `(merchant_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = auth.uid())))`
- **UPDATE** (`Merchants can update their own notification settings`):
  - Roles: ['authenticated']
  - Using: `(merchant_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = auth.uid())))`
  - With Check: `(merchant_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = auth.uid())))`
  - **⚠️ WARNING**: Simple ownership check on UPDATE. Needs column-level guards.
- **SELECT** (`Merchants can view their own notification settings`):
  - Roles: ['authenticated']
  - Using: `(merchant_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = auth.uid())))`

### Table: `payout_requests`
- **INSERT** (`merchant_insert_own_payout_requests`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `(auth.uid() = user_id)`
- **SELECT** (`merchant_view_own_payout_requests`):
  - Roles: ['public']
  - Using: `(auth.uid() = user_id)`
- **SELECT** (`payout_requests_admin_select`):
  - Roles: ['public']
  - Using: `is_admin()`
- **UPDATE** (`payout_requests_admin_update`):
  - Roles: ['public']
  - Using: `is_admin()`

### Table: `merchant_wallets`
- **SELECT** (`Admins can view all merchant wallets`):
  - Roles: ['public']
  - Using: `(( SELECT user_profiles.role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = 'admin'::user_role)`
- **SELECT** (`Users view own wallet`):
  - Roles: ['public']
  - Using: `(auth.uid() = user_id)`

### Table: `wholesale_order_drafts`
- **INSERT** (`Merchants can insert their own wholesale drafts`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `(EXISTS ( SELECT 1
   FROM merchants m
  WHERE ((m.id = wholesale_order_drafts.merchant_id) AND (m.user_id = auth.uid()))))`
- **SELECT** (`Merchants can view their own wholesale drafts`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM merchants m
  WHERE ((m.id = wholesale_order_drafts.merchant_id) AND (m.user_id = auth.uid()))))`
- **SELECT** (`Users can see their own wholesale drafts`):
  - Roles: ['public']
  - Using: `((EXISTS ( SELECT 1
   FROM merchants
  WHERE ((merchants.id = wholesale_order_drafts.merchant_id) AND (merchants.user_id = auth.uid())))) OR (( SELECT user_profiles.role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = 'admin'::user_role))`

### Table: `holidays`
- **SELECT** (`authenticated_read_holidays`):
  - Roles: ['authenticated']
  - Using: `true`

### Table: `kyc_document_requirements`
- **SELECT** (`Everyone can view requirements`):
  - Roles: ['public']
  - Using: `true`

### Table: `reward_configuration_history`
- **SELECT** (`Admins can view config history`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))))`

### Table: `lead_interactions`
- **INSERT** (`sales_insert_interaction`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `(auth.uid() = user_id)`
- **SELECT** (`sales_view_interactions`):
  - Roles: ['public']
  - Using: `((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'sales_manager'::user_role]))))))`

### Table: `nfc_settings`
- **ALL** (`Nexus: Admin Settings`):
  - Roles: ['public']
  - Using: `is_admin()`
- **SELECT** (`Nexus: Read Settings`):
  - Roles: ['public']
  - Using: `true`

### Table: `merchant_lockin_balances`
- **ALL** (`Admins can manage all lockin balances`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'::user_role))))`
  - With Check: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'::user_role))))`
- **SELECT** (`Merchants can view their own lockin balances`):
  - Roles: ['authenticated']
  - Using: `(merchant_id IN ( SELECT merchants.id
   FROM merchants
  WHERE (merchants.user_id = auth.uid())))`

### Table: `salary_records`
- **SELECT** (`employee_view_own_salary`):
  - Roles: ['public']
  - Using: `(employee_id = auth.uid())`
- **ALL** (`hr_manager_update_salary_mfa`):
  - Roles: ['public']
  - Using: `(( SELECT (user_profiles.role)::text AS role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['hr_manager'::text, 'admin'::text, 'super_admin'::text]))`
  - With Check: `(( SELECT (user_profiles.role)::text AS role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['hr_manager'::text, 'admin'::text, 'super_admin'::text]))`
- **SELECT** (`hr_read_salary`):
  - Roles: ['public']
  - Using: `(( SELECT (user_profiles.role)::text AS role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['hr'::text, 'hr_manager'::text, 'admin'::text, 'super_admin'::text]))`

### Table: `customer_wallets`
- **SELECT** (`App admins can view all wallets`):
  - Roles: ['public']
  - Using: `is_admin()`
- **INSERT** (`Users can insert their own wallet`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `(( SELECT auth.uid() AS uid) = user_id)`
- **SELECT** (`Users can view their own wallet`):
  - Roles: ['public']
  - Using: `(( SELECT auth.uid() AS uid) = user_id)`

### Table: `kyc_audit_logs`
- **SELECT** (`Admins can view all KYC audit logs`):
  - Roles: ['public']
  - Using: `is_admin()`
- **SELECT** (`Users can view own KYC audit logs`):
  - Roles: ['public']
  - Using: `(auth.uid() = user_id)`

### Table: `contact_messages`
- **UPDATE** (`admin_update_contact_messages`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))))`
- **SELECT** (`admin_view_contact_messages`):
  - Roles: ['public']
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])))))`
- **INSERT** (`public_insert_contact_messages`):
  - Roles: ['public']
  - Using: `None`
  - With Check: `true`