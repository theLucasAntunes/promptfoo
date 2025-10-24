import type { LoadApiProviderContext, TestSuiteConfig } from '../types/index';
import type { EnvOverrides } from '../types/env';
import type { ApiProvider } from '../types/providers';
export declare function loadApiProvider(providerPath: string, context?: LoadApiProviderContext): Promise<ApiProvider>;
/**
 * Helper function to resolve provider from various formats (string, object, function)
 * Uses providerMap for optimization and falls back to loadApiProvider with proper context
 */
export declare function resolveProvider(provider: any, providerMap: Record<string, ApiProvider>, context?: {
    env?: any;
}): Promise<ApiProvider>;
export declare function loadApiProviders(providerPaths: TestSuiteConfig['providers'], options?: {
    basePath?: string;
    env?: EnvOverrides;
}): Promise<ApiProvider[]>;
/**
 * Given a `providerPaths` object, resolves a list of provider IDs. Mimics the waterfall behavior
 * of `loadApiProviders` to ensure consistent behavior given the shape of the `providerPaths`
 * object.
 *
 * @param providerPaths - The list of providers to get the IDs of.
 * @returns The IDs of the providers in the providerPaths list.
 */
export declare function getProviderIds(providerPaths: TestSuiteConfig['providers']): string[];
//# sourceMappingURL=index.d.ts.map