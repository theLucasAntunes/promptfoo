"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRuby = void 0;
const wrapper_1 = require("../ruby/wrapper");
const index_1 = require("../types/index");
const invariant_1 = __importDefault(require("../util/invariant"));
// Recursively map snake_case keys to camelCase for Ruby compatibility
function mapSnakeCaseToCamelCase(obj) {
    // Create a shallow copy to avoid mutating the original object
    const result = { ...obj };
    // Handle top-level mappings
    // Support both 'pass' and 'pass_' for user convenience
    if ('pass_' in result && !('pass' in result)) {
        result.pass = result.pass_;
    }
    if ('named_scores' in result && !('namedScores' in result)) {
        result.namedScores = result.named_scores;
    }
    if ('component_results' in result && !('componentResults' in result)) {
        result.componentResults = result.component_results;
    }
    if ('tokens_used' in result && !('tokensUsed' in result)) {
        result.tokensUsed = result.tokens_used;
    }
    // Recursively handle nested component results
    if (result.componentResults && Array.isArray(result.componentResults)) {
        result.componentResults = result.componentResults.map((component) => {
            if (typeof component === 'object' && component !== null) {
                return mapSnakeCaseToCamelCase(component);
            }
            return component;
        });
    }
    return result;
}
const handleRuby = async ({ assertion, renderedValue, valueFromScript, context, output, }) => {
    (0, invariant_1.default)(typeof renderedValue === 'string', 'ruby assertion must have a string value');
    let pass;
    let score;
    try {
        let result;
        if (typeof valueFromScript === 'undefined') {
            const isMultiline = renderedValue.includes('\n');
            let indentStyle = '  ';
            if (isMultiline) {
                // Detect the indentation style of the first indented line
                const match = renderedValue.match(/^(?!\s*$)\s+/m);
                if (match) {
                    indentStyle = match[0];
                }
            }
            const rubyScript = `require 'json'

def main(output, context)
${isMultiline
                ? renderedValue
                    .split('\n')
                    .map((line) => `${indentStyle}${line}`)
                    .join('\n')
                : `  return ${renderedValue}`}
end
`;
            result = await (0, wrapper_1.runRubyCode)(rubyScript, 'main', [output, context]);
        }
        else {
            result = valueFromScript;
        }
        if ((typeof result === 'boolean' && result) ||
            (typeof result === 'string' && result.toLowerCase() === 'true')) {
            pass = true;
            score = 1.0;
        }
        else if ((typeof result === 'boolean' && !result) ||
            (typeof result === 'string' && result.toLowerCase() === 'false')) {
            pass = false;
            score = 0.0;
        }
        else if (typeof result === 'string' && result.startsWith('{')) {
            let parsed;
            try {
                parsed = JSON.parse(result);
            }
            catch (err) {
                throw new Error(`Invalid JSON: ${err} when parsing result: ${result}`);
            }
            if (!(0, index_1.isGradingResult)(parsed)) {
                throw new Error(`Ruby assertion must return a boolean, number, or {pass, score, reason} object. Got instead: ${result}`);
            }
            return parsed;
        }
        else if (typeof result === 'object') {
            const obj = result;
            // Support snake_case keys from Ruby (recursively)
            const mappedObj = mapSnakeCaseToCamelCase(obj);
            if (!(0, index_1.isGradingResult)(mappedObj)) {
                throw new Error(`Ruby assertion must return a boolean, number, or {pass, score, reason} object. Got instead:\n${JSON.stringify(mappedObj, null, 2)}`);
            }
            const rubyGradingResult = mappedObj;
            if (assertion.threshold !== undefined && rubyGradingResult.score < assertion.threshold) {
                rubyGradingResult.pass = false;
                const scoreMessage = `Ruby score ${rubyGradingResult.score} is less than threshold ${assertion.threshold}`;
                rubyGradingResult.reason = rubyGradingResult.reason
                    ? `${scoreMessage}: ${rubyGradingResult.reason}`
                    : scoreMessage;
            }
            return {
                ...rubyGradingResult,
                assertion,
            };
        }
        else {
            score = Number.parseFloat(String(result));
            if (Number.isNaN(score)) {
                throw new Error(`Ruby assertion must return a boolean, number, or {pass, score, reason} object. Instead got:\n${result}`);
            }
            pass = assertion.threshold !== undefined ? score >= assertion.threshold : score > 0;
        }
    }
    catch (err) {
        return {
            pass: false,
            score: 0,
            reason: `Ruby code execution failed: ${err.message}`,
            assertion,
        };
    }
    return {
        pass,
        score,
        reason: pass
            ? 'Assertion passed'
            : `Ruby code returned ${pass ? 'true' : 'false'}\n${assertion.value}`,
        assertion,
    };
};
exports.handleRuby = handleRuby;
//# sourceMappingURL=ruby.js.map