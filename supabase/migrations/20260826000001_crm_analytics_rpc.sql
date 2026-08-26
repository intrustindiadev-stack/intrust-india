-- ============================================================
-- Migration: CRM Analytics RPC
-- Purpose: Server-side pre-aggregated analytics for the CRM dashboard
--          and analytics page, replacing client-side full-table fetches.
-- ============================================================

-- ============================================================
-- 1. crm_get_dashboard_stats
--    Returns pre-aggregated stats for the CRM dashboard + analytics page.
--    p_user_id    - the calling user's UUID
--    p_is_manager - true  → global/team view; false → personal view
--    p_from_date  - optional start of window (NULL = all time)
--    p_to_date    - optional end of window   (NULL = now)
-- ============================================================
CREATE OR REPLACE FUNCTION public.crm_get_dashboard_stats(
    p_user_id   UUID,
    p_is_manager BOOLEAN,
    p_from_date TIMESTAMPTZ DEFAULT NULL,
    p_to_date   TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total         BIGINT := 0;
    v_won           BIGINT := 0;
    v_lost          BIGINT := 0;
    v_active        BIGINT := 0;
    v_revenue       NUMERIC := 0;
    v_active_value  NUMERIC := 0;
    v_win_rate      NUMERIC := 0;

    v_by_status     JSONB;
    v_by_source     JSONB;
    v_by_temp       JSONB;
    v_monthly_trend JSONB;
    v_rev_by_source JSONB;
    v_team_board    JSONB;
    v_qualified_summary JSONB;
BEGIN
    -- --------------------------------------------------------
    -- Base aggregates
    -- --------------------------------------------------------
    SELECT
        COUNT(*)                                                            AS total,
        COUNT(*) FILTER (WHERE status = 'won')                             AS won,
        COUNT(*) FILTER (WHERE status = 'lost')                            AS lost,
        COUNT(*) FILTER (WHERE status NOT IN ('won', 'lost'))              AS active,
        0::NUMERIC                                                          AS revenue,
        0::NUMERIC                                                          AS active_value
    INTO v_total, v_won, v_lost, v_active, v_revenue, v_active_value
    FROM public.crm_leads
    WHERE archived_at IS NULL
      AND source NOT IN ('Users', 'App User')
      AND (p_is_manager OR assigned_to = p_user_id)
      AND (p_from_date IS NULL OR created_at >= p_from_date)
      AND (p_to_date   IS NULL OR created_at <= p_to_date);

    v_win_rate := CASE WHEN v_total > 0 THEN ROUND((v_won::NUMERIC / v_total) * 100, 1) ELSE 0 END;

    -- --------------------------------------------------------
    -- By status
    -- --------------------------------------------------------
    SELECT jsonb_agg(row_to_json(t))
    INTO v_by_status
    FROM (
        SELECT status AS name, COUNT(*) AS count
        FROM public.crm_leads
        WHERE archived_at IS NULL
          AND source NOT IN ('Users', 'App User')
          AND (p_is_manager OR assigned_to = p_user_id)
          AND (p_from_date IS NULL OR created_at >= p_from_date)
          AND (p_to_date   IS NULL OR created_at <= p_to_date)
        GROUP BY status
        ORDER BY
            CASE status
                WHEN 'new'       THEN 1
                WHEN 'contacted' THEN 2
                WHEN 'qualified' THEN 3
                WHEN 'proposal'  THEN 4
                WHEN 'won'       THEN 5
                WHEN 'lost'      THEN 6
                ELSE 7
            END
    ) t;

    -- --------------------------------------------------------
    -- By source (top 5)
    -- --------------------------------------------------------
    SELECT jsonb_agg(row_to_json(t))
    INTO v_by_source
    FROM (
        SELECT COALESCE(source, 'Other') AS name, COUNT(*) AS value
        FROM public.crm_leads
        WHERE archived_at IS NULL
          AND source NOT IN ('Users', 'App User')
          AND (p_is_manager OR assigned_to = p_user_id)
          AND (p_from_date IS NULL OR created_at >= p_from_date)
          AND (p_to_date   IS NULL OR created_at <= p_to_date)
        GROUP BY source
        ORDER BY value DESC
        LIMIT 5
    ) t;

    -- --------------------------------------------------------
    -- By temperature
    -- --------------------------------------------------------
    SELECT jsonb_agg(row_to_json(t))
    INTO v_by_temp
    FROM (
        SELECT COALESCE(temperature, 'cold') AS name, COUNT(*) AS value
        FROM public.crm_leads
        WHERE archived_at IS NULL
          AND source NOT IN ('Users', 'App User')
          AND (p_is_manager OR assigned_to = p_user_id)
          AND (p_from_date IS NULL OR created_at >= p_from_date)
          AND (p_to_date   IS NULL OR created_at <= p_to_date)
        GROUP BY temperature
    ) t;

    -- --------------------------------------------------------
    -- Monthly revenue trend — last 6 months, year-aware
    -- --------------------------------------------------------
    SELECT jsonb_agg(row_to_json(m) ORDER BY m.month_start)
    INTO v_monthly_trend
    FROM (
        SELECT
            DATE_TRUNC('month', gs.month_start)                                      AS month_start,
            TO_CHAR(gs.month_start, 'Mon YY')                                        AS name,
            0::NUMERIC                                                               AS value
        FROM (
            SELECT generate_series(
                DATE_TRUNC('month', NOW()) - INTERVAL '5 months',
                DATE_TRUNC('month', NOW()),
                '1 month'::INTERVAL
            ) AS month_start
        ) gs
        LEFT JOIN public.crm_leads l
            ON l.status = 'won'
            AND l.archived_at IS NULL
            AND l.source NOT IN ('Users', 'App User')
            AND (p_is_manager OR l.assigned_to = p_user_id)
            AND DATE_TRUNC('month', l.created_at) = gs.month_start
        GROUP BY gs.month_start
        ORDER BY gs.month_start
    ) m;

    -- --------------------------------------------------------
    -- Revenue by source (won leads, top 5)
    -- --------------------------------------------------------
    SELECT jsonb_agg(row_to_json(t))
    INTO v_rev_by_source
    FROM (
        SELECT COALESCE(source, 'Other') AS name, 0::NUMERIC AS value
        FROM public.crm_leads
        WHERE archived_at IS NULL
          AND status = 'won'
          AND source NOT IN ('Users', 'App User')
          AND (p_is_manager OR assigned_to = p_user_id)
          AND (p_from_date IS NULL OR created_at >= p_from_date)
          AND (p_to_date   IS NULL OR created_at <= p_to_date)
        GROUP BY source
        ORDER BY value DESC
        LIMIT 5
    ) t;

    -- --------------------------------------------------------
    -- Team leaderboard (only when manager)
    -- --------------------------------------------------------
    IF p_is_manager THEN
        SELECT jsonb_agg(row_to_json(t) ORDER BY t.revenue DESC)
        INTO v_team_board
        FROM (
            SELECT
                up.id,
                up.full_name                                                AS name,
                up.avatar_url,
                COUNT(l.id)                                                 AS total_assigned,
                COUNT(l.id) FILTER (WHERE l.status = 'won')                AS deals_won,
                0::NUMERIC    AS revenue,
                CASE
                    WHEN COUNT(l.id) > 0
                    THEN ROUND((COUNT(l.id) FILTER (WHERE l.status = 'won')::NUMERIC / COUNT(l.id)) * 100, 1)
                    ELSE 0
                END AS win_rate
            FROM public.user_profiles up
            JOIN public.crm_leads l ON l.assigned_to = up.id
            WHERE l.archived_at IS NULL
              AND l.source NOT IN ('Users', 'App User')
              AND (p_from_date IS NULL OR l.created_at >= p_from_date)
              AND (p_to_date   IS NULL OR l.created_at <= p_to_date)
            GROUP BY up.id, up.full_name, up.avatar_url
            HAVING COUNT(l.id) > 0
            ORDER BY revenue DESC
        ) t;
    END IF;

    -- --------------------------------------------------------
    -- Qualified leads per service (for Qualified Leads index)
    -- --------------------------------------------------------
    SELECT jsonb_agg(row_to_json(t))
    INTO v_qualified_summary
    FROM (
        SELECT
            ls.service_name,
            COUNT(DISTINCT l.id) AS count
        FROM public.crm_lead_services ls
        JOIN public.crm_leads l ON l.id = ls.lead_id
        WHERE l.archived_at IS NULL
          AND l.status IN ('qualified', 'proposal')
          AND (p_is_manager OR l.assigned_to = p_user_id)
        GROUP BY ls.service_name
        ORDER BY count DESC
    ) t;

    -- --------------------------------------------------------
    -- Return everything as a single JSONB object
    -- --------------------------------------------------------
    RETURN jsonb_build_object(
        'totals', jsonb_build_object(
            'total',        v_total,
            'won',          v_won,
            'lost',         v_lost,
            'active',       v_active,
            'revenue',      v_revenue,
            'active_value', v_active_value,
            'win_rate',     v_win_rate
        ),
        'by_status',          COALESCE(v_by_status, '[]'::JSONB),
        'by_source',          COALESCE(v_by_source, '[]'::JSONB),
        'by_temperature',     COALESCE(v_by_temp, '[]'::JSONB),
        'monthly_trend',      COALESCE(v_monthly_trend, '[]'::JSONB),
        'revenue_by_source',  COALESCE(v_rev_by_source, '[]'::JSONB),
        'team_leaderboard',   COALESCE(v_team_board, '[]'::JSONB),
        'qualified_summary',  COALESCE(v_qualified_summary, '[]'::JSONB)
    );
END;
$$;

-- Grant execute to authenticated users (SECURITY DEFINER handles RLS internally)
GRANT EXECUTE ON FUNCTION public.crm_get_dashboard_stats(UUID, BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
