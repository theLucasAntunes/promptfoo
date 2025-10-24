"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const plugins_1 = require("../../../src/redteam/constants/plugins");
describe('plugins constants', () => {
    it('should have ALL_PLUGINS as sorted array', () => {
        const sorted = [...plugins_1.ALL_PLUGINS].sort();
        expect(plugins_1.ALL_PLUGINS).toEqual(sorted);
    });
    it('should have unique values in ALL_PLUGINS', () => {
        const uniquePlugins = new Set(plugins_1.ALL_PLUGINS);
        expect(uniquePlugins.size).toBe(plugins_1.ALL_PLUGINS.length);
    });
});
//# sourceMappingURL=plugins.test.js.map