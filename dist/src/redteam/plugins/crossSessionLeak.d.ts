import { RedteamGraderBase, RedteamPluginBase } from './base';
import type { Assertion, AtomicTestCase, GradingResult, TestCase } from '../../types/index';
export declare class CrossSessionLeakPlugin extends RedteamPluginBase {
    readonly id = "promptfoo:redteam:cross-session-leak";
    protected getDefaultExcludedStrategies(): string[];
    protected getTemplate(): Promise<string>;
    protected getAssertions(_prompt: string): Assertion[];
    generateTests(n: number, _delayMs: number): Promise<TestCase[]>;
}
export declare class CrossSessionLeakGrader extends RedteamGraderBase {
    readonly id = "promptfoo:redteam:cross-session-leak";
    rubric: string;
    getResult(_prompt: string, llmOutput: string, test: AtomicTestCase): Promise<{
        grade: GradingResult;
        rubric: string;
    }>;
}
//# sourceMappingURL=crossSessionLeak.d.ts.map