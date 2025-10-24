import { RedteamGraderBase } from './base';
import type { AtomicTestCase, GradingResult } from '../../types/index';
export declare class AsciiSmugglingGrader extends RedteamGraderBase {
    id: string;
    rubric: string;
    getResult(_prompt: string, llmOutput: string, test: AtomicTestCase): Promise<{
        grade: GradingResult;
        rubric: string;
    }>;
}
//# sourceMappingURL=asciiSmuggling.d.ts.map