/**
 * Thin wrapper around the Hermes built-in crypto.randomUUID().
 * No UUID package required — Hermes ships crypto.randomUUID() out of the box.
 */
export const newId = (): string => crypto.randomUUID();
