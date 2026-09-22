'use client';

import { AlertCircle } from 'lucide-react';
import FloatingLabelInput from './FloatingLabelInput';
import PhoneInput from './PhoneInput';
import DateOfBirthPicker from './DateOfBirthPicker';
import {
    validateFullName,
    validatePhone,
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
                    <p className="text-red-600 text-xs sm:text-[13px] font-medium mt-1.5 ml-1 flex items-start gap-1.5 leading-snug">
                        <AlertCircle size={14} className="shrink-0 text-red-500 mt-0.5" /> <span>{errors.gender}</span>
                    </p>
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

    const name = (formData.fullName || '').trim();
    if (!name) {
        errs.fullName = 'Enter your full legal name as it appears on your government ID';
    } else if (!validateFullName(name)) {
        errs.fullName = 'Name should contain only letters and spaces — no numbers or special characters';
    }

    // Phone validation
    const phone = formData.phoneNumber?.replace(/\D/g, '') || '';
    if (!phone) {
        errs.phoneNumber = 'Enter your 10-digit Indian mobile number';
    } else if (!validatePhone(phone)) {
        errs.phoneNumber = 'Mobile number must be 10 digits and start with 6, 7, 8, or 9';
    }

    // DOB validation
    const dob = formData.dateOfBirth;
    if (!dob || dob.split('-').length !== 3) {
        errs.dateOfBirth = 'Select your day, month, and year of birth';
    } else {
        const [y, m, d] = dob.split('-').map(Number);
        if (!y || !m || !d) {
            errs.dateOfBirth = 'Select your day, month, and year of birth';
        } else {
            // Check real date
            const dateObj = new Date(y, m - 1, d);
            if (dateObj.getFullYear() !== y || dateObj.getMonth() !== (m - 1) || dateObj.getDate() !== d) {
                errs.dateOfBirth = 'This date doesn\'t exist — please check and select again';
            } else {
                // Check age >= 18
                const today = new Date();
                let age = today.getFullYear() - y;
                const mDiff = today.getMonth() - (m - 1);
                if (mDiff < 0 || (mDiff === 0 && today.getDate() < d)) {
                    age--;
                }
                if (age < 18) {
                    errs.dateOfBirth = 'You must be 18 or older to complete KYC verification';
                }
            }
        }
    }

    if (!formData.gender) {
        errs.gender = 'Select your gender to continue';
    }

    return { valid: Object.keys(errs).length === 0, errors: errs };
}
