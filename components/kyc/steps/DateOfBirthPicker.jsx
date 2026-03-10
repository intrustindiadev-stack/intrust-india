'use client';
import { useState, useMemo } from 'react';

export default function DateOfBirthPicker({ value = { day: '', month: '', year: '' }, onChange, error, disabled = false }) {
    const [focusedField, setFocusedField] = useState(null);

    const { day, month, year } = value;

    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 100;
    const maxYear = currentYear - 18;

    const years = useMemo(() => {
        const arr = [];
        for (let y = maxYear; y >= minYear; y--) {
            arr.push(y);
        }
        return arr;
    }, [maxYear, minYear]);

    const months = useMemo(() => {
        return [
            { id: '01', name: 'Jan' }, { id: '02', name: 'Feb' }, { id: '03', name: 'Mar' },
            { id: '04', name: 'Apr' }, { id: '05', name: 'May' }, { id: '06', name: 'Jun' },
            { id: '07', name: 'Jul' }, { id: '08', name: 'Aug' }, { id: '09', name: 'Sep' },
            { id: '10', name: 'Oct' }, { id: '11', name: 'Nov' }, { id: '12', name: 'Dec' },
        ];
    }, []);

    const daysInMonth = useMemo(() => {
        if (!month) return 31;
        const m = parseInt(month, 10);
        const y = parseInt(year, 10) || 2000; // default to a leap year if year not selected
        return new Date(y, m, 0).getDate();
    }, [month, year]);

    const days = useMemo(() => {
        const arr = [];
        for (let d = 1; d <= daysInMonth; d++) {
            arr.push(d.toString().padStart(2, '0'));
        }
        return arr;
    }, [daysInMonth]);

    const handleChange = (field, val) => {
        const newValue = { ...value, [field]: val };

        // Auto-correct day if necessary
        if (field === 'month' || field === 'year') {
            const m = parseInt(newValue.month, 10);
            const y = parseInt(newValue.year, 10) || 2000;
            if (m) {
                const maxDays = new Date(y, m, 0).getDate();
                if (parseInt(newValue.day, 10) > maxDays) {
                    newValue.day = maxDays.toString().padStart(2, '0');
                }
            }
        }

        onChange?.(newValue);
    };

    const getSelectStyle = (field) => {
        const isFocused = focusedField === field;
        const hasError = !!error;
        const hasValue = !!value[field];

        return {
            height: '50px',
            borderRadius: '12px',
            border: `1.5px solid ${hasError ? '#EF4444' : (isFocused ? '#2563EB' : '#E2E8F0')}`,
            boxShadow: isFocused && !hasError ? '0 0 0 3px rgba(37,99,235,0.12)' : (isFocused && hasError ? '0 0 0 3px rgba(239,68,68,0.12)' : 'none'),
            appearance: 'none',
            WebkitAppearance: 'none',
            outline: 'none',
            width: '100%',
            padding: '0 26px 0 12px',
            fontSize: '15px',
            fontFamily: '"DM Sans", sans-serif',
            color: hasValue ? '#0F172A' : '#64748B',
            fontWeight: hasValue ? 500 : 400,
            transition: 'all 0.2s ease',
            backgroundColor: '#fff',
            cursor: 'pointer'
        };
    };

    const chevron = (
        <svg
            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
            <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
    );

    return (
        <div style={{ width: '100%', fontFamily: '"DM Sans", sans-serif' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div style={{ position: 'relative' }}>
                    <select
                        value={day || ''}
                        onChange={(e) => handleChange('day', e.target.value)}
                        onFocus={() => setFocusedField('day')}
                        onBlur={() => setFocusedField(null)}
                        style={getSelectStyle('day')}
                        disabled={disabled}
                    >
                        <option value="" disabled style={{ display: 'none' }}>Day</option>
                        {days.map(d => (
                            <option key={d} value={d} style={{ color: '#0F172A' }}>{d}</option>
                        ))}
                    </select>
                    {chevron}
                </div>

                <div style={{ position: 'relative' }}>
                    <select
                        value={month || ''}
                        onChange={(e) => handleChange('month', e.target.value)}
                        onFocus={() => setFocusedField('month')}
                        onBlur={() => setFocusedField(null)}
                        style={getSelectStyle('month')}
                        disabled={disabled}
                    >
                        <option value="" disabled style={{ display: 'none' }}>Month</option>
                        {months.map(m => (
                            <option key={m.id} value={m.id} style={{ color: '#0F172A' }}>{m.name}</option>
                        ))}
                    </select>
                    {chevron}
                </div>

                <div style={{ position: 'relative' }}>
                    <select
                        value={year || ''}
                        onChange={(e) => handleChange('year', e.target.value)}
                        onFocus={() => setFocusedField('year')}
                        onBlur={() => setFocusedField(null)}
                        style={getSelectStyle('year')}
                        disabled={disabled}
                    >
                        <option value="" disabled style={{ display: 'none' }}>Year</option>
                        {years.map(y => (
                            <option key={y} value={y} style={{ color: '#0F172A' }}>{y}</option>
                        ))}
                    </select>
                    {chevron}
                </div>
            </div>

            {error && (
                <div style={{ color: '#EF4444', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                <span style={{ color: '#94A3B8', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '12px', height: '12px', borderRadius: '50%', border: '1px solid #94A3B8' }}>i</span>
                <span style={{ color: '#94A3B8', fontSize: '11px' }}>
                    Must be 18 years or older
                </span>
            </div>
        </div>
    );
}
