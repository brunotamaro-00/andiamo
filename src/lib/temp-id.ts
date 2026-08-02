/**
 * Ids for optimistic rows — a row rendered before its `create` came back, so it
 * has no server id yet.
 *
 * Two reasons this is not just `temp-${Date.now()}`:
 *
 *  1. It is the React key. Two adds resolved within the same millisecond
 *     produced duplicate keys, and `items.find(i => i.id === openId)` then
 *     matched the wrong row — the detail sheet opened, and could delete, a
 *     different note.
 *  2. Callers must be able to recognise it. Delete actions treat "already gone"
 *     (Prisma P2025) as success, which is right for a real id and a lie for a
 *     temp one: deleting a still-optimistic row reported "Nota borrada" while
 *     the original create committed underneath and the row reappeared on the
 *     next revalidation. `isTempId` is the guard that stops that.
 */
const TEMP_PREFIX = "temp-";

export const tempId = () => `${TEMP_PREFIX}${crypto.randomUUID()}`;

export const isTempId = (id: string) => id.startsWith(TEMP_PREFIX);
