import type { TestCase } from '../../types/index';
export declare const DEFAULT_MATH_CONCEPTS: string[];
export declare const EXAMPLES: string[];
export declare function generateMathPrompt(testCases: TestCase[], injectVar: string, config: Record<string, any>): Promise<TestCase[]>;
export declare function encodeMathPrompt(text: string, concept: string): Promise<string>;
export declare function addMathPrompt(testCases: TestCase[], injectVar: string, config: Record<string, any>): Promise<TestCase[]>;
//# sourceMappingURL=mathPrompt.d.ts.map