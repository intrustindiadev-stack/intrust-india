import { z } from 'zod';

/**
 * Server-only authorization and validation module for Team Management.
 */

export const TEAM_ROLES = {
    RELATIONSHIP_EXEC: 'relationship_exec',
    RELATIONSHIP_MANAGER: 'relationship_manager',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin'
};

export const ALL_TEAM_READ_ROLES = [
    'relationship_exec',
    'relationship_manager',
    'admin',
    'super_admin',
    'hr_manager',
    'employee',
    'freelancer',
    'video_editor',
    'social_media_manager',
    'seo_specialist',
    'advertiser',
    'support_agent'
];

// Zod Schemas with strict property checking
const uuidSchema = z.string().uuid({ message: 'Invalid UUID format' });
const hexColorSchema = z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, { message: 'Invalid hex color' });

export const teamCreateSchema = z.object({
    name: z.string().trim().min(1, 'Team name is required').max(100, 'Team name too long'),
    region_level: z.enum(['state', 'city', 'area']),
    description: z.string().max(500, 'Description too long').nullable().optional(),
    state: z.string().trim().min(1, 'State is required').default('Madhya Pradesh'),
    city: z.string().trim().nullable().optional(),
    area: z.string().trim().nullable().optional(),
    parent_team_id: uuidSchema.nullable().optional(),
    team_lead_id: uuidSchema.nullable().optional(),
    color: hexColorSchema.default('#6366f1')
}).strict();

export const teamUpdateSchema = z.object({
    name: z.string().trim().min(1).max(100).optional(),
    region_level: z.enum(['state', 'city', 'area']).optional(),
    description: z.string().max(500).nullable().optional(),
    state: z.string().trim().min(1).optional(),
    city: z.string().trim().nullable().optional(),
    area: z.string().trim().nullable().optional(),
    parent_team_id: uuidSchema.nullable().optional(),
    team_lead_id: uuidSchema.nullable().optional(),
    color: hexColorSchema.optional(),
    expected_version: z.number().int().positive().optional(),
    retain_old_lead: z.boolean().default(true).optional(),
    reason: z.string().max(300).optional()
}).strict();

export const memberAssignSchema = z.object({
    team_id: uuidSchema,
    user_id: uuidSchema,
    reason: z.string().max(300).optional()
}).strict();

export const memberBulkTransferSchema = z.object({
    source_team_id: uuidSchema,
    target_team_id: uuidSchema,
    user_ids: z.array(uuidSchema).min(1, 'At least one user must be selected'),
    reason: z.string().min(3, 'Reason is required for bulk transfers').max(300)
}).strict();

export const teamDeactivateSchema = z.object({
    expected_version: z.number().int().positive().optional(),
    reason: z.string().min(3, 'Reason is required for team deactivation').max(300)
}).strict();

/**
 * Calculates user's server-authoritative team capabilities and manageable team scope.
 */
export async function getAuthorizedTeamScope(user, profile, admin) {
    if (!user || !profile) {
        return {
            isAuthorized: false,
            role: null,
            capabilities: {
                canCreateTeam: false,
                canEditTeam: false,
                canDeactivateTeam: false,
                canAssignMembers: false,
                canManageTeamIds: []
            },
            authorizedTeamIds: []
        };
    }

    const role = profile.role;
    const isAdmin = ['admin', 'super_admin'].includes(role);
    const isManager = role === TEAM_ROLES.RELATIONSHIP_MANAGER;
    const isExec = role === TEAM_ROLES.RELATIONSHIP_EXEC;

    if (isAdmin) {
        return {
            isAuthorized: true,
            role,
            capabilities: {
                canCreateTeam: true,
                canEditTeam: true,
                canDeactivateTeam: true,
                canAssignMembers: true,
                canManageTeamIds: null // null means all teams
            },
            authorizedTeamIds: null
        };
    }

    if (isManager) {
        // Query recursive subtree via RPC
        const { data: scopeRows, error } = await admin.rpc('team_get_user_subtree', { p_user_id: user.id });
        const managedIds = (scopeRows || []).map(r => r.team_id).filter(Boolean);

        return {
            isAuthorized: true,
            role,
            capabilities: {
                canCreateTeam: false,
                canEditTeam: false,
                canDeactivateTeam: false,
                canAssignMembers: true,
                canManageTeamIds: managedIds
            },
            authorizedTeamIds: managedIds
        };
    }

    if (isExec) {
        const userTeamId = profile.team_id;
        const authorizedTeamIds = userTeamId ? [userTeamId] : [];
        return {
            isAuthorized: true,
            role,
            capabilities: {
                canCreateTeam: false,
                canEditTeam: false,
                canDeactivateTeam: false,
                canAssignMembers: false,
                canManageTeamIds: []
            },
            authorizedTeamIds
        };
    }

    if (role === 'hr_manager') {
        return {
            isAuthorized: true,
            role,
            capabilities: {
                canCreateTeam: false,
                canEditTeam: false,
                canDeactivateTeam: false,
                canAssignMembers: false,
                canManageTeamIds: []
            },
            authorizedTeamIds: null // null means all teams (read-only)
        };
    }

    // Default for other allowed read roles (e.g. employee)
    return {
        isAuthorized: ALL_TEAM_READ_ROLES.includes(role),
        role,
        capabilities: {
            canCreateTeam: false,
            canEditTeam: false,
            canDeactivateTeam: false,
            canAssignMembers: false,
            canManageTeamIds: []
        },
        authorizedTeamIds: []
    };
}

/**
 * Sanitizes user profile to strip sensitive contact fields unless authorized.
 */
export function sanitizeUserProfile(userProfile, requesterRole) {
    if (!userProfile) return null;
    const isAdminOrManager = ['admin', 'super_admin', 'relationship_manager'].includes(requesterRole);

    if (isAdminOrManager) {
        return {
            id: userProfile.id,
            full_name: userProfile.full_name,
            email: userProfile.email,
            phone: userProfile.phone,
            role: userProfile.role,
            avatar_url: userProfile.avatar_url,
            team_id: userProfile.team_id
        };
    }

    // Executive or generic view: redact email/phone if present
    return {
        id: userProfile.id,
        full_name: userProfile.full_name,
        role: userProfile.role,
        avatar_url: userProfile.avatar_url,
        team_id: userProfile.team_id
    };
}

/**
 * Format machine readable RPC / DB error response.
 */
export function formatErrorResponse(resOrErr) {
    const errorMsg = typeof resOrErr === 'string' ? resOrErr : resOrErr?.error || resOrErr?.message || 'Operation failed';
    const code = resOrErr?.code || 'OPERATION_FAILED';

    let status = 400;
    if (code === 'UNAUTHENTICATED' || errorMsg.includes('Authentication required')) status = 401;
    else if (code === 'FORBIDDEN_SCOPE' || code === 'PROTECTED_USER' || errorMsg.includes('Unauthorized')) status = 403;
    else if (code === 'TEAM_NOT_FOUND' || code === 'USER_NOT_FOUND') status = 404;
    else if (code === 'VERSION_CONFLICT' || code === 'TEAM_HAS_CHILDREN') status = 409;
    else if (code === 'HIERARCHY_CYCLE' || code === 'INVALID_LOCATION' || code === 'INVALID_LEVEL') status = 400;

    return {
        response: { error: errorMsg, code },
        status
    };
}
