/**
 * KYC Validation Schemas and Type Definitions
 * 
 * This module provides validation functions, schemas, and type definitions
 * for KYC (Know Your Customer) verification forms.
 * 
 * @module app/types/kyc
 */

/**
 * @typedef {Object} KYCFormData
 * @property {string} fullName - User's full legal name
 * @property {string} phoneNumber - 10-digit Indian phone number
 * @property {string} dateOfBirth - Date of birth in YYYY-MM-DD format
 * @property {string} panNumber - Indian PAN card number (format: ABCDE1234F)
 * @property {string} fullAddress - Complete address
 * @property {boolean} bankGradeSecurity - Opt-in for bank-grade security
 */

/**
 * @typedef {Object} KYCRecord
 * @property {string} id - Unique identifier (UUID)
 * @property {string} user_id - User's UUID from auth.users
 * @property {string} full_legal_name - User's full legal name
 * @property {string} phone_number - Phone number
 * @property {Date} date_of_birth - Date of birth
 * @property {string} pan_number - PAN card number
 * @property {string} full_address - Complete address
 * @property {boolean} bank_grade_security - Bank-grade security flag
 * @property {'pending'|'verified'|'rejected'} verification_status - Current status
 * @property {string|null} verified_by - Admin UUID who verified
 * @property {Date|null} verified_at - Verification timestamp
 * @property {string|null} rejection_reason - Reason for rejection
 * @property {Date} created_at - Creation timestamp
 * @property {Date} updated_at - Last update timestamp
 */

/**
 * Validates Indian PAN card number format
 * Format: 5 uppercase letters + 4 digits + 1 uppercase letter
 * Example: ABCDE1234F
 * 
 * @param {string} pan - PAN number to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function validatePAN(pan) {
    if (!pan || typeof pan !== 'string') return false;
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.trim());
}

/**
 * Validates Indian phone number
 * Must be exactly 10 digits and start with 6-9
 * 
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function validatePhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    // Check: exactly 10 digits and starts with 6-9
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(cleaned);
}

/**
 * Validates date of birth - user must be 18 years or older
 * 
 * @param {string} dob - Date of birth in YYYY-MM-DD format
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export function validateDateOfBirth(dob) {
    if (!dob || typeof dob !== 'string') {
        return { valid: false, error: 'Date of birth is required' };
    }

    const birthDate = new Date(dob);
    const today = new Date();

    // Check if date is valid
    if (isNaN(birthDate.getTime())) {
        return { valid: false, error: 'Invalid date format' };
    }

    // Check if date is not in the future
    if (birthDate > today) {
        return { valid: false, error: 'Date of birth cannot be in the future' };
    }

    // Calculate age
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    // Check minimum age requirement
    if (age < 18) {
        return { valid: false, error: 'You must be at least 18 years old' };
    }

    return { valid: true };
}

/**
 * Validates full name - must not be empty and contain only alphabets and spaces
 * 
 * @param {string} name - Full name to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function validateFullName(name) {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    // Must be at least 2 characters and contain only letters, spaces, and periods
    return trimmed.length >= 2 && /^[a-zA-Z\s.]+$/.test(trimmed);
}

/**
 * Validates full address - must not be empty
 * 
 * @param {string} address - Address to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function validateAddress(address) {
    if (!address || typeof address !== 'string') return false;
    return address.trim().length >= 10; // Minimum 10 characters for meaningful address
}

/**
 * Sanitizes KYC form data to prevent XSS and injection attacks
 * 
 * @param {KYCFormData} data - Raw form data
 * @returns {KYCFormData} Sanitized data
 */
export function sanitizeKYCData(data) {
    return {
        fullName: data.fullName?.trim().replace(/[<>]/g, '') || '',
        phoneNumber: data.phoneNumber?.replace(/\D/g, '').substring(0, 10) || '',
        dateOfBirth: data.dateOfBirth?.trim() || '',
        panNumber: data.panNumber?.trim().toUpperCase().substring(0, 10) || '',
        fullAddress: data.fullAddress?.trim().replace(/[<>]/g, '') || '',
        bankGradeSecurity: Boolean(data.bankGradeSecurity)
    };
}

/**
 * Complete validation schema for KYC form
 * 
 * @param {KYCFormData} data - Form data to validate
 * @returns {{valid: boolean, errors: Object<string, string>}} Validation result with field-specific errors
 */
export function validateKYCForm(data) {
    const errors = {};

    // Validate full name
    if (!validateFullName(data.fullName)) {
        errors.fullName = 'Please enter a valid full name (letters and spaces only, minimum 2 characters)';
    }

    // Validate phone number
    if (!validatePhone(data.phoneNumber)) {
        errors.phoneNumber = 'Please enter a valid 10-digit phone number starting with 6-9';
    }

    // Validate date of birth
    const dobValidation = validateDateOfBirth(data.dateOfBirth);
    if (!dobValidation.valid) {
        errors.dateOfBirth = dobValidation.error;
    }

    // Validate PAN number
    if (!validatePAN(data.panNumber)) {
        errors.panNumber = 'Invalid PAN format. Expected format: ABCDE1234F (5 letters + 4 digits + 1 letter)';
    }

    // Validate address
    if (!validateAddress(data.fullAddress)) {
        errors.fullAddress = 'Please enter a complete address (minimum 10 characters)';
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
}

/**
 * Formats a date string to DD-MM-YYYY display format
 * 
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} Date in DD-MM-YYYY format
 */
export function formatDateForDisplay(dateString) {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
}

/**
 * Converts DD-MM-YYYY to YYYY-MM-DD for form input
 * 
 * @param {string} displayDate - Date in DD-MM-YYYY format
 * @returns {string} Date in YYYY-MM-DD format
 */
export function formatDateForInput(displayDate) {
    if (!displayDate) return '';
    const [day, month, year] = displayDate.split('-');
    return `${year}-${month}-${day}`;
}

/**
 * Auto-formats PAN number as user types
 * 
 * @param {string} value - Current input value
 * @returns {string} Formatted PAN (uppercase, max 10 chars)
 */
export function formatPANInput(value) {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
}

/**
 * Auto-formats phone number as user types
 * 
 * @param {string} value - Current input value
 * @returns {string} Formatted phone (digits only, max 10)
 */
export function formatPhoneInput(value) {
    return value.replace(/\D/g, '').substring(0, 10);
}
