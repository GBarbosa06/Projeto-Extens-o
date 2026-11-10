import * as XLSX from 'xlsx';
import type {
  Product,
  CustomField,
  ImportParsedItem,
  DetectedCustomField,
  ImportAnalysisResult,
  DuplicateStrategy,
} from '../types';

/**
 * Normaliza valores monetários e numéricos (ex: 'R$ 1.250,50' ou '15,00' -> 1250.5 e 15.0)
 */
export function parseMonetaryOrNumeric(val: any, fallback = 0): number {
  if (val === null || val === undefined || val === '') {
    return fallback;
  }
  if (typeof val === 'number') {
    return isNaN(val) ? fallback : val;
  }
  if (typeof val !== 'string') {
    return fallback;
  }

  // Remove caracteres comuns de moeda e espaços extras
  const clean = val.replace(/R\$/gi, '').replace(/\s+/g, '').trim();
  if (!clean) return fallback;

  // Formato brasileiro: 1.250,50 -> 1250.50
  if (clean.includes(',') && clean.includes('.')) {
    const formatted = clean.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(formatted);
    return isNaN(num) ? fallback : num;
  }

  // Apenas vírgula: 15,00 -> 15.00
  if (clean.includes(',')) {
    const formatted = clean.replace(',', '.');
    const num = parseFloat(formatted);
    return isNaN(num) ? fallback : num;
  }

  // Apenas número normal ou ponto
  const num = parseFloat(clean);
  return isNaN(num) ? fallback : num;
}

/**
 * Lê um arquivo File ou ArrayBuffer nos formatos CSV, XLS ou XLSX e retorna linhas brutas como objetos
 */
export async function parseSpreadsheet(
  file: File | ArrayBuffer
): Promise<Record<string, any>[]> {
  const data =
    file instanceof File
      ? await file.arrayBuffer()
      : file;

  const workbook = XLSX.read(data, {
    type: 'array',
    raw: false,
    codepage: 65001, // UTF-8
  });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return [];
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: '',
    blankrows: false,
  });

  return rawRows;
}

const HEADER_SYNONYMS: Record<string, keyof Product> = {
  nome: 'name',
  produto: 'name',
  descricao: 'name',
  descrição: 'name',
  item: 'name',
  titulo: 'name',
  título: 'name',

  preco: 'salePrice',
  preço: 'salePrice',
  'preco de venda': 'salePrice',
  'preço de venda': 'salePrice',
  'preco venda': 'salePrice',
  'preço venda': 'salePrice',
  valor: 'salePrice',
  'valor unitario': 'salePrice',
  'valor unitário': 'salePrice',
  venda: 'salePrice',

  quantidade: 'quantity',
  qtd: 'quantity',
  estoque: 'quantity',
  saldo: 'quantity',
  unidades: 'quantity',

  custo: 'costPrice',
  'preco custo': 'costPrice',
  'preço custo': 'costPrice',
  'preco de custo': 'costPrice',
  'preço de custo': 'costPrice',
  'valor de custo': 'costPrice',
  'valor custo': 'costPrice',

  sku: 'sku',
  codigo: 'sku',
  código: 'sku',
  ref: 'sku',
  referencia: 'sku',
  referência: 'sku',
  cod: 'sku',
  cód: 'sku',

  categoria: 'category',
  departamento: 'category',
  secao: 'category',
  seção: 'category',
  grupo: 'category',

  minimo: 'minQuantity',
  mínimo: 'minQuantity',
  'estoque minimo': 'minQuantity',
  'estoque mínimo': 'minQuantity',
  'qtd minima': 'minQuantity',
  'qtd mínima': 'minQuantity',
};

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Analisa os dados da planilha contra produtos existentes e campos da loja
 */
