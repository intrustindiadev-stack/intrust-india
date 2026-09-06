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

    // Toggle theme between light and dark with circular ripple animation
    const toggleTheme = (event) => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        const isGoingToDark = newTheme === 'dark';

        const applyThemeChange = () => {
            setTheme(newTheme);
            if (typeof window !== 'undefined') {
                localStorage.setItem('intrust-theme', newTheme);
            }
        };

        // Determine click origin coordinates relative to the button
        let x = typeof window !== 'undefined' ? window.innerWidth / 2 : 0;
        let y = typeof window !== 'undefined' ? window.innerHeight / 2 : 0;

        if (event?.currentTarget && typeof event.currentTarget.getBoundingClientRect === 'function') {
            const rect = event.currentTarget.getBoundingClientRect();
            x = rect.left + rect.width / 2;
            y = rect.top + rect.height / 2;
        } else if (event?.clientX !== undefined && event?.clientY !== undefined && (event.clientX > 0 || event.clientY > 0)) {
            x = event.clientX;
            y = event.clientY;
        }

        // If View Transitions API is supported, animate smooth circular ripple
        if (typeof document !== 'undefined' && document.startViewTransition) {
            const endRadius = Math.hypot(
                Math.max(x, window.innerWidth - x),
                Math.max(y, window.innerHeight - y)
            );

            const transition = document.startViewTransition(() => {
                applyThemeChange();
            });

            transition.ready.then(() => {
                const clipPath = [
                    `circle(0px at ${x}px ${y}px)`,
                    `circle(${endRadius}px at ${x}px ${y}px)`
                ];

                if (isGoingToDark) {
                    // Light -> Dark: Expand dark circle outward from button
                    document.documentElement.animate(
                        {
                            clipPath: clipPath,
                        },
                        {
                            duration: 380,
                            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                            pseudoElement: '::view-transition-new(root)',
                        }
                    );
                } else {
                    // Dark -> Light: Shrink dark layer back into the button
                    document.documentElement.animate(
                        {
                            clipPath: [...clipPath].reverse(),
                        },
                        {
                            duration: 380,
                            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                            pseudoElement: '::view-transition-old(root)',
                        }
                    );
                }
            }).catch(() => {
                applyThemeChange();
            });
        } else {
            // Standard smooth fallback transition
            if (typeof document !== 'undefined') {
                document.documentElement.classList.add('theme-transition');
                applyThemeChange();
                setTimeout(() => {
                    document.documentElement.classList.remove('theme-transition');
                }, 280);
            } else {
                applyThemeChange();
            }
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
