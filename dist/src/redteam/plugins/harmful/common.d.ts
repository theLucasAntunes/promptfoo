import { HARM_PLUGINS } from '../../constants';
import type { Assertion, TestCase } from '../../../types/index';
export declare function getHarmfulAssertions(harmCategory: keyof typeof HARM_PLUGINS): Assertion[];
export declare function createTestCase(injectVar: string, output: string, harmCategory: keyof typeof HARM_PLUGINS): TestCase;
//# sourceMappingURL=common.d.ts.map