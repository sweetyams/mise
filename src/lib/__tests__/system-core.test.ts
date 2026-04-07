import { describe, it, expect } from 'vitest';
import { getSystemCore, verifySystemCore, isSystemCoreVerified } from '@/lib/system-core';
import type { PromptLayer } from '@/lib/types/recipe';

describe('system-core', () => {
  it('returns a PromptLayer with non-empty text', () => {
    const core = getSystemCore();
    expect(core.text).toBeTruthy();
    expect(core.text.length).toBeGreaterThan(0);
  });

  it('has version 1', () => {
    const core = getSystemCore();
    expect(core.version).toBe(1);
  });

  it('has a positive token count', () => {
    const core = getSystemCore();
    expect(core.tokenCount).toBeGreaterThan(0);
  });

  it('is frozen (immutable)', () => {
    const core = getSystemCore();
    expect(Object.isFrozen(core)).toBe(true);
  });

  it('returns the same object on repeated calls', () => {
    const a = getSystemCore();
    const b = getSystemCore();
    expect(a).toBe(b);
  });

  it('encodes weights in grams and ml', () => {
    const core = getSystemCore();
    expect(core.text).toContain('grams');
    expect(core.text).toContain('ml');
  });

  it('encodes temperatures in Celsius', () => {
    const core = getSystemCore();
    expect(core.text).toContain('Celsius');
  });

  it('requires technique reasons', () => {
    const core = getSystemCore();
    expect(core.text).toContain('technique reason');
  });

  it('specifies seasoning at every stage', () => {
    const core = getSystemCore();
    expect(core.text.toLowerCase()).toContain('seasoning');
    expect(core.text.toLowerCase()).toContain('every stage');
  });

  it('defines acid moment, fat decision, and textural contrast', () => {
    const core = getSystemCore();
    expect(core.text.toLowerCase()).toContain('acid');
    expect(core.text.toLowerCase()).toContain('fat');
    expect(core.text.toLowerCase()).toContain('textural contrast');
  });

  it('requires structured JSON output', () => {
    const core = getSystemCore();
    expect(core.text).toContain('JSON');
  });

  it('includes thinking section references', () => {
    const core = getSystemCore();
    expect(core.text.toLowerCase()).toContain('approach');
    expect(core.text.toLowerCase()).toContain('architecture');
    expect(core.text.toLowerCase()).toContain('pattern');
  });

  it('references component-based structure', () => {
    const core = getSystemCore();
    expect(core.text.toLowerCase()).toContain('component');
  });

  it('verifySystemCore returns true', () => {
    expect(verifySystemCore()).toBe(true);
  });

  it('isSystemCoreVerified returns true after import', () => {
    expect(isSystemCoreVerified()).toBe(true);
  });

  it('satisfies the PromptLayer interface', () => {
    const core: PromptLayer = getSystemCore();
    expect(core).toHaveProperty('text');
    expect(core).toHaveProperty('version');
    expect(core).toHaveProperty('tokenCount');
  });
});