export function analyzeSpreadsheetData(
  rows: Record<string, any>[],
  existingProducts: Product[],
  existingCustomFields: CustomField[]
): ImportAnalysisResult {
  const items: ImportParsedItem[] = [];
  const detectedNewFieldsMap = new Map<string, DetectedCustomField>();

  // Mapas para busca rápida de duplicados
  const productBySku = new Map<string, Product>();
  const productByName = new Map<string, Product>();

  existingProducts.forEach((p) => {
    if (p.sku && p.sku.trim()) {
      productBySku.set(p.sku.trim().toLowerCase(), p);
    }
    if (p.name && p.name.trim()) {
      productByName.set(p.name.trim().toLowerCase(), p);
    }
  });

  // Mapa de campos customizados existentes por nome normalizado
  const existingCustomFieldMap = new Map<string, CustomField>();
  existingCustomFields.forEach((f) => {
    existingCustomFieldMap.set(normalizeHeader(f.name), f);
  });

  // Mapa para detecção de duplicados intra-arquivo (mesma planilha)
  const intraFileMap = new Map<string, number>();

  rows.forEach((rawRow, index) => {
    const rawKeys = Object.keys(rawRow);
    if (rawKeys.length === 0) return;

    let name = '';
    let sku: string | undefined = undefined;
    let category: string | undefined = undefined;
    let costPrice: number | undefined = undefined;
    let salePrice: number | undefined = undefined;
    let quantity: number | undefined = undefined;
    let minQuantity = 0;
    const customFieldValues: Record<string, any> = {};
    const warnings: string[] = [];

    rawKeys.forEach((key) => {
      const val = rawRow[key];
      const normKey = normalizeHeader(key);
      const mappedStandardField = HEADER_SYNONYMS[normKey];

      if (mappedStandardField) {
        switch (mappedStandardField) {
          case 'name':
            name = String(val || '').trim();
            break;
          case 'sku':
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              sku = String(val).trim();
            }
            break;
          case 'category':
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              category = String(val).trim();
            }
            break;
          case 'salePrice':
            salePrice = parseMonetaryOrNumeric(val, 0);
            break;
          case 'costPrice':
            costPrice = parseMonetaryOrNumeric(val, 0);
            break;
          case 'quantity':
            quantity = parseMonetaryOrNumeric(val, 0);
            break;
          case 'minQuantity':
            minQuantity = parseMonetaryOrNumeric(val, 0);
            break;
        }
      } else {
        // Coluna extra / customizada
        const existingField = existingCustomFieldMap.get(normKey);
        if (existingField) {
          customFieldValues[existingField.id] = val;
        } else {
          // Novo campo customizado potencial
          const fieldName = key.trim();
          const fieldId = `field_${normKey.replace(/[^a-z0-9]/g, '_')}`;
          customFieldValues[fieldName] = val;

          if (!detectedNewFieldsMap.has(fieldId)) {
            detectedNewFieldsMap.set(fieldId, {
              id: fieldId,
              name: fieldName,
              selected: true,
            });
          }
        }
      }
    });

    // Fallbacks para campos obrigatórios
    if (!name) {
      name = `Produto sem nome (Linha ${index + 1})`;
      warnings.push('Nome do produto ausente; preenchido com valor genérico.');
    }
    if (salePrice === undefined) {
      salePrice = 0;
      warnings.push('Preço de venda ausente; definido como R$ 0,00.');
    }
    if (quantity === undefined) {
      quantity = 0;
      warnings.push('Quantidade em estoque ausente; definida como 0.');
    }

    // Identificação de duplicados no banco
    let isDuplicate = false;
    let existingProductId: string | undefined = undefined;
    let previousQuantity: number | undefined = undefined;

    if (sku && productBySku.has(sku.toLowerCase())) {
      const match = productBySku.get(sku.toLowerCase())!;
      isDuplicate = true;
      existingProductId = match.id;
      previousQuantity = match.quantity;
    } else if (name && productByName.has(name.toLowerCase())) {
      const match = productByName.get(name.toLowerCase())!;
      isDuplicate = true;
      existingProductId = match.id;
      previousQuantity = match.quantity;
    }

    // Identificação de duplicados dentro do próprio arquivo
    const intraFileKey = (sku ? `sku:${sku.toLowerCase()}` : `name:${name.toLowerCase()}`);
    if (intraFileMap.has(intraFileKey)) {
      const existingItemIndex = intraFileMap.get(intraFileKey)!;
      const prevItem = items[existingItemIndex];
      prevItem.quantity += quantity;
      if (!prevItem.warnings.includes('Linha consolidada: produto duplicado na própria planilha.')) {
        prevItem.warnings.push('Linha consolidada: produto duplicado na própria planilha.');
      }
      return;
    } else {
      intraFileMap.set(intraFileKey, items.length);
    }

    items.push({
      name,
      sku,
      category,
      costPrice,
      salePrice,
      quantity,
      minQuantity,
      customFieldValues,
      warnings,
      isDuplicate,
      existingProductId,
      previousQuantity,
    });
  });

  const duplicateCount = items.filter((i) => i.isDuplicate).length;
  const warningCount = items.filter((i) => i.warnings.length > 0).length;
  const validCount = items.length - warningCount;

  return {
    items,
    newCustomFields: Array.from(detectedNewFieldsMap.values()),
    totalRows: rows.length,
    validCount,
    warningCount,
    duplicateCount,
  };
}
