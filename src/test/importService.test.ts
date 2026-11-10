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

    it('detects unknown columns as new custom fields and maps values by fieldId', () => {
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
      // 'Material' and 'Cor' are unknown, so they must be in newCustomFields and keyed by fieldId (e.g. field_material)
      expect(result.items[0].customFieldValues['field_tamanho']).toBe('G');
      expect(result.items[0].customFieldValues['field_material']).toBe('100% Algodão');
      expect(result.items[0].customFieldValues['field_cor']).toBe('Azul Marinho');

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

    it('consolidates intra-file duplicates when one row has SKU and another has only matching Name', () => {
      // Row 1 has SKU VEST-01, Row 2 has no SKU but same Name 'Vestido Floral'
      const rows = [
        {
          Nome: 'Vestido Floral',
          Código: 'VEST-01',
          Preço: '120,00',
          Qtd: '2',
        },
        {
          Nome: 'Vestido Floral',
          Preço: '120,00',
          Qtd: '3',
        },
      ];

      const result = analyzeSpreadsheetData(rows, existingProducts, existingCustomFields);

      expect(result.items.length).toBe(1);
      expect(result.items[0].quantity).toBe(5);
      expect(result.items[0].isDuplicate).toBe(true);
      expect(result.items[0].existingProductId).toBe('p-1');
    });
  });

  describe('parseSpreadsheet', () => {
    it('correctly reads CSV buffer with Brazilian decimal comma and semicolons without multiplying by 100', async () => {
      const { parseSpreadsheet } = await import('../services/importService');
      const csvContent = 'Produto;Preço;Quantidade\nCalça Jeans;120,50;10\n';
      const encoder = new TextEncoder();
      const buffer = encoder.encode(csvContent).buffer;

      const rows = await parseSpreadsheet(buffer);
      expect(rows.length).toBe(1);
      expect(rows[0]['Produto']).toBe('Calça Jeans');

      const analysis = analyzeSpreadsheetData(rows, [], []);
      expect(analysis.items[0].salePrice).toBe(120.5);
      expect(analysis.items[0].quantity).toBe(10);
    });
  });

  describe('executeImportBatch batch builder and persistence', () => {
    it('generates correct operations for new and duplicate products', async () => {
      const { generateImportOperations } = await import('../services/importService');

      const analysis = {
        items: [
          {
            name: 'Produto Novo 1',
            salePrice: 50,
            quantity: 10,
            minQuantity: 0,
            customFieldValues: {},
            warnings: [],
            isDuplicate: false,
          },
          {
            name: 'Produto Zerado',
            salePrice: 20,
            quantity: 0,
            minQuantity: 0,
            customFieldValues: {},
            warnings: [],
            isDuplicate: false,
          },
          {
            name: 'Produto Existente',
            isDuplicate: true,
            existingProductId: 'p-1',
            previousQuantity: 5,
            quantity: 8,
            salePrice: 60,
            minQuantity: 0,
            customFieldValues: {},
            warnings: [],
          },
        ],
        newCustomFields: [
          { id: 'field_material', name: 'Material', selected: true },
        ],
        totalRows: 3,
        validCount: 3,
        warningCount: 0,
        duplicateCount: 1,
      };

      const ops = generateImportOperations('user-123', analysis, 'sum', analysis.newCustomFields);

      // Total operations:
      // 1. Settings update for new custom fields (1 op)
      // 2. Produto Novo 1: 1 set product + 1 movement (quantity > 0) -> 2 ops
      // 3. Produto Zerado: 1 set product + 0 movement (quantity = 0) -> 1 op
      // 4. Produto Existente (sum): 1 update product + 1 movement (delta 8) -> 2 ops
      // Total = 6 operations
      expect(ops.length).toBe(6);
      expect(ops.some((op) => op.type === 'settings')).toBe(true);

      const movements = ops.filter((op) => op.type === 'movement');
      expect(movements.length).toBe(2);
      expect(movements[0].data.quantity).toBe(10);
      expect(movements[1].data.quantity).toBe(8);
    });

    it('generates correct delta movements on overwrite duplicate strategy', async () => {
      const { generateImportOperations } = await import('../services/importService');

      const analysis = {
        items: [
          {
            name: 'Produto Existente Reduzido',
            isDuplicate: true,
            existingProductId: 'p-2',
            previousQuantity: 10,
            quantity: 6, // Reduziu 4 unidades
            salePrice: 60,
            minQuantity: 0,
            customFieldValues: {},
            warnings: [],
          },
        ],
        newCustomFields: [],
        totalRows: 1,
        validCount: 1,
        warningCount: 0,
        duplicateCount: 1,
      };

      const ops = generateImportOperations('user-123', analysis, 'overwrite', []);

      const movement = ops.find((op) => op.type === 'movement');
      expect(movement).toBeDefined();
      expect(movement?.data.type).toBe('OUT');
      expect(movement?.data.quantity).toBe(4);
      expect(movement?.data.reason).toBe('ADJUSTMENT');
    });

    it('filters out unselected custom fields from product customFieldValues', async () => {
      const { generateImportOperations } = await import('../services/importService');

      const analysis = {
        items: [
          {
            name: 'Produto Com Campos Extras',
            salePrice: 100,
            quantity: 5,
            minQuantity: 0,
            customFieldValues: {
              field_material: 'Couro Legítimo',
              field_obs: 'Observação Interna Descartada',
            },
            warnings: [],
            isDuplicate: false,
          },
        ],
        newCustomFields: [
          { id: 'field_material', name: 'Material', selected: true },
          { id: 'field_obs', name: 'Observação', selected: false }, // Usuário desmarcou
        ],
        totalRows: 1,
        validCount: 1,
        warningCount: 0,
        duplicateCount: 0,
      };

      const ops = generateImportOperations('user-123', analysis, 'sum', analysis.newCustomFields, {
        storeName: 'Loja',
        currency: 'BRL',
        activeSegment: 'general',
        customFields: [],
      });

      const productOp = ops.find((op) => op.type === 'product_set');
      expect(productOp).toBeDefined();
      expect(productOp?.data.customFieldValues.field_material).toBe('Couro Legítimo');
      expect(productOp?.data.customFieldValues.field_obs).toBeUndefined();
    });
  });
});
