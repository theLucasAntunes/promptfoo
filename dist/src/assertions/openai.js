"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleIsValidOpenAiToolsCall = void 0;
const util_1 = require("../providers/openai/util");
const index_1 = require("../util/index");
const invariant_1 = __importDefault(require("../util/invariant"));
const handleIsValidOpenAiToolsCall = ({ assertion, output, provider, test, }) => {
    // Handle MCP tool outputs from Responses API
    const outputStr = typeof output === 'string' ? output : JSON.stringify(output);
    // Check for MCP tool results in the output
    if (outputStr.includes('MCP Tool Result') || outputStr.includes('MCP Tool Error')) {
        // For MCP tools, we validate that the tool call was successful
        if (outputStr.includes('MCP Tool Error')) {
            const errorMatch = outputStr.match(/MCP Tool Error \(([^)]+)\): (.+)/);
            const toolName = errorMatch ? errorMatch[1] : 'unknown';
            const errorMsg = errorMatch ? errorMatch[2] : 'unknown error';
            return {
                pass: false,
                score: 0,
                reason: `MCP tool call failed for ${toolName}: ${errorMsg}`,
                assertion,
            };
        }
        // MCP tool call succeeded
        const resultMatch = outputStr.match(/MCP Tool Result \(([^)]+)\):/);
        const toolName = resultMatch ? resultMatch[1] : 'unknown';
        return {
            pass: true,
            score: 1,
            reason: `MCP tool call succeeded for ${toolName}`,
            assertion,
        };
    }
    // Handle traditional OpenAI function/tool calls
    if (typeof output === 'object' && 'tool_calls' in output) {
        output = output.tool_calls;
    }
    const toolsOutput = output;
    if (!Array.isArray(toolsOutput) ||
        toolsOutput.length === 0 ||
        typeof toolsOutput[0].function.name !== 'string' ||
        typeof toolsOutput[0].function.arguments !== 'string') {
        return {
            pass: false,
            score: 0,
            reason: `OpenAI did not return a valid-looking tools response: ${JSON.stringify(toolsOutput)}`,
            assertion,
        };
    }
    let tools = provider.config.tools;
    if (tools) {
        tools = (0, index_1.maybeLoadToolsFromExternalFile)(tools, test.vars);
    }
    (0, invariant_1.default)(tools, `Tools are expected to be an array of objects with a function property. Got: ${JSON.stringify(tools)}`);
    try {
        toolsOutput.forEach((toolOutput) => {
            (0, util_1.validateFunctionCall)(toolOutput.function, tools
                .filter((tool) => tool.type === 'function' && 'function' in tool)
                .map((tool) => tool.function), test.vars);
        });
        return {
            pass: true,
            score: 1,
            reason: 'Assertion passed',
            assertion,
        };
    }
    catch (err) {
        return {
            pass: false,
            score: 0,
            reason: err.message,
            assertion,
        };
    }
};
exports.handleIsValidOpenAiToolsCall = handleIsValidOpenAiToolsCall;
//# sourceMappingURL=openai.js.map