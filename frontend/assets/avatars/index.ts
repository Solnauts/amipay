/**
 * Local Avatar Registry
 *
 * Drop your avatar images into this folder and add them to the AVATARS list.
 * Each avatar is assigned a numeric index (0-based).
 */

import { ImageSourcePropType } from 'react-native';

// ─── Avatar list ─────────────────────────────────────────────────────────────
export const AVATARS: ImageSourcePropType[] = [
    require('./avatar1.png'),
    require('./avatar2.png'),
    require('./avatar3.png'),
    require('./avatar4.png'),
    require('./avatar5.png'),
    require('./avatar6.png'),
];

/**
 * Returns a deterministic avatar index for a given seed string.
 */
export function getAvatarIndexForSeed(seed: string): number {
    if (AVATARS.length === 0) return 0;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return hash % AVATARS.length;
}

/**
 * Returns a random avatar index.
 */
export function getRandomAvatarIndex(): number {
    return Math.floor(Math.random() * AVATARS.length);
}
