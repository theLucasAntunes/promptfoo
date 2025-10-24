import type { Plugin } from './plugins';
import type { Strategy } from './strategies';
export declare const FRAMEWORK_NAMES: Record<string, string>;
export declare const OWASP_LLM_TOP_10_NAMES: string[];
export declare const OWASP_API_TOP_10_NAMES: string[];
export declare const OWASP_AGENTIC_NAMES: string[];
export declare const GDPR_ARTICLE_NAMES: string[];
export declare const OWASP_LLM_TOP_10_MAPPING: Record<string, {
    plugins: Plugin[];
    strategies: Strategy[];
}>;
export declare const OWASP_API_TOP_10_MAPPING: Record<string, {
    plugins: Plugin[];
    strategies: Strategy[];
}>;
/**
 * OWASP Agentic AI - Threats and Mitigations v1.0 (February 2025)
 */
export declare const OWASP_AGENTIC_REDTEAM_MAPPING: Record<string, {
    plugins: Plugin[];
    strategies: Strategy[];
}>;
/**
 * Maps each major phase of the OWASP GenAI Red Teaming Blueprint
 * to relevant Promptfoo plugins and strategies for automated testing.
 */
export declare const OWASP_LLM_RED_TEAM_MAPPING: Record<string, {
    plugins: Plugin[];
    strategies: Strategy[];
}>;
export declare const NIST_AI_RMF_MAPPING: Record<string, {
    plugins: Plugin[];
    strategies: Strategy[];
}>;
export declare const MITRE_ATLAS_MAPPING: Record<string, {
    plugins: Plugin[];
    strategies: Strategy[];
}>;
/**
 *  EU Artificial Intelligence Act
 *  ▸ Art. 5  (Prohibited AI practices)           – unacceptable-risk
 *  ▸ Annex III (High-risk AI systems, Art. 6(2)) – high-risk
 *
 *  Sources:
 *   * Art. 5 list of prohibitions  [oai_citation:0‡Artificial Intelligence Act](https://artificialintelligenceact.eu/article/5/?utm_source=chatgpt.com)
 *   * Annex III high-risk categories  [oai_citation:1‡Lexology](https://www.lexology.com/library/detail.aspx?g=ec2aab25-67aa-4635-87a0-fc43d9fd1f51&utm_source=chatgpt.com)
 */
export declare const EU_AI_ACT_MAPPING: Record<string, {
    plugins: Plugin[];
    strategies: Strategy[];
}>;
/**
 * ISO/IEC 42001 – AI Management System (AIMS) framework risk areas
 * Covers key risk domains: human oversight, fairness, privacy, robustness, security, ethics, transparency.
 */
export declare const ISO_42001_MAPPING: Record<string, {
    plugins: Plugin[];
    strategies: Strategy[];
}>;
/**
 * EU General Data Protection Regulation (GDPR)
 * Maps key GDPR articles to relevant Promptfoo plugins for testing AI/LLM systems
 * for compliance with data protection requirements.
 *
 * Sources:
 *  * GDPR full text: https://gdpr-info.eu/
 */
export declare const GDPR_MAPPING: Record<string, {
    plugins: Plugin[];
    strategies: Strategy[];
}>;
export declare const ALIASED_PLUGINS: readonly ["mitre:atlas", "nist:ai", "nist:ai:measure", "owasp:api", "owasp:llm", "owasp:llm:redteam:model", "owasp:llm:redteam:implementation", "owasp:llm:redteam:system", "owasp:llm:redteam:runtime", "toxicity", "bias", "misinformation", "illegal-activity", "personal-safety", "tool-discovery:multi-turn", "eu:ai-act", "iso:42001", "gdpr", ...string[]];
export declare const ALIASED_PLUGIN_MAPPINGS: Record<string, Record<string, {
    plugins: string[];
    strategies: string[];
}>>;
//# sourceMappingURL=frameworks.d.ts.map