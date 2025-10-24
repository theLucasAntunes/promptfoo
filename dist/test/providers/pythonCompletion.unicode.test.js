"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const globals_1 = require("@jest/globals");
const pythonCompletion_1 = require("../../src/providers/pythonCompletion");
const pythonUtils = __importStar(require("../../src/python/pythonUtils"));
const pythonUtils_1 = require("../../src/python/pythonUtils");
// Mock the expensive Python execution for fast, reliable tests
jest.mock('../../src/python/pythonUtils');
const mockRunPython = jest.mocked(pythonUtils_1.runPython);
(0, globals_1.describe)('PythonProvider Unicode handling', () => {
    let tempDir;
    (0, globals_1.beforeAll)(() => {
        // Disable caching for tests to ensure fresh runs
        process.env.PROMPTFOO_CACHE_ENABLED = 'false';
    });
    (0, globals_1.beforeEach)(() => {
        jest.clearAllMocks();
        // Reset mocked implementations to avoid test interference
        mockRunPython.mockReset();
        // Reset Python state to avoid test interference
        pythonUtils.state.cachedPythonPath = null;
        pythonUtils.state.validationPromise = null;
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'promptfoo-unicode-test-'));
    });
    (0, globals_1.afterEach)(() => {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true });
        }
    });
    // Helper to create a provider with less overhead
    const createProvider = (scriptName, scriptContent) => {
        const scriptPath = path.join(tempDir, scriptName);
        fs.writeFileSync(scriptPath, scriptContent);
        return new pythonCompletion_1.PythonProvider(scriptPath, {
            id: `python:${scriptName}`,
            config: { basePath: tempDir },
        });
    };
    (0, globals_1.it)('should correctly handle Unicode characters in prompt', async () => {
        // Mock Python execution to return expected Unicode response
        mockRunPython.mockResolvedValue({
            output: 'Received: Product® Plus',
            metadata: {
                prompt_length: 13,
                prompt_bytes: 14, // ® is 2 bytes in UTF-8
            },
        });
        const provider = createProvider('unicode_test.py', `
def call_api(prompt, options, context):
    return {
        "output": f"Received: {prompt}",
        "metadata": {
            "prompt_length": len(prompt),
            "prompt_bytes": len(prompt.encode('utf-8'))
        }
    }
`);
        const result = await provider.callApi('Product® Plus');
        // Verify the result structure and Unicode preservation
        (0, globals_1.expect)(result.output).toBe('Received: Product® Plus');
        (0, globals_1.expect)(result.metadata?.prompt_length).toBe(13);
        (0, globals_1.expect)(result.metadata?.prompt_bytes).toBe(14);
        (0, globals_1.expect)(result.error).toBeUndefined();
        // Verify Unicode string was passed correctly to Python layer
        (0, globals_1.expect)(mockRunPython).toHaveBeenCalledWith(globals_1.expect.stringContaining('unicode_test.py'), 'call_api', ['Product® Plus', globals_1.expect.any(Object), undefined], { pythonExecutable: undefined });
        // Ensure no null bytes in JSON serialization
        const jsonStr = JSON.stringify(result);
        (0, globals_1.expect)(jsonStr).not.toContain('\u0000');
        (0, globals_1.expect)(jsonStr).not.toContain('\\u0000');
        (0, globals_1.expect)(jsonStr).toContain('Product® Plus');
    });
    (0, globals_1.it)('should handle Unicode in context vars', async () => {
        // Mock Python execution with Unicode context response
        mockRunPython.mockResolvedValue({
            output: 'Test prompt - Product: Product® Plus™',
            metadata: {
                product_name: 'Product® Plus™',
                product_bytes: 16, // Unicode characters in bytes
            },
        });
        const provider = createProvider('context_unicode_test.py', `
def call_api(prompt, options, context):
    vars = context.get('vars', {})
    product_name = vars.get('product', 'Unknown')
    return {
        "output": f"{prompt} - Product: {product_name}",
        "metadata": {
            "product_name": product_name,
            "product_bytes": len(product_name.encode('utf-8'))
        }
    }
`);
        const context = {
            prompt: { raw: 'Test prompt', label: 'test' },
            vars: {
                product: 'Product® Plus™',
                company: '© 2025 Company',
                price: '€100',
            },
        };
        const result = await provider.callApi('Test prompt', context);
        // Verify Unicode handling in response
        (0, globals_1.expect)(result.output).toBe('Test prompt - Product: Product® Plus™');
        (0, globals_1.expect)(result.metadata?.product_name).toBe('Product® Plus™');
        // Verify Unicode context vars were passed correctly
        (0, globals_1.expect)(mockRunPython).toHaveBeenCalledWith(globals_1.expect.stringContaining('context_unicode_test.py'), 'call_api', [
            'Test prompt',
            globals_1.expect.any(Object),
            globals_1.expect.objectContaining({
                vars: globals_1.expect.objectContaining({
                    product: 'Product® Plus™',
                    company: '© 2025 Company',
                    price: '€100',
                }),
            }),
        ], { pythonExecutable: undefined });
    });
    (0, globals_1.it)('should handle complex nested Unicode data', async () => {
        // Mock complex nested Unicode response
        mockRunPython.mockResolvedValue({
            output: 'Complex Unicode test',
            nested: {
                products: [
                    { name: 'Product®', price: '€100' },
                    { name: 'Brand™', price: '€200' },
                    { name: 'Item© 2025', price: '€300' },
                ],
                metadata: {
                    temperature: '25°C',
                    description: 'Advanced Product® with Brand™ technology ©2025',
                },
            },
        });
        const provider = createProvider('nested_unicode_test.py', `
def call_api(prompt, options, context):
    return {
        "output": "Complex Unicode test",
        "nested": {
            "products": [
                {"name": "Product®", "price": "€100"},
                {"name": "Brand™", "price": "€200"},
                {"name": "Item© 2025", "price": "€300"}
            ],
            "metadata": {
                "temperature": "25°C",
                "description": "Advanced Product® with Brand™ technology ©2025"
            }
        }
    }
`);
        const result = await provider.callApi('Test');
        // Verify complex nested Unicode structures are preserved
        const resultAny = result;
        (0, globals_1.expect)(resultAny.nested.products[0].name).toBe('Product®');
        (0, globals_1.expect)(resultAny.nested.products[1].name).toBe('Brand™');
        (0, globals_1.expect)(resultAny.nested.products[2].name).toBe('Item© 2025');
        (0, globals_1.expect)(resultAny.nested.metadata.temperature).toBe('25°C');
        (0, globals_1.expect)(resultAny.nested.metadata.description).toBe('Advanced Product® with Brand™ technology ©2025');
        // Verify the prompt was passed through correctly
        (0, globals_1.expect)(mockRunPython).toHaveBeenCalledWith(globals_1.expect.stringContaining('nested_unicode_test.py'), 'call_api', ['Test', globals_1.expect.any(Object), undefined], { pythonExecutable: undefined });
        // Ensure nested Unicode data serializes properly
        const jsonStr = JSON.stringify(result);
        (0, globals_1.expect)(jsonStr).toContain('Product®');
        (0, globals_1.expect)(jsonStr).toContain('Brand™');
        (0, globals_1.expect)(jsonStr).toContain('€100');
        (0, globals_1.expect)(jsonStr).toContain('25°C');
        (0, globals_1.expect)(jsonStr).not.toContain('\u0000');
    });
});
//# sourceMappingURL=pythonCompletion.unicode.test.js.map