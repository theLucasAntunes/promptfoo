import type { Plugin } from './plugins';
import type { Strategy } from './strategies';
export declare const subCategoryDescriptions: Record<Plugin | Strategy, string>;
export declare const displayNameOverrides: Record<Plugin | Strategy, string>;
export declare enum Severity {
    Critical = "critical",
    High = "high",
    Medium = "medium",
    Low = "low"
}
export declare const severityDisplayNames: Record<Severity, string>;
export declare const severityRiskScores: Record<Severity, number>;
export declare const riskCategorySeverityMap: Record<Plugin, Severity>;
export declare const riskCategories: Record<string, Plugin[]>;
export declare const categoryDescriptions: {
    'Security & Access Control': string;
    'Compliance & Legal': string;
    'Trust & Safety': string;
    Brand: string;
    Datasets: string;
    'Domain-Specific Risks': string;
};
export type TopLevelCategory = keyof typeof riskCategories;
export declare const categoryMapReverse: Record<string, string>;
export declare const categoryLabels: string[];
export declare const categoryAliases: Record<Plugin, string>;
export declare const categoryAliasesReverse: Record<string, string>;
export declare const pluginDescriptions: Record<Plugin, string>;
export declare const strategyDescriptions: Record<Strategy, string>;
export declare const strategyDisplayNames: Record<Strategy, string>;
export declare const PLUGIN_PRESET_DESCRIPTIONS: Record<string, string>;
export declare const DEFAULT_OUTPUT_PATH = "redteam.yaml";
//# sourceMappingURL=metadata.d.ts.map