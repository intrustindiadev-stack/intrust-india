import { useState } from 'react';
import { toast } from 'react-hot-toast';

export function useAttendanceActions(onSuccess) {
    const [clocking, setClocking] = useState(false);

    const getCoordinates = () => {
        return new Promise((resolve) => {
            if (typeof window === 'undefined' || !navigator.geolocation) {
                resolve(null);
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => resolve(null),
                { enableHighAccuracy: true, timeout: 5000 }
            );
        });
    };

    const handleClockIn = async (selfieBase64 = null) => {
        setClocking(true);
        try {
            const coords = await getCoordinates();
            if (!coords) {
                toast.error('Location access denied. Please enable location to accurately verify on-site attendance.');
            }
            const res = await fetch('/api/employee/attendance/clock-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    lat: coords?.lat ?? null, 
                    lng: coords?.lng ?? null,
                    selfieBase64: selfieBase64
                })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Clock in failed');

            toast.success(result.record?.is_onsite ? 'Shift started! (On-Site) 🌟' : 'Shift started! (Off-Site/WFH) 🌟');
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error(err.message || 'Clock in failed');
        } finally {
            setClocking(false);
        }
    };

    const handleClockOut = async (recordId) => {
        setClocking(true);
        try {
            const coords = await getCoordinates();
            const res = await fetch('/api/employee/attendance/clock-out', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ record_id: recordId, lat: coords?.lat ?? null, lng: coords?.lng ?? null })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Clock out failed');

            toast.success('Shift completed. Enjoy your evening! 👋');
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error(err.message || 'Clock out failed');
        } finally {
            setClocking(false);
        }
    };

    const handleForceCheckoutPrevious = async (recordId) => {
        setClocking(true);
        try {
            const res = await fetch('/api/employee/attendance/force-close', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ record_id: recordId })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Reconciliation failed');
            
            toast.success('Previous shift closed automatically.');
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error(err.message || 'Failed to force checkout');
        } finally {
            setClocking(false);
        }
    };

    return {
        clocking,
        handleClockIn,
        handleClockOut,
        handleForceCheckoutPrevious
    };
}
