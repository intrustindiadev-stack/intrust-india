export const SolarErrors = {
    UNAUTHORIZED: 'UNAUTHORIZED',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    DUPLICATE_ACTIVE_LEAD: 'DUPLICATE_ACTIVE_LEAD',
    INVALID_TRANSITION: 'INVALID_TRANSITION',
    NOT_FOUND: 'NOT_FOUND',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
};

export class SolarError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'SolarError';
    }
}
