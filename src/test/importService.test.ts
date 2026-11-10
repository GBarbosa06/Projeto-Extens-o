import { describe, it, expect } from 'vitest';
import {
  parseMonetaryOrNumeric,
  analyzeSpreadsheetData,
} from '../services/importService';
import type { Product, CustomField } from '../types';

describe('importService - Spreadsheet Analysis and Parsing', () => {
  describe('parseMonetaryOrNumeric', () => {
    it('parses brazilian formatted currency strings', () => {
      expect(parseMonetaryOrNumeric('R$ 29,90')).toBe(29.9);
      expect(parseMonetaryOrNumeric('1.250,50')).toBe(1250.5);
      expect(parseMonetaryOrNumeric('  15,00  ')).toBe(15);
    });

    it('parses standard float and integer strings or numbers', () => {
      expect(parseMonetaryOrNumeric(45.5)).toBe(45.5);
      expect(parseMonetaryOrNumeric('99.99')).toBe(99.99);
      expect(parseMonetaryOrNumeric(10)).toBe(10);
    });

    it('returns default fallback on invalid or empty values', () => {
      expect(parseMonetaryOrNumeric(null)).toBe(0);
      expect(parseMonetaryOrNumeric(undefined)).toBe(0);
      expect(parseMonetaryOrNumeric('')).toBe(0);
      expect(parseMonetaryOrNumeric('abc', 10)).toBe(10);
    });
  });

  describe('analyzeSpreadsheetData', () => {
    const existingProducts: Product[] = [
      {
        id: 'p-1',
        name: 'Vestido Floral',
        sku: 'VEST-01',
        salePrice: 120,
        quantity: 5,
        minQuantity: 1,
        customFieldValues: {},
        createdAt: '2026-11-09T00:00:00Z',
        updatedAt: '2026-11-09T00:00:00Z',
      },
      {
        id: 'p-2',
        name: 'Saia Midi',
        salePrice: 80,
        quantity: 3,
        minQuantity: 1,
        customFieldValues: {},
        createdAt: '2026-11-09T00:00:00Z',
        updatedAt: '2026-11-09T00:00:00Z',
      },
    ];

    const existingCustomFields: CustomField[] = [
      { id: 'field_tamanho', name: 'Tamanho', type: 'text' },
    ];

    it('identifies standard columns and extracts product data', () => {
      const rows = [
        {
          Produto: 'Calça Jeans',
          Código: 'CALC-99',
          Categoria: 'Vestuário',
          'Preço Venda': 'R$ 150,00',
          'Preço Custo': '70,00',
          Quantidade: '12',
          Mínimo: '2',
        },
      ];

      const result = analyzeSpreadsheetData(rows, existingProducts, existingCustomFields);

      expect(result.totalRows).toBe(1);
      expect(result.validCount).toBe(1);
      expect(result.items[0].name).toBe('Calça Jeans');
      expect(result.items[0].sku).toBe('CALC-99');
      expect(result.items[0].category).toBe('Vestuário');
      expect(result.items[0].salePrice).toBe(150);
      expect(result.items[0].costPrice).toBe(70);
      expect(result.items[0].quantity).toBe(12);
      expect(result.items[0].minQuantity).toBe(2);
      expect(result.items[0].isDuplicate).toBe(false);
    });

    it('detects unknown columns as new custom fields and maps values', () => {
      const rows = [
        {
          Nome: 'Camiseta Algodão',
          Preço: '45,00',
          Qtd: '20',
          Tamanho: 'G',
          Material: '100% Algodão',
          Cor: 'Azul Marinho',
        },
      ];

      const result = analyzeSpreadsheetData(rows, existingProducts, existingCustomFields);

      // 'Tamanho' is already in existingCustomFields, so it is mapped to customFieldValues without being in newCustomFields
      // 'Material' and 'Cor' are unknown, so they must be in newCustomFields
      expect(result.items[0].customFieldValues['field_tamanho']).toBe('G');
      expect(result.items[0].customFieldValues['Material']).toBe('100% Algodão');
      expect(result.items[0].customFieldValues['Cor']).toBe('Azul Marinho');

      const newFieldNames = result.newCustomFields.map((f) => f.name);
      expect(newFieldNames).toContain('Material');
      expect(newFieldNames).toContain('Cor');
      expect(newFieldNames).not.toContain('Tamanho');
      expect(result.newCustomFields.every((f) => f.selected === true)).toBe(true);
    });

    it('applies safe fallbacks and generates warnings for missing mandatory fields', () => {
      const rows = [
        {
          Categoria: 'Acessórios',
        },
      ];

      const result = analyzeSpreadsheetData(rows, existingProducts, existingCustomFields);

      expect(result.totalRows).toBe(1);
      expect(result.warningCount).toBe(1);
      expect(result.items[0].name).toContain('Produto sem nome');
      expect(result.items[0].salePrice).toBe(0);
      expect(result.items[0].quantity).toBe(0);
      expect(result.items[0].warnings.length).toBeGreaterThan(0);
    });

    it('detects duplicates by SKU and by Name', () => {
      const rows = [
        {
          Nome: 'Outro Nome',
          Código: 'VEST-01', // Batimento por SKU
          Preço: '130,00',
          Qtd: '10',
        },
        {
          Nome: 'Saia Midi', // Batimento por Nome (sem SKU)
          Preço: '85,00',
          Qtd: '5',
        },
      ];

      const result = analyzeSpreadsheetData(rows, existingProducts, existingCustomFields);

      expect(result.duplicateCount).toBe(2);
      expect(result.items[0].isDuplicate).toBe(true);
      expect(result.items[0].existingProductId).toBe('p-1');
      expect(result.items[0].previousQuantity).toBe(5);

      expect(result.items[1].isDuplicate).toBe(true);
      expect(result.items[1].existingProductId).toBe('p-2');
      expect(result.items[1].previousQuantity).toBe(3);
    });

    it('handles intra-file duplicates by consolidating quantities and warning', () => {
      const rows = [
        {
          Nome: 'Meia Cano Curto',
          Código: 'MEIA-01',
          Preço: '15,00',
          Qtd: '5',
        },
        {
          Nome: 'Meia Cano Curto',
          Código: 'MEIA-01',
          Preço: '15,00',
          Qtd: '10',
        },
      ];

      const result = analyzeSpreadsheetData(rows, existingProducts, existingCustomFields);

      expect(result.items.length).toBe(1);
      expect(result.items[0].quantity).toBe(15);
      expect(result.items[0].warnings).toContain('Linha consolidada: produto duplicado na própria planilha.');
    });
  });
});
