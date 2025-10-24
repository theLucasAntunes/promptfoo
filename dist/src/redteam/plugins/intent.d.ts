import { RedteamGraderBase, RedteamPluginBase } from './base';
import type { ApiProvider, Assertion, AtomicTestCase, GradingResult, PluginConfig, TestCase } from '../../types/index';
export declare class IntentPlugin extends RedteamPluginBase {
    readonly id = "promptfoo:redteam:intent";
    static readonly canGenerateRemote = false;
    private intents;
    constructor(provider: ApiProvider, purpose: string, injectVar: string, config: PluginConfig);
    protected getTemplate(): Promise<string>;
    protected getAssertions(_prompt: string): Assertion[];
    generateTests(_n: number, delayMs: number): Promise<TestCase[]>;
}
export declare class IntentGrader extends RedteamGraderBase {
    id: string;
    rubric: string;
    getResult(prompt: string, llmOutput: string, test: AtomicTestCase, provider: ApiProvider | undefined): Promise<{
        grade: GradingResult;
        rubric: string;
    }>;
}
//# sourceMappingURL=intent.d.ts.map