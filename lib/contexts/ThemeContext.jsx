'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('light');
    const [isLoading, setIsLoading] = useState(true);
    const pathname = usePathname();

    // Load theme preference from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedTheme = localStorage.getItem('intrust-theme');
            
            if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
                setTheme(savedTheme);
            } else {
                setTheme('light');
            }
            setIsLoading(false);
        }
    }, []);

    // Apply theme class to document based on theme state AND route
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const html = document.documentElement;
            
            // Force light mode for admin routes
            if (pathname?.startsWith('/admin')) {
                html.classList.remove('dark');
                html.setAttribute('data-theme', 'light');
                return;
            }

            // Normal theme logic for other routes
            html.setAttribute('data-theme', theme);
            if (theme === 'dark') {
                html.classList.add('dark');
            } else {
                html.classList.remove('dark');
            }
        }
    }, [theme, pathname]);

    // Toggle theme between light and dark
    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        if (typeof window !== 'undefined') {
            localStorage.setItem('intrust-theme', newTheme);
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
