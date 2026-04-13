'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import ReactConfetti from 'react-confetti';

const ConfettiContext = createContext({
    trigger: () => { },
});

export const useConfetti = () => useContext(ConfettiContext);

export const ConfettiProvider = ({ children }) => {
    const [active, setActive] = useState(false);
    const [windowSize, setWindowSize] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0,
    });

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const trigger = () => {
        setActive(true);
        setTimeout(() => setActive(false), 5000); // Run for 5 seconds
    };

    return (
        <ConfettiContext.Provider value={{ trigger }}>
            {active && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 9999 }}>
                    <ReactConfetti
                        width={windowSize.width}
                        height={windowSize.height}
                        recycle={false}
                        numberOfPieces={300}
                        tweenDuration={5000}
                    />
                </div>
            )}
            {children}
        </ConfettiContext.Provider>
    );
};
