/**
 * MCP server configuration types for Anthropic provider
 */
export interface MCPServerConfig {
    path?: string;
    command?: string;
    args?: string[];
    name?: string;
    url?: string;
    auth?: MCPServerAuth;
    headers?: Record<string, string>;
}
interface MCPServerAuth {
    type: 'bearer' | 'api_key';
    token?: string;
    api_key?: string;
}
export interface MCPConfig {
    enabled: boolean;
    server?: MCPServerConfig;
    servers?: MCPServerConfig[];
    timeout?: number;
    tools?: string[];
    exclude_tools?: string[];
    debug?: boolean;
    verbose?: boolean;
}
export interface MCPToolInputSchema {
    properties?: Record<string, any>;
    required?: string[];
    [key: string]: any;
}
export interface MCPTool {
    name: string;
    description: string;
    inputSchema: MCPToolInputSchema;
}
export interface MCPToolResult {
    content: string;
    error?: string;
}
export {};
//# sourceMappingURL=types.d.ts.map