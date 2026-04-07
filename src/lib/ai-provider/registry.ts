// =============================================================================
// MISE AI Provider Registry
// =============================================================================
// Maps provider names to their constructors.
// Requirements: 12.1, 12.4
// =============================================================================

import type { AIProvider } from './types';
import { ClaudeProvider } from './claude-provider';

// ---------------------------------------------------------------------------
// Provider constructor type
// ---------------------------------------------------------------------------

type ProviderConstructor = (apiKey: string, modelId?: string) => AIProvider;

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const providerRegistry: Record<string, ProviderConstructor> = {
  claude: (apiKey, modelId) => new ClaudeProvider(apiKey, modelId),
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getProviderConstructor(name: string): ProviderConstructor | undefined {
  return providerRegistry[name];
}

export function registerProvider(name: string, constructor: ProviderConstructor): void {
  providerRegistry[name] = constructor;
}

export function getRegisteredProviders(): string[] {
  return Object.keys(providerRegistry);
}
