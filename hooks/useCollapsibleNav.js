'use client';

import { useState, useEffect, useRef } from 'react';

export function useCollapsibleNav({ storageKey, groupTitles, activeGroupTitle }) {
    const [openGroups, setOpenGroups] = useState(() => {
        const initialState = {};
        if (groupTitles) {
            groupTitles.forEach(title => {
                initialState[title] = title === activeGroupTitle;
            });
        }
        return initialState;
    });

    const isFirstRender = useRef(true);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(storageKey);
            let parsed = {};
            if (stored) {
                parsed = JSON.parse(stored);
            }
            setOpenGroups(prev => {
                const nextState = { ...prev, ...parsed };
                if (activeGroupTitle) {
                    nextState[activeGroupTitle] = true;
                }
                return nextState;
            });
        } catch (error) {
            console.error('Error reading from localStorage', error);
        }
    }, [storageKey]);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        if (activeGroupTitle) {
            setOpenGroups(prev => {
                if (prev[activeGroupTitle]) return prev;
                const nextState = { ...prev, [activeGroupTitle]: true };
                try {
                    localStorage.setItem(storageKey, JSON.stringify(nextState));
                } catch (e) {}
                return nextState;
            });
        }
    }, [activeGroupTitle, storageKey]);

    const toggleGroup = (title) => {
        setOpenGroups(prev => {
            const nextState = { ...prev, [title]: !prev[title] };
            try {
                localStorage.setItem(storageKey, JSON.stringify(nextState));
            } catch (error) {
                console.error('Error writing to localStorage', error);
            }
            return nextState;
        });
    };

    const isOpen = (title) => !!openGroups[title];

    return { openGroups, toggleGroup, isOpen };
}
