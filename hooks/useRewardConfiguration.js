import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

/**
 * Normalizes an array of database rows into a structured UI model.
 */
function normalizeConfig(rows) {
    const model = {
        events: {},
        tiers: {},
        global: {},
        levelSettings: {},
        eligibility: {},
        metadata: {} // Store original references to preserve unknown properties
    };

    if (!Array.isArray(rows)) return model;

    rows.forEach(row => {
        const { config_type, config_key, config_value, is_active } = row;
        
        // Preserve original structure for saving back
        model.metadata[config_key] = row;

        let parsedValue = config_value;
        // Handle scalar strings that might be doubly stringified (e.g., redemption_mode)
        if (typeof parsedValue === 'string') {
            parsedValue = parsedValue.replace(/^"|"$/g, '');
        }

        if (config_type === 'event') {
            model.events[config_key] = { ...parsedValue, _is_active: is_active };
        } else if (config_type === 'tier') {
            model.tiers[config_key] = { ...parsedValue };
        } else if (config_type === 'global') {
            if (config_key === 'redemption_mode') {
                model.global.redemption_mode = parsedValue;
            } else {
                model.global[config_key] = { ...parsedValue };
            }
        } else if (config_type === 'level') {
            model.levelSettings = { ...parsedValue };
        } else if (config_type === 'eligibility') {
            model.eligibility = { ...parsedValue };
        }
    });

    return model;
}

export function useRewardConfiguration() {
    const [serverConfig, setServerConfig] = useState(null);
    const [draftConfig, setDraftConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [savingSection, setSavingSection] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});

    const fetchConfigs = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            // Using a cache-busting timestamp or fetch options to avoid stale reads
            const response = await fetch('/api/admin/rewards/config', { cache: 'no-store' });
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch configuration');
            }

            if (data.configs) {
                const normalized = normalizeConfig(data.configs);
                setServerConfig(normalized);
                // Deep clone for draft
                setDraftConfig(JSON.parse(JSON.stringify(normalized)));
            }
        } catch (err) {
            console.error('Error fetching configs:', err);
            setLoadError(err.message || 'Failed to load reward configuration');
            // Do NOT initialize with zero-value defaults on error
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConfigs();
    }, [fetchConfigs]);

    // Check if a specific section is dirty
    const isSectionDirty = useCallback((sectionKey) => {
        if (!serverConfig || !draftConfig) return false;
        
        // Custom deep compare for a specific section
        return JSON.stringify(serverConfig[sectionKey]) !== JSON.stringify(draftConfig[sectionKey]);
    }, [serverConfig, draftConfig]);

    // Determine all dirty sections
    const dirtySections = ['events', 'tiers', 'global', 'levelSettings', 'eligibility'].filter(isSectionDirty);

    const updateDraft = useCallback((section, path, value) => {
        setDraftConfig(prev => {
            if (!prev) return prev;
            const next = JSON.parse(JSON.stringify(prev));
            
            if (Array.isArray(path)) {
                let current = next[section];
                for (let i = 0; i < path.length - 1; i++) {
                    if (!current[path[i]]) current[path[i]] = {};
                    current = current[path[i]];
                }
                current[path[path.length - 1]] = value;
            } else {
                next[section][path] = value;
            }
            return next;
        });
    }, []);

    const discardChanges = useCallback((sectionKey) => {
        if (!serverConfig) return;
        
        if (sectionKey) {
            setDraftConfig(prev => ({
                ...prev,
                [sectionKey]: JSON.parse(JSON.stringify(serverConfig[sectionKey]))
            }));
        } else {
            setDraftConfig(JSON.parse(JSON.stringify(serverConfig)));
        }
        setFieldErrors({});
    }, [serverConfig]);

    /**
     * Reconstructs an array of rows to save for a specific section,
     * merging draft updates with original metadata to preserve unknown keys.
     */
    const buildSavePayload = useCallback((section) => {
        if (!draftConfig || !serverConfig) return [];
        
        const updates = [];
        const meta = draftConfig.metadata || {};

        if (section === 'events') {
            Object.keys(draftConfig.events).forEach(key => {
                const originalRow = meta[key] || {};
                const draftVal = draftConfig.events[key];
                const { _is_active, ...restVal } = draftVal;
                
                updates.push({
                    config_key: key,
                    config_type: 'event',
                    config_value: { ...(originalRow.config_value || {}), ...restVal },
                    is_active: _is_active !== undefined ? _is_active : originalRow.is_active,
                    description: originalRow.description || ''
                });
            });
        } else if (section === 'tiers') {
            Object.keys(draftConfig.tiers).forEach(key => {
                const originalRow = meta[key] || {};
                updates.push({
                    config_key: key,
                    config_type: 'tier',
                    config_value: { ...(originalRow.config_value || {}), ...draftConfig.tiers[key] },
                    is_active: originalRow.is_active,
                    description: originalRow.description || ''
                });
            });
        } else if (section === 'global') {
            Object.keys(draftConfig.global).forEach(key => {
                if (key === 'redemption_mode') {
                    const originalRow = meta[key] || {};
                    updates.push({
                        config_key: key,
                        config_type: 'global',
                        config_value: draftConfig.global[key],
                        is_active: originalRow.is_active,
                        description: originalRow.description || ''
                    });
                } else {
                    const originalRow = meta[key] || {};
                    updates.push({
                        config_key: key,
                        config_type: 'global',
                        config_value: { ...(originalRow.config_value || {}), ...draftConfig.global[key] },
                        is_active: originalRow.is_active,
                        description: originalRow.description || ''
                    });
                }
            });
        } else if (section === 'levelSettings') {
            const originalRow = meta['level_settings'] || {};
            updates.push({
                config_key: 'level_settings',
                config_type: 'level',
                config_value: { ...(originalRow.config_value || {}), ...draftConfig.levelSettings },
                is_active: originalRow.is_active,
                description: originalRow.description || ''
            });
        } else if (section === 'eligibility') {
            const originalRow = meta['eligibility'] || {};
            updates.push({
                config_key: 'eligibility',
                config_type: 'eligibility',
                config_value: { ...(originalRow.config_value || {}), ...draftConfig.eligibility },
                is_active: originalRow.is_active,
                description: originalRow.description || ''
            });
        }

        return updates;
    }, [draftConfig, serverConfig]);

    const saveSection = async (sectionKey) => {
        if (savingSection) return false;
        
        setSavingSection(true);
        setFieldErrors({});
        
        try {
            const payload = buildSavePayload(sectionKey);
            if (payload.length === 0) {
                setSavingSection(false);
                return true;
            }

            const response = await fetch('/api/admin/rewards/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // The updated API will accept an array of configs for atomic bulk update
                body: JSON.stringify({ configs: payload })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to save section');
            }

            toast.success(`${sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)} settings saved`);
            await fetchConfigs(); // Refresh to get the latest canonical state
            return true;
        } catch (err) {
            console.error(`Error saving ${sectionKey}:`, err);
            toast.error(err.message || 'Failed to save settings');
            return false;
        } finally {
            setSavingSection(false);
        }
    };

    return {
        loading,
        loadError,
        draftConfig,
        serverConfig,
        dirtySections,
        savingSection,
        fieldErrors,
        updateDraft,
        discardChanges,
        saveSection,
        retryFetch: fetchConfigs
    };
}
