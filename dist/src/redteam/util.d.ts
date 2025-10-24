/**
 * Normalizes different types of apostrophes to a standard single quote
 */
export declare function normalizeApostrophes(str: string): string;
export declare function isEmptyResponse(response: string): boolean;
export declare function isBasicRefusal(response: string): boolean;
/**
 * Remove a prefix from a string.
 *
 * @param str - The string to remove the prefix from.
 * @param prefix - The prefix to remove - case insensitive.
 * @returns The string with the prefix removed.
 */
export declare function removePrefix(str: string, prefix: string): string;
/**
 * Extracts the short name from a fully qualified plugin ID.
 * Removes the 'promptfoo:redteam:' prefix if present.
 * @param pluginId The full plugin ID
 * @returns The short plugin ID
 */
export declare function getShortPluginId(pluginId: string): string;
/**
 * Extracts goal from a prompt using remote generation API.
 * @param prompt - The prompt to extract goal from.
 * @param purpose - The purpose of the system.
 * @param pluginId - Optional plugin ID to provide context about the attack type.
 * @returns The extracted goal, or null if extraction fails.
 */
export declare function extractGoalFromPrompt(prompt: string, purpose: string, pluginId?: string): Promise<string | null>;
//# sourceMappingURL=util.d.ts.map