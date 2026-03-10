'use client';
import { useState } from 'react';

export default function PhoneInput({ value = '', onChange, error }) {
    const [focused, setFocused] = useState(false);

    // Filter value strictly to digits
    const displayValue = (value || '').replace(/\D/g, '').slice(0, 10);

    const handleInputChange = (e) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
        onChange?.(val);
    };

    const hasValue = displayValue.length > 0;

    return (
        <div style={{ fontFamily: '"DM Sans", sans-serif', width: '100%' }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    border: `1.5px solid ${error ? '#EF4444' : (focused ? '#2563EB' : '#E2E8F0')}`,
                    borderRadius: '14px',
                    height: '54px',
                    boxShadow: focused && !error ? '0 0 0 3px rgba(37,99,235,0.12)' : (error && focused ? '0 0 0 3px rgba(239,68,68,0.12)' : 'none'),
                    transition: 'all 0.2s ease',
                    overflow: 'hidden',
                    backgroundColor: '#ffffff'
                }}
            >
                {/* LEFT SIDE: Flag prefix pill */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#EFF4FF',
                        borderRight: '1.5px solid #E2E8F0',
                        width: '82px',
                        height: '100%',
                        flexShrink: 0
                    }}
                >
                    <span style={{ fontSize: '16px', marginRight: '4px' }}>🇮🇳</span>
                    <span style={{ fontWeight: 600, color: '#2563EB', fontSize: '15px' }}>+91</span>
                </div>

                {/* RIGHT SIDE: Input area */}
                <div style={{ position: 'relative', flex: 1, height: '100%' }}>
                    <input
                        type="tel"
                        value={displayValue}
                        onChange={handleInputChange}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        maxLength={10}
                        style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            outline: 'none',
                            background: 'transparent',
                            padding: '16px 16px 4px 16px', // Extra padding top for floating label
                            fontSize: '15px',
                            color: '#0F172A',
                            fontWeight: 500,
                        }}
                    />

                    {/* Floating Label */}
                    <label
                        style={{
                            position: 'absolute',
                            left: '16px',
                            top: (focused || hasValue) ? '6px' : '50%',
                            transform: (focused || hasValue) ? 'none' : 'translateY(-50%)',
                            fontSize: (focused || hasValue) ? '11px' : '15px',
                            color: (focused || hasValue) ? (error ? '#EF4444' : '#2563EB') : '#64748B',
                            fontWeight: (focused || hasValue) ? 600 : 400,
                            pointerEvents: 'none',
                            transition: 'all 0.2s ease',
                            fontFamily: '"Sora", sans-serif'
                        }}
                    >
                        Mobile Number
                    </label>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div style={{ color: '#EF4444', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>
                    Enter a valid 10-digit mobile number
                </div>
            )}
        </div>
    );
}
