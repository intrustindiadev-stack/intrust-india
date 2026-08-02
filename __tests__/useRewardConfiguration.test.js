import { renderHook, act } from '@testing-library/react';
import { useRewardConfiguration } from '../hooks/useRewardConfiguration';
import React from 'react';

// Mock fetch
global.fetch = jest.fn();
// Mock toast
jest.mock('react-hot-toast', () => ({
    success: jest.fn(),
    error: jest.fn()
}));

const mockConfigs = [
    {
        config_key: 'signup_reward',
        config_type: 'event',
        config_value: { direct: 100, L1: 20 },
        is_active: true,
        description: 'test'
    },
    {
        config_key: 'redemption_mode',
        config_type: 'global',
        config_value: '"approval_required"', // stringified scalar
        is_active: true
    },
    {
        config_key: 'point_value',
        config_type: 'global',
        config_value: { points_per_rupee: 5, unknown_key: 'preservethis' },
        is_active: true
    }
];

describe('useRewardConfiguration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should fetch and normalize configs correctly', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ configs: mockConfigs })
        });

        const { result } = renderHook(() => useRewardConfiguration());

        // Wait for fetch to complete
        await act(async () => {
            await Promise.resolve();
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.loadError).toBeNull();
        
        // Assert normalization
        const serverConfig = result.current.serverConfig;
        
        // Events
        expect(serverConfig.events.signup_reward).toBeDefined();
        expect(serverConfig.events.signup_reward.direct).toBe(100);
        expect(serverConfig.events.signup_reward._is_active).toBe(true);

        // Global scalar string (should be stripped of quotes)
        expect(serverConfig.global.redemption_mode).toBe('approval_required');

        // Global object
        expect(serverConfig.global.point_value.points_per_rupee).toBe(5);
        expect(serverConfig.global.point_value.unknown_key).toBe('preservethis');
    });

    it('should not initialize with zero-value defaults on error', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Server error' })
        });

        const { result } = renderHook(() => useRewardConfiguration());

        await act(async () => {
            await Promise.resolve();
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.loadError).toBe('Server error');
        expect(result.current.serverConfig).toBeNull();
        expect(result.current.draftConfig).toBeNull();
    });

    it('should preserve unknown properties when saving', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ configs: mockConfigs })
        });

        const { result } = renderHook(() => useRewardConfiguration());

        await act(async () => {
            await Promise.resolve();
        });

        // Update draft
        act(() => {
            result.current.updateDraft('global', ['point_value', 'points_per_rupee'], 10);
        });

        expect(result.current.dirtySections).toContain('global');

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true })
        });

        // Save
        let isSaved = false;
        await act(async () => {
            isSaved = await result.current.saveSection('global');
        });

        expect(isSaved).toBe(true);

        // Check fetch payload
        const callArgs = global.fetch.mock.calls[1][1];
        const body = JSON.parse(callArgs.body);

        // find point_value payload
        const pvPayload = body.configs.find(c => c.config_key === 'point_value');
        expect(pvPayload.config_value.points_per_rupee).toBe(10); // updated
        expect(pvPayload.config_value.unknown_key).toBe('preservethis'); // preserved
    });
});
