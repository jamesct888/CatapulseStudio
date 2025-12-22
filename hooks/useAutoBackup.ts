import { useEffect, useCallback } from 'react';
import { ProcessDefinition } from '../types';

const BACKUP_KEY = 'catapulse_autosave';
const BACKUP_TIMESTAMP_KEY = 'catapulse_backup_timestamp';

export const useAutoBackup = (processDef: ProcessDefinition | null, setProcessDef: (def: ProcessDefinition) => void) => {

    // Save to LocalStorage (Debounced effect)
    useEffect(() => {
        if (!processDef) return;

        const handler = setTimeout(() => {
            try {
                const json = JSON.stringify(processDef);
                localStorage.setItem(BACKUP_KEY, json);
                localStorage.setItem(BACKUP_TIMESTAMP_KEY, new Date().toISOString());
                console.log('[AutoBackup] Saved to device.');
            } catch (err) {
                console.error('[AutoBackup] Failed to save:', err);
            }
        }, 5000); // Save every 5 seconds of inactivity

        return () => clearTimeout(handler);
    }, [processDef]);

    // Restore Function
    const checkForBackup = useCallback((): { hasBackup: boolean; timestamp: string | null; restore: () => void } => {
        const backup = localStorage.getItem(BACKUP_KEY);
        const timestamp = localStorage.getItem(BACKUP_TIMESTAMP_KEY);

        if (backup && timestamp) {
            return {
                hasBackup: true,
                timestamp,
                restore: () => {
                    try {
                        const def = JSON.parse(backup);
                        setProcessDef(def);
                        console.log('[AutoBackup] Session restored.');
                    } catch (e) {
                        console.error('[AutoBackup] Corrupt backup found.');
                    }
                }
            };
        }
        return { hasBackup: false, timestamp: null, restore: () => { } };
    }, [setProcessDef]);

    return { checkForBackup };
};
