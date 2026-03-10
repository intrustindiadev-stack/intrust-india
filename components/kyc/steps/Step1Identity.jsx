'use client';

import FloatingLabelInput from './FloatingLabelInput';
import PhoneInput from './PhoneInput';
import DateOfBirthPicker from './DateOfBirthPicker';
import {
    validateFullName,
} from '@/app/types/kyc';

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

/**
 * @typedef {Object} Step1IdentityProps
 * @property {Object} formData
 * @property {(field: string, value: string | boolean) => void} onChange
 * @property {Object<string, string>} errors
 * @property {Object<string, boolean>} fieldLocked
 * @property {(field: string) => void} onUnlock
 */

/** @param {Step1IdentityProps} props */
export default function Step1Identity({ formData, onChange, errors, fieldLocked, onUnlock }) {
    // Parse DOB for DateOfBirthPicker
    const dobParts = (formData.dateOfBirth || '').split('-');
    const dobValue = {
        year: dobParts[0] || '',
        month: dobParts[1] || '',
        day: dobParts[2] || ''
    };

    const handleDobChange = (newDob) => {
        const { year, month, day } = newDob;
        if (!year && !month && !day) {
            onChange('dateOfBirth', '');
        } else {
            onChange('dateOfBirth', `${year}-${month}-${day}`);
        }
    };

    return (
        <div className="space-y-5">
            {/* Full Name */}
            <FloatingLabelInput
                label="Full Name"
                value={formData.fullName}
                onChange={(e) => onChange('fullName', e.target.value)}
                error={errors.fullName}
                locked={fieldLocked.name}
                onEditClick={() => onUnlock('name')}
                autoComplete="name"
            />

            {/* Phone Number Input */}
            <PhoneInput
                value={formData.phoneNumber}
                onChange={(val) => onChange('phoneNumber', val)}
                error={errors.phoneNumber}
            />

            {/* Date of Birth Picker */}
            <DateOfBirthPicker
                value={dobValue}
                onChange={handleDobChange}
                error={errors.dateOfBirth}
                disabled={fieldLocked.dob}
            />

            {/* Gender pill toggle */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 ml-1">Gender</label>
                <div className="flex gap-2">
                    {GENDER_OPTIONS.map((option) => (
                        <button
                            key={option}
                            type="button"
                            onClick={() => onChange('gender', option)}
                            className={`flex-1 py-3.5 rounded-2xl text-[14px] font-semibold transition-all duration-200 border-[1.5px] ${formData.gender === option
                                ? 'bg-[#1A56DB]/10 text-[#1A56DB] border-[#1A56DB] shadow-sm'
                                : 'bg-white text-slate-600 border-[#E2E8F0] hover:border-[#1A56DB]/50 hover:bg-slate-50'
                                }`}
                        >
                            {option}
                        </button>
                    ))}
                </div>
                {errors.gender && (
                    <p className="text-red-500 text-xs mt-1 ml-1">{errors.gender}</p>
                )}
            </div>
        </div>
    );
}

/**
 * Validates Step 1 fields.
 * @param {Object} formData
 * @returns {{ valid: boolean, errors: Object<string, string> }}
 */
export function validateStep1(formData) {
    /** @type {Object<string, string>} */
    const errs = {};

    if (!validateFullName(formData.fullName)) {
        errs.fullName = 'Please enter a valid full name (letters and spaces only, min 2 characters)';
    }

    // Phone validation
    const phone = formData.phoneNumber?.replace(/\D/g, '') || '';
    if (phone.length !== 10) {
        errs.phoneNumber = 'Enter a valid 10-digit mobile number';
    }

    // DOB validation
    const dob = formData.dateOfBirth;
    if (!dob || dob.split('-').length !== 3) {
        errs.dateOfBirth = 'All three must be selected before proceeding';
    } else {
        const [y, m, d] = dob.split('-').map(Number);
        if (!y || !m || !d) {
            errs.dateOfBirth = 'All three must be selected before proceeding';
        } else {
            // Check real date
            const dateObj = new Date(y, m - 1, d);
            if (dateObj.getFullYear() !== y || dateObj.getMonth() !== (m - 1) || dateObj.getDate() !== d) {
                errs.dateOfBirth = 'Please enter a valid date';
            } else {
                // Check age >= 18
                const today = new Date();
                let age = today.getFullYear() - y;
                const mDiff = today.getMonth() - (m - 1);
                if (mDiff < 0 || (mDiff === 0 && today.getDate() < d)) {
                    age--;
                }
                if (age < 18) {
                    errs.dateOfBirth = 'You must be at least 18 years old';
                }
            }
        }
    }

    if (!formData.gender) {
        errs.gender = 'Please select your gender';
    }

    return { valid: Object.keys(errs).length === 0, errors: errs };
}
