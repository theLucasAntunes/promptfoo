"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyObjectSchema = void 0;
const zod_1 = require("zod");
// Policy Types
exports.PolicyObjectSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    text: zod_1.z.string().optional(),
    name: zod_1.z.string().optional(),
});
//# sourceMappingURL=types.js.map