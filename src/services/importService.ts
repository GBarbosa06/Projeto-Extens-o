import * as XLSX from 'xlsx';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  Product,
  CustomField,
  ImportParsedItem,
  DetectedCustomField,
  ImportAnalysisResult,
  DuplicateStrategy,
  StoreSettings,
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
    let sku = '';
    let category = '';
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

    const trimmedSku = sku.trim();
    const trimmedName = name.trim();

    if (trimmedSku && productBySku.has(trimmedSku.toLowerCase())) {
      const match = productBySku.get(trimmedSku.toLowerCase())!;
      isDuplicate = true;
      existingProductId = match.id;
      previousQuantity = match.quantity;
    } else if (trimmedName && productByName.has(trimmedName.toLowerCase())) {
      const match = productByName.get(trimmedName.toLowerCase())!;
      isDuplicate = true;
      existingProductId = match.id;
      previousQuantity = match.quantity;
    }

    // Identificação de duplicados dentro do próprio arquivo
    const intraFileKey = trimmedSku ? `sku:${trimmedSku.toLowerCase()}` : `name:${trimmedName.toLowerCase()}`;
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
      ...(trimmedSku ? { sku: trimmedSku } : {}),
      ...(category ? { category } : {}),
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

export interface ImportOperation {
  type: 'settings' | 'product_set' | 'product_update' | 'movement';
  refPath: string;
  data: any;
}

/**
 * Constrói a lista estruturada de operações para gravação no Firestore
 */
export function generateImportOperations(
  userId: string,
  analysis: ImportAnalysisResult,
  duplicateStrategy: DuplicateStrategy,
  selectedNewFields: DetectedCustomField[],
  currentSettings?: StoreSettings
): ImportOperation[] {
  const operations: ImportOperation[] = [];
  const now = new Date().toISOString();

  // 1. Atualização de StoreSettings se novos campos foram aprovados
  const approvedFields = selectedNewFields.filter((f) => f.selected);
  if (approvedFields.length > 0 && currentSettings) {
    const existingFieldIds = new Set(currentSettings.customFields.map((f) => f.id));
    const fieldsToAdd: CustomField[] = approvedFields
      .filter((f) => !existingFieldIds.has(f.id))
      .map((f) => ({
        id: f.id,
        name: f.name,
        type: 'text',
      }));

    if (fieldsToAdd.length > 0) {
      operations.push({
        type: 'settings',
        refPath: `users/${userId}/settings/general`,
        data: {
          ...currentSettings,
          customFields: [...currentSettings.customFields, ...fieldsToAdd],
        },
      });
    }
  } else if (approvedFields.length > 0) {
    // Se settings não foram passadas, cria operação parcial
    operations.push({
      type: 'settings',
      refPath: `users/${userId}/settings/general`,
      data: {
        customFields: approvedFields.map((f) => ({
          id: f.id,
          name: f.name,
          type: 'text',
        })),
      },
    });
  }

  // 2. Operações de produtos e movimentações
  analysis.items.forEach((item, index) => {
    if (item.isDuplicate && item.existingProductId) {
      const prevQty = item.previousQuantity ?? 0;
      let newQty = item.quantity;
      let delta = 0;

      if (duplicateStrategy === 'sum') {
        newQty = prevQty + item.quantity;
        delta = item.quantity;
      } else {
        newQty = item.quantity;
        delta = newQty - prevQty;
      }

      operations.push({
        type: 'product_update',
        refPath: `users/${userId}/products/${item.existingProductId}`,
        data: {
          quantity: newQty,
          salePrice: item.salePrice,
          updatedAt: now,
          ...(item.costPrice !== undefined ? { costPrice: item.costPrice } : {}),
          ...(item.category ? { category: item.category } : {}),
          ...(item.sku ? { sku: item.sku } : {}),
          ...(Object.keys(item.customFieldValues).length > 0
            ? { customFieldValues: item.customFieldValues }
            : {}),
        },
      });

      // Movimentação decorrente de duplicado
      if (duplicateStrategy === 'sum' && delta > 0) {
        operations.push({
          type: 'movement',
          refPath: `users/${userId}/movements/mov_dup_${item.existingProductId}_${index}`,
          data: {
            productId: item.existingProductId,
            productName: item.name,
            type: 'IN',
            quantity: delta,
            reason: 'REPLENISHMENT',
            notes: 'Importação de planilha (adição de saldo)',
            previousQuantity: prevQty,
            newQuantity: newQty,
            createdAt: now,
          },
        });
      } else if (duplicateStrategy === 'overwrite' && delta !== 0) {
        const movType = delta > 0 ? 'IN' : 'OUT';
        operations.push({
          type: 'movement',
          refPath: `users/${userId}/movements/mov_dup_${item.existingProductId}_${index}`,
          data: {
            productId: item.existingProductId,
            productName: item.name,
            type: movType,
            quantity: Math.abs(delta),
            reason: 'ADJUSTMENT',
            notes: 'Importação de planilha (ajuste de saldo)',
            previousQuantity: prevQty,
            newQuantity: newQty,
            createdAt: now,
          },
        });
      }
    } else {
      // Novo produto
      const newProductId = `prod_imp_${Date.now()}_${index}`;
      operations.push({
        type: 'product_set',
        refPath: `users/${userId}/products/${newProductId}`,
        data: {
          id: newProductId,
          name: item.name,
          sku: item.sku || '',
          category: item.category || 'Geral',
          costPrice: item.costPrice || 0,
          salePrice: item.salePrice,
          quantity: item.quantity,
          minQuantity: item.minQuantity,
          customFieldValues: item.customFieldValues,
          createdAt: now,
          updatedAt: now,
        },
      });

      if (item.quantity > 0) {
        operations.push({
          type: 'movement',
          refPath: `users/${userId}/movements/mov_${newProductId}`,
          data: {
            productId: newProductId,
            productName: item.name,
            type: 'IN',
            quantity: item.quantity,
            reason: 'ADJUSTMENT',
            notes: 'Carga inicial via importação de planilha',
            previousQuantity: 0,
            newQuantity: item.quantity,
            createdAt: now,
          },
        });
      }
    }
  });

  return operations;
}

/**
 * Executa a gravação em lotes protegidos de até 200 operações no Firestore
 */
export async function executeImportBatch(
  userId: string,
  analysis: ImportAnalysisResult,
  duplicateStrategy: DuplicateStrategy,
  selectedNewFields: DetectedCustomField[],
  currentSettings?: StoreSettings
): Promise<{ importedCount: number }> {
  const operations = generateImportOperations(
    userId,
    analysis,
    duplicateStrategy,
    selectedNewFields,
    currentSettings
  );

  const CHUNK_SIZE = 200;
  for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
    const chunk = operations.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    chunk.forEach((op) => {
      const parts = op.refPath.split('/');
      const targetDocRef = doc(db, parts[0], parts[1], parts[2], parts[3]);

      if (op.type === 'settings' || op.type === 'product_set' || op.type === 'movement') {
        batch.set(targetDocRef, op.data, { merge: true });
      } else if (op.type === 'product_update') {
        batch.update(targetDocRef, op.data);
      }
    });

    await batch.commit();
  }

  return { importedCount: analysis.items.length };
}

