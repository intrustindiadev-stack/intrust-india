'use client';

/**
 * Qualified Leads — Lead Detail Page
 *
 * This page is a thin context-aware wrapper around the canonical
 * LeadDetailPage component from /crm/leads/[id].
 *
 * The only difference is that the "Back" button navigates to the
 * correct service list (/crm/qualified-leads/[service]) rather than
 * the generic leads list.
 *
 * All data fetching, RBAC, realtime subscriptions, and UI are handled
 * by the shared LeadDetailPage component — no duplication.
 */

import { use } from 'react';
import LeadDetailPage from '@/app/(crm)/crm/leads/[id]/page';

export default function QualifiedLeadDetailPage({ params: paramsProp }) {
    const params = use(paramsProp);
    const service = params.service;

    // Pass backHref so the Back button navigates to the service-specific list
    return (
        <LeadDetailPage
            params={paramsProp}
            backHref={`/crm/qualified-leads/${service}`}
        />
    );
}
