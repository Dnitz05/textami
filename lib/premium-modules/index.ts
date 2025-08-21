// lib/premium-modules/index.ts
// TEXTAMI PREMIUM MODULES - Main exports
// €1,250 Premium Modules system for maximum document generation quality

// Core Analysis Engine
export {
  premiumContentAnalyzer,
  type ExcelColumnAnalysis,
  type WordSelectionAnalysis,
  type WordStyle,
  type PremiumOpportunity
} from './PremiumContentAnalyzer'

// Intelligent Module Selection  
export {
  intelligentModuleSelector,
  type ModuleSelectionResult,
  type PremiumModuleType,
  type PremiumSyntaxOptions,
  type StyleConfiguration,
  type ImageConfiguration,
  type HTMLConfiguration
} from './IntelligentModuleSelector'

// Premium Mapping Engine
export {
  premiumMappingEngine,
  type PremiumMapping,
  type EnhancedWordSelection,
  type MappingCreationOptions,
  type BatchMappingResult
} from './PremiumMappingEngine'

// Premium Modules Configuration
export {
  premiumModulesConfig,
  type PremiumModulesSetup,
  type DocumentGenerationOptions,
  type OptimizedModuleConfig
} from './PremiumModulesConfig'

// Version and investment info
export const PREMIUM_MODULES_INFO = {
  version: '1.0.0',
  totalInvestment: 1250, // €1,250
  modules: {
    html: { cost: 250, version: 'v3.61.0' },
    image: { cost: 250, version: 'v3.32.0' },  
    style: { cost: 500, version: 'v3.10.0' },
    xlsx: { cost: 250, version: 'v3.30.3' }
  },
  description: 'Professional document generation with Premium Modules intelligence'
} as const