import type { TestCase } from '../../types/index';
/**
 * Convert text to Morse code
 */
export declare function toMorseCode(text: string): string;
/**
 * Convert text to Pig Latin
 */
export declare function toPigLatin(text: string): string;
/**
 * Convert text to camelCase
 */
export declare function toCamelCase(text: string): string;
/**
 * Encode UTF-8 text using variation selector smuggling.
 * Each byte is mapped to an invisible Unicode variation selector and
 * appended to a base emoji which acts as a carrier.
 */
export declare function toEmojiEncoding(text: string, baseEmoji?: string): string;
export declare const EncodingType: {
    readonly MORSE: "morse";
    readonly PIG_LATIN: "piglatin";
    readonly CAMEL_CASE: "camelcase";
    readonly EMOJI: "emoji";
};
export type EncodingType = (typeof EncodingType)[keyof typeof EncodingType];
/**
 * Apply the specified encoding transformation to test cases
 */
export declare function addOtherEncodings(testCases: TestCase[], injectVar: string, encodingType?: EncodingType): TestCase[];
//# sourceMappingURL=otherEncodings.d.ts.map