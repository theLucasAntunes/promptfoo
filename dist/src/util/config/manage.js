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
exports.getConfigDirectoryPath = getConfigDirectoryPath;
exports.setConfigDirectoryPath = setConfigDirectoryPath;
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const envars_1 = require("../../envars");
let configDirectoryPath = (0, envars_1.getEnvString)('PROMPTFOO_CONFIG_DIR');
// Check if we're in a Node.js environment
const isNodeEnvironment = typeof process !== 'undefined' && process.versions && process.versions.node;
function getConfigDirectoryPath(createIfNotExists = false) {
    const p = configDirectoryPath || path.join(os.homedir(), '.promptfoo');
    // Only perform filesystem operations in Node.js environment
    if (createIfNotExists && isNodeEnvironment) {
        try {
            const fs = require('fs');
            if (!fs.existsSync(p)) {
                fs.mkdirSync(p, { recursive: true });
            }
        }
        catch {
            // Silently ignore filesystem errors in browser environment
        }
    }
    return p;
}
function setConfigDirectoryPath(newPath) {
    configDirectoryPath = newPath;
}
//# sourceMappingURL=manage.js.map