const DEVICE_ID_KEY = 'crm_device_id';

export const getOrCreateDeviceId = (): string => {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;

    const deviceId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    return deviceId;
};

export const getDeviceName = (): string => {
    if (typeof navigator === 'undefined') return 'Unknown device';
    const platform = navigator.platform || 'Unknown platform';
    const language = navigator.language || '';
    return `${platform}${language ? ` (${language})` : ''}`;
};
