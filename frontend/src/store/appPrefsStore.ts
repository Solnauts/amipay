/**
 * appPrefsStore — MMKV-backed persistence for general app settings.
 *
 * Currently tracks:
 * - has_seen_intro: Whether the 3-page brand intro has been displayed.
 */

import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV({ id: 'app-prefs-store' });

const KEYS = {
    HAS_SEEN_INTRO: 'has_seen_intro',
};

export const appPrefsStore = {
    /**
     * Check if the user has completed the brand intro flow.
     */
    hasSeenIntro(): boolean {
        return storage.getBoolean(KEYS.HAS_SEEN_INTRO) ?? false;
    },

    /**
     * Mark the brand intro as completed.
     */
    setSeenIntro(value: boolean = true): void {
        storage.set(KEYS.HAS_SEEN_INTRO, value);
    },

    /**
     * Reset all preferences (useful for testing/logout).
     */
    resetAll(): void {
        storage.set(KEYS.HAS_SEEN_INTRO, false);
    },
};
