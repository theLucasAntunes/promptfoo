"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cache_1 = require("../../src/cache");
const util_1 = require("../../src/redteam/util");
jest.mock('../../src/cache');
describe('removePrefix', () => {
    it('should remove a simple prefix', () => {
        expect((0, util_1.removePrefix)('Prompt: Hello world', 'Prompt')).toBe('Hello world');
    });
    it('should be case insensitive', () => {
        expect((0, util_1.removePrefix)('PROMPT: Hello world', 'prompt')).toBe('Hello world');
    });
    it('should remove asterisks from the prefix', () => {
        expect((0, util_1.removePrefix)('**Prompt:** Hello world', 'Prompt')).toBe('Hello world');
    });
    it('should handle multiple asterisks', () => {
        expect((0, util_1.removePrefix)('***Prompt:*** Hello world', 'Prompt')).toBe('Hello world');
    });
    it('should return the same string if prefix is not found', () => {
        expect((0, util_1.removePrefix)('Hello world', 'Prefix')).toBe('Hello world');
    });
    it('should handle empty strings', () => {
        expect((0, util_1.removePrefix)('', 'Prefix')).toBe('');
    });
    it('should handle prefix that is the entire string', () => {
        expect((0, util_1.removePrefix)('Prompt:', 'Prompt')).toBe('');
    });
});
describe('normalizeApostrophes', () => {
    it('should normalize different types of apostrophes', () => {
        expect((0, util_1.normalizeApostrophes)("I'm")).toBe("I'm");
        expect((0, util_1.normalizeApostrophes)('I′m')).toBe("I'm");
        expect((0, util_1.normalizeApostrophes)("I'm")).toBe("I'm");
        expect((0, util_1.normalizeApostrophes)("I'm")).toBe("I'm");
    });
    it('should handle strings without apostrophes', () => {
        expect((0, util_1.normalizeApostrophes)('Hello world')).toBe('Hello world');
    });
});
describe('isEmptyResponse', () => {
    it('should return true for empty responses', () => {
        expect((0, util_1.isEmptyResponse)('')).toBe(true);
        expect((0, util_1.isEmptyResponse)('   ')).toBe(true);
        expect((0, util_1.isEmptyResponse)('{}')).toBe(true);
        expect((0, util_1.isEmptyResponse)('  {}  ')).toBe(true);
        expect((0, util_1.isEmptyResponse)('undefined')).toBe(true);
        expect((0, util_1.isEmptyResponse)('  undefined  ')).toBe(true);
        expect((0, util_1.isEmptyResponse)('UNDEFINED')).toBe(true);
        expect((0, util_1.isEmptyResponse)('null')).toBe(true);
        expect((0, util_1.isEmptyResponse)('  NULL  ')).toBe(true);
    });
    it('should return false for non-empty responses', () => {
        expect((0, util_1.isEmptyResponse)('Hello')).toBe(false);
        expect((0, util_1.isEmptyResponse)('{"key": "value"}')).toBe(false);
        expect((0, util_1.isEmptyResponse)('undefined behavior')).toBe(false);
        expect((0, util_1.isEmptyResponse)('null pointer')).toBe(false);
    });
});
describe('isBasicRefusal', () => {
    it('should detect refusal prefixes', () => {
        expect((0, util_1.isBasicRefusal)('I am sorry, I cannot help with that')).toBe(true);
        expect((0, util_1.isBasicRefusal)("I'm not able to assist with this request")).toBe(true);
        expect((0, util_1.isBasicRefusal)('I apologize, but I cannot do that')).toBe(true);
    });
    it('should detect refusal substrings', () => {
        expect((0, util_1.isBasicRefusal)('As an AI language model, I cannot help with that')).toBe(true);
        expect((0, util_1.isBasicRefusal)('I cannot assist with that request')).toBe(true);
        expect((0, util_1.isBasicRefusal)('That would not be appropriate')).toBe(true);
    });
    it('should normalize apostrophes in responses', () => {
        expect((0, util_1.isBasicRefusal)("I′m sorry, I can't help")).toBe(true);
        expect((0, util_1.isBasicRefusal)("I'm unable to assist")).toBe(true);
    });
    it('should handle case insensitivity', () => {
        expect((0, util_1.isBasicRefusal)('I AM SORRY, I CANNOT HELP')).toBe(true);
        expect((0, util_1.isBasicRefusal)('as an ai language model')).toBe(true);
    });
    it('should return false for non-refusal responses', () => {
        expect((0, util_1.isBasicRefusal)('I will help you with that')).toBe(false);
        expect((0, util_1.isBasicRefusal)('Here is the information you requested')).toBe(false);
        expect((0, util_1.isBasicRefusal)('The answer is 42')).toBe(false);
    });
});
describe('getShortPluginId', () => {
    it('should remove promptfoo:redteam: prefix', () => {
        expect((0, util_1.getShortPluginId)('promptfoo:redteam:test')).toBe('test');
    });
    it('should return original if no prefix', () => {
        expect((0, util_1.getShortPluginId)('test')).toBe('test');
    });
});
describe('extractGoalFromPrompt', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });
    it('should successfully extract goal', async () => {
        jest.mocked(cache_1.fetchWithCache).mockResolvedValue({
            cached: false,
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { intent: 'test goal' },
            deleteFromCache: async () => { },
        });
        const result = await (0, util_1.extractGoalFromPrompt)('test prompt', 'test purpose');
        expect(result).toBe('test goal');
    });
    it('should return null on HTTP error', async () => {
        jest.mocked(cache_1.fetchWithCache).mockResolvedValue({
            cached: false,
            status: 500,
            statusText: 'Internal Server Error',
            headers: {},
            data: {},
            deleteFromCache: async () => { },
        });
        const result = await (0, util_1.extractGoalFromPrompt)('test prompt', 'test purpose');
        expect(result).toBeNull();
    });
    it('should return null when no intent returned', async () => {
        jest.mocked(cache_1.fetchWithCache).mockResolvedValue({
            cached: false,
            status: 200,
            statusText: 'OK',
            headers: {},
            data: {},
            deleteFromCache: async () => { },
        });
        const result = await (0, util_1.extractGoalFromPrompt)('test prompt', 'test purpose');
        expect(result).toBeNull();
    });
    it('should return null when API throws error', async () => {
        jest.mocked(cache_1.fetchWithCache).mockRejectedValue(new Error('API error'));
        const result = await (0, util_1.extractGoalFromPrompt)('test prompt', 'test purpose');
        expect(result).toBeNull();
    });
    it('should handle empty prompt and purpose', async () => {
        jest.mocked(cache_1.fetchWithCache).mockResolvedValue({
            cached: false,
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { intent: 'empty goal' },
            deleteFromCache: async () => { },
        });
        const result = await (0, util_1.extractGoalFromPrompt)('', '');
        expect(result).toBe('empty goal');
    });
    it('should include plugin context when pluginId is provided', async () => {
        jest.mocked(cache_1.fetchWithCache).mockResolvedValue({
            cached: false,
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { intent: 'plugin-specific goal' },
            deleteFromCache: async () => { },
        });
        const result = await (0, util_1.extractGoalFromPrompt)('innocent prompt', 'test purpose', 'indirect-prompt-injection');
        expect(result).toBe('plugin-specific goal');
        // Verify that the API was called with plugin context
        expect(cache_1.fetchWithCache).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
            body: expect.stringContaining('pluginContext'),
        }), expect.any(Number));
    });
    it('should skip remote call when remote generation is disabled', async () => {
        // Preserve original environment setting
        const originalValue = process.env.PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION;
        process.env.PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION = 'true';
        const result = await (0, util_1.extractGoalFromPrompt)('test prompt', 'test purpose');
        expect(result).toBeNull();
        expect(cache_1.fetchWithCache).not.toHaveBeenCalled();
        // Cleanup: restore or delete the env var to avoid leaking into other tests
        if (originalValue === undefined) {
            delete process.env.PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION;
        }
        else {
            process.env.PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION = originalValue;
        }
    });
    it('should skip goal extraction for dataset plugins with short plugin ID', async () => {
        const result = await (0, util_1.extractGoalFromPrompt)('test prompt', 'test purpose', 'beavertails');
        expect(result).toBeNull();
        expect(cache_1.fetchWithCache).not.toHaveBeenCalled();
    });
    it('should skip goal extraction for dataset plugins with full plugin ID', async () => {
        const result = await (0, util_1.extractGoalFromPrompt)('test prompt', 'test purpose', 'promptfoo:redteam:cyberseceval');
        expect(result).toBeNull();
        expect(cache_1.fetchWithCache).not.toHaveBeenCalled();
    });
    it('should skip goal extraction for all dataset plugins', async () => {
        const datasetPlugins = [
            'beavertails',
            'cyberseceval',
            'donotanswer',
            'harmbench',
            'toxic-chat',
            'aegis',
            'pliny',
            'unsafebench',
            'xstest',
        ];
        for (const pluginId of datasetPlugins) {
            const result = await (0, util_1.extractGoalFromPrompt)('test prompt', 'test purpose', pluginId);
            expect(result).toBeNull();
            // Also test with full plugin ID format
            const fullPluginId = `promptfoo:redteam:${pluginId}`;
            const resultFull = await (0, util_1.extractGoalFromPrompt)('test prompt', 'test purpose', fullPluginId);
            expect(resultFull).toBeNull();
        }
        expect(cache_1.fetchWithCache).not.toHaveBeenCalled();
    });
    it('should proceed with API call for non-dataset plugins', async () => {
        jest.mocked(cache_1.fetchWithCache).mockResolvedValue({
            cached: false,
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { intent: 'extracted goal' },
            deleteFromCache: async () => { },
        });
        // Test with a non-dataset plugin
        const result = await (0, util_1.extractGoalFromPrompt)('test prompt', 'test purpose', 'prompt-extraction');
        expect(result).toBe('extracted goal');
        expect(cache_1.fetchWithCache).toHaveBeenCalledTimes(1);
    });
    it('should proceed with API call for non-dataset plugins with full plugin ID', async () => {
        jest.mocked(cache_1.fetchWithCache).mockResolvedValue({
            cached: false,
            status: 200,
            statusText: 'OK',
            headers: {},
            data: { intent: 'extracted goal' },
            deleteFromCache: async () => { },
        });
        // Test with a full non-dataset plugin ID
        const result = await (0, util_1.extractGoalFromPrompt)('test prompt', 'test purpose', 'promptfoo:redteam:sql-injection');
        expect(result).toBe('extracted goal');
        expect(cache_1.fetchWithCache).toHaveBeenCalledTimes(1);
    });
});
//# sourceMappingURL=util.test.js.map