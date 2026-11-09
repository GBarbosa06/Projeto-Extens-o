import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { CustomField, DEFAULT_STORE_SETTINGS, StoreSettings } from '../types';

export interface SegmentPreset {
  id: 'general' | 'clothing' | 'food' | 'custom';
  label: string;
  description: string;
  fields: CustomField[];
}

export const PRESET_SEGMENTS: SegmentPreset[] = [
  {
    id: 'general',
    label: 'Varejo / Geral',
    description: 'Campos universais básicos para comércio, revenda e pequenos serviços.',
    fields: [],
  },
  {
    id: 'clothing',
    label: 'Moda & Vestuário',
    description: 'Inclui campos essenciais para roupas, sapatos e acessórios (Tamanho, Cor, Material).',
    fields: [
      { id: 'tamanho', name: 'Tamanho', type: 'select', options: ['PP', 'P', 'M', 'G', 'GG', 'XG', 'Único'] },
      { id: 'cor', name: 'Cor', type: 'text' },
      { id: 'material', name: 'Material / Tecido', type: 'text' },
    ],
  },
  {
    id: 'food',
    label: 'Alimentos & Bebidas',
    description: 'Campos essenciais para controle sanitário e validade (Validade, Lote, Unidade).',
    fields: [
      { id: 'validade', name: 'Validade', type: 'date', required: true },
      { id: 'lote', name: 'Lote', type: 'text' },
      { id: 'unidadeMedida', name: 'Unidade de Medida', type: 'select', options: ['Unidade', 'Kg', 'Gramas', 'Litro', 'ml'] },
    ],
  },
];

export const sanitizeCustomFieldValue = (field: CustomField, value: any): any => {
  if (value === undefined || value === null) return '';

  if (field.type === 'number') {
    const parsed = parseFloat(String(value).replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  }

  if (field.type === 'text' || field.type === 'select' || field.type === 'date') {
    return String(value).trim();
  }

  return value;
};

export const getStoreSettings = async (userId: string): Promise<StoreSettings> => {
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'general');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { ...DEFAULT_STORE_SETTINGS, ...docSnap.data() } as StoreSettings;
    }
  } catch (error) {
    console.warn('Erro ao carregar configurações do Firestore, utilizando padrões:', error);
  }

  return DEFAULT_STORE_SETTINGS;
};

export const saveStoreSettings = async (
  userId: string,
  settings: StoreSettings
): Promise<void> => {
  const docRef = doc(db, 'users', userId, 'settings', 'general');
  await setDoc(docRef, settings, { merge: true });
};
