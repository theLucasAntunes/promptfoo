"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PURPOSE = void 0;
exports.extractSystemPurpose = extractSystemPurpose;
const dedent_1 = __importDefault(require("dedent"));
const logger_1 = __importDefault(require("../../logger"));
const remoteGeneration_1 = require("../remoteGeneration");
const util_1 = require("./util");
exports.DEFAULT_PURPOSE = 'An AI system';
async function extractSystemPurpose(provider, prompts) {
    const onlyTemplatePrompt = prompts.length === 1 && prompts[0] && prompts[0].trim().replace(/\s+/g, '') === '{{prompt}}';
    if (prompts.length === 0 || onlyTemplatePrompt) {
        logger_1.default.debug('[purpose] No meaningful prompts provided, returning default purpose');
        return exports.DEFAULT_PURPOSE;
    }
    if (!(0, remoteGeneration_1.neverGenerateRemote)()) {
        try {
            const result = await (0, util_1.fetchRemoteGeneration)('purpose', prompts);
            return result;
        }
        catch (error) {
            logger_1.default.warn(`[purpose] Error using remote generation, returning empty string: ${error}`);
            return '';
        }
    }
    // Fallback to local extraction
    const prompt = (0, dedent_1.default) `
    The following are prompts that are being used to test an LLM application:

    ${(0, util_1.formatPrompts)(prompts)}

    Given the above prompts, output the "system purpose" of the application in a single sentence, enclosed in <Purpose> tags.

    Example outputs:
    <Purpose>Provide users a way to manage finances</Purpose>
    <Purpose>Executive assistant that helps with scheduling and reminders</Purpose>
    <Purpose>Ecommerce chatbot that sells shoes</Purpose>
  `;
    try {
        return (0, util_1.callExtraction)(provider, prompt, (output) => {
            const match = output.match(/<Purpose>(.*?)<\/Purpose>/);
            return match ? match[1].trim() : output.trim();
        });
    }
    catch (error) {
        logger_1.default.warn(`[purpose] Error using extracting purpose, returning empty string: ${error}`);
        return '';
    }
}
//# sourceMappingURL=purpose.js.map