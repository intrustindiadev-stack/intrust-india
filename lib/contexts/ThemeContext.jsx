'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('light');
    const [isLoading, setIsLoading] = useState(true);

    // Load theme preference from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Check localStorage for saved theme, default to light if not found
            const savedTheme = localStorage.getItem('intrust-theme');
            console.log('🎨 Initial load - savedTheme:', savedTheme);

            if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
                setTheme(savedTheme);
                document.documentElement.setAttribute('data-theme', savedTheme);
                // Add/remove 'dark' class for Tailwind
                if (savedTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                    console.log('✅ Added dark class to HTML element');
                } else {
                    document.documentElement.classList.remove('dark');
                    console.log('✅ Removed dark class from HTML element');
                }
            } else {
                // Default to light theme
                setTheme('light');
                document.documentElement.setAttribute('data-theme', 'light');
                document.documentElement.classList.remove('dark');
                console.log('✅ Defaulted to light theme');
            }

            console.log('🔍 HTML classes:', document.documentElement.className);
            console.log('🔍 data-theme:', document.documentElement.getAttribute('data-theme'));
            setIsLoading(false);
        }
    }, []);

    // Toggle theme between light and dark
    const toggleTheme = () => {
        console.log('🔄 Toggle clicked! Current theme:', theme);
        const newTheme = theme === 'light' ? 'dark' : 'light';
        console.log('🔄 Setting new theme:', newTheme);
        setTheme(newTheme);

        if (typeof window !== 'undefined') {
            localStorage.setItem('intrust-theme', newTheme);
            document.documentElement.setAttribute('data-theme', newTheme);

            // Add/remove 'dark' class for Tailwind
            if (newTheme === 'dark') {
                document.documentElement.classList.add('dark');
                console.log('✅ Added dark class');
            } else {
                document.documentElement.classList.remove('dark');
                console.log('✅ Removed dark class');
            }

            console.log('🔍 After toggle - HTML classes:', document.documentElement.className);
            console.log('🔍 After toggle - data-theme:', document.documentElement.getAttribute('data-theme'));
            console.log('✅ Theme updated in localStorage and DOM');
        }
    };

    const value = {
        theme,
        toggleTheme,
        isLoading,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
