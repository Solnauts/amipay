/**
 * userAvatarStore — MMKV-backed persistence for the user's chosen avatar.
 *
 * On first access, a random avatar from the local registry is assigned.
 * The user can change their avatar via the picker, and it persists across sessions.
 */

import { createMMKV } from 'react-native-mmkv';
import { AVATARS, getRandomAvatarIndex } from '@/assets/avatars';
import { ImageSourcePropType } from 'react-native';

const storage = createMMKV({ id: 'user-avatar-store' });
const AVATAR_KEY = 'user_avatar_index';

export const userAvatarStore = {
    /**
     * Get the user's current avatar index.
     * If none is saved, randomly assigns one and persists it.
     */
    getIndex(): number {
        const stored = storage.getNumber(AVATAR_KEY);
        if (stored !== undefined && stored >= 0 && stored < AVATARS.length) {
            return stored;
        }
        // First time — assign a random avatar
        const idx = getRandomAvatarIndex();
        storage.set(AVATAR_KEY, idx);
        return idx;
    },

    /**
     * Set the user's chosen avatar index.
     */
    setIndex(index: number): void {
        if (index >= 0 && index < AVATARS.length) {
            storage.set(AVATAR_KEY, index);
        }
    },

    /**
     * Get the user's avatar as an ImageSource, ready for <Image source={...} />.
     */
    getSource(): ImageSourcePropType {
        return AVATARS[this.getIndex()];
    },

    /**
     * Reset to a new random avatar.
     */
    reset(): void {
        storage.delete(AVATAR_KEY);
    },
};
