import { describe, it, expect } from 'bun:test';
import { decodeTextBytes, parseCsvRows } from './importText.ts';

describe('decodeTextBytes', () => {
  it('decodes Windows-1252 CSV accents correctly', () => {
    const bytes = new Uint8Array([0x4a, 0x6f, 0x73, 0xe9, 0x20, 0x4e, 0xfa, 0xf1, 0x65, 0x7a]);
    expect(decodeTextBytes(bytes)).toBe('José Núñez');
  });
  it('keeps UTF-8 accents and strips BOM', () => {
    const bytes = new TextEncoder().encode('\uFEFFMaría Gómez');
    expect(decodeTextBytes(bytes)).toBe('María Gómez');
  });
});

describe('parseCsvRows', () => {
  it('detects semicolon delimiter and quoted fields', () => {
    expect(parseCsvRows('nombre;cedula\r\n"Peña, Ana";123\n')).toEqual([
      ['nombre', 'cedula'],
      ['Peña, Ana', '123'],
    ]);
  });
});
