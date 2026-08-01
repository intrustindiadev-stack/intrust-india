/**
 * Converts raw API / database error codes and messages into plain, user-friendly
 * strings suitable for toast notifications.
 *
 * All messages are written from the user's perspective and avoid technical jargon.
 */
const ERROR_MAP = {
    // Hierarchy / structure errors
    INVALID_PARENT_LEVEL: {
        city:  'A City-level team can only be placed under a State-level team. Please choose a State team as the parent.',
        area:  'An Area-level team can only be placed under a City-level team. Please choose a City team as the parent.',
        default: 'This team cannot be placed under the selected parent. Please check the region levels and try again.',
    },
    INVALID_LEVEL:        'The region level you selected is not valid for this team. Please choose State, City, or Area.',
    HIERARCHY_CYCLE:      'This action would create a loop in the org chart (a team cannot be its own ancestor). Please choose a different parent.',
    DUPLICATE_NAME:       'A team with this name already exists under the same parent. Please use a different name.',
    UNIQUE_VIOLATION:     'A team with this name already exists under the same parent. Please use a different name.',

    // Concurrency / lifecycle
    VERSION_CONFLICT:     'Someone else updated this team while you had it open. Please close and reopen the form to see the latest changes before saving.',
    TEAM_HAS_CHILDREN:    'This team still has active sub-teams underneath it. Please deactivate or reassign those teams first, then try again.',
    TEAM_NOT_FOUND:       'This team no longer exists — it may have been deleted by another admin. Please refresh the page.',

    // Location errors
    INVALID_LOCATION:     'The city or area you entered does not match the parent team\'s location. Please check and update the location fields.',

    // Auth / permission errors
    UNAUTHENTICATED:      'Your session has expired. Please sign in again to continue.',
    FORBIDDEN_SCOPE:      'You don\'t have permission to make this change. If you think this is a mistake, please contact your administrator.',
    PROTECTED_USER:       'Admin accounts cannot be reassigned or removed from a team through this form.',
    UNAUTHORIZED:         'You don\'t have permission to do this. Please contact your administrator.',

    // Members
    MEMBER_NOT_FOUND:     'The selected member could not be found. They may have been removed. Please refresh and try again.',
    USER_NOT_FOUND:       'The selected user could not be found. Please refresh the page.',
    ALREADY_IN_TEAM:      'This person is already a member of the selected team.',

    // Generic
    OPERATION_FAILED:     'Something went wrong on our end. Please try again in a moment. If the problem persists, contact support.',
};

/**
 * Given a raw API error string (which may contain a code prefix like
 * "INVALID_PARENT_LEVEL: Parent of a city team must be a state-level team"),
 * returns a plain-language message safe to display in a toast.
 *
 * @param {string|null|undefined} rawError  - The `error` field from the API response.
 * @param {string|null|undefined} errorCode - The `code` field from the API response (optional).
 * @param {string} [fallback]               - Message to show if no mapping is found.
 */
export function friendlyTeamError(rawError, errorCode, fallback = 'Something went wrong. Please try again.') {
    const raw = rawError || '';

    // Extract the code from "CODE: detail" format or use the explicit code field
    const colonIdx = raw.indexOf(':');
    const extractedCode = colonIdx > 0 ? raw.slice(0, colonIdx).trim() : null;
    const code = errorCode || extractedCode;

    if (code === 'INVALID_PARENT_LEVEL') {
        const lower = raw.toLowerCase();
        if (lower.includes('city')) return ERROR_MAP.INVALID_PARENT_LEVEL.city;
        if (lower.includes('area')) return ERROR_MAP.INVALID_PARENT_LEVEL.area;
        return ERROR_MAP.INVALID_PARENT_LEVEL.default;
    }

    if (code && ERROR_MAP[code]) return ERROR_MAP[code];

    // Fall back to substring-matching the raw message
    if (raw.includes('duplicate') || raw.includes('unique') || raw.includes('23505')) {
        return ERROR_MAP.DUPLICATE_NAME;
    }
    if (raw.includes('Unauthorized') || raw.includes('unauthorized')) {
        return ERROR_MAP.UNAUTHORIZED;
    }
    if (raw.includes('not found') || raw.includes('404')) {
        return ERROR_MAP.TEAM_NOT_FOUND;
    }

    return fallback;
}
