'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import en from './locales/en.json';
import hi from './locales/hi.json';

const LanguageContext = createContext();

const translations = {
    en,
    hi,
};

export function LanguageProvider({ children }) {
    const [language, setLanguage] = useState('en');
    const [isLoading, setIsLoading] = useState(true);

    // Load language preference from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedLanguage = localStorage.getItem('intrust-language');
            if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'hi')) {
                setLanguage(savedLanguage);
            }
            setIsLoading(false);
        }
    }, []);

    // Save language preference to localStorage when it changes
    const changeLanguage = (newLanguage) => {
        if (newLanguage === 'en' || newLanguage === 'hi') {
            setLanguage(newLanguage);
            if (typeof window !== 'undefined') {
                localStorage.setItem('intrust-language', newLanguage);
                // Update HTML lang attribute for accessibility and SEO
                document.documentElement.lang = newLanguage;
            }
        }
    };

    const t = (key) => {
        const keys = key.split('.');
        let value = translations[language];

        for (const k of keys) {
            if (value && typeof value === 'object') {
                value = value[k];
            } else {
                return key; // Return key if translation not found
            }
        }

        return value || key;
    };

    const value = {
        language,
        changeLanguage,
        t,
        isLoading,
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
