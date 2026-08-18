import { describe, it, expect } from 'vitest';

describe('package.json', () => {
  it('should have required scripts', async () => {
    const pkg = await import('../package.json');
    expect(pkg.default.scripts).toHaveProperty('dev');
    expect(pkg.default.scripts).toHaveProperty('build');
    expect(pkg.default.scripts).toHaveProperty('typecheck');
    expect(pkg.default.scripts).toHaveProperty('test');
  });

  it('should declare three.js as dependency', async () => {
    const pkg = await import('../package.json');
    expect(pkg.default.dependencies).toHaveProperty('three');
  });
});

describe('tsconfig.json', () => {
  it('should have strict mode enabled', async () => {
    const tsconfig = await import('../tsconfig.json');
    expect(tsconfig.default.compilerOptions.strict).toBe(true);
  });

  it('should target ES2023', async () => {
    const tsconfig = await import('../tsconfig.json');
    expect(tsconfig.default.compilerOptions.target).toBe('ES2023');
  });
});
