import React, { useState } from 'react';
import { CustomField, CustomFieldType, StoreSettings } from '../../types';
import { PRESET_SEGMENTS, saveStoreSettings } from '../../services/settingsService';
import { Store, Plus, Trash2, CheckCircle2, Layers, AlertCircle } from 'lucide-react';

interface SettingsViewProps {
  userId: string;
  settings: StoreSettings;
  onSettingsUpdated: (updated: StoreSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  userId,
  settings,
  onSettingsUpdated,
}) => {
  const [storeName, setStoreName] = useState(settings.storeName);
  const [activeSegment, setActiveSegment] = useState(settings.activeSegment);
  const [customFields, setCustomFields] = useState<CustomField[]>(settings.customFields || []);

  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleApplyPreset = (presetId: 'general' | 'clothing' | 'food' | 'custom') => {
    const preset = PRESET_SEGMENTS.find((p) => p.id === presetId);
    if (!preset) return;

    setActiveSegment(presetId);
    // Combine existing unique fields or replace with preset
    setCustomFields(preset.fields);
  };

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim()) return;

    const id = newFieldName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_');

    const options =
      newFieldType === 'select'
        ? newFieldOptions
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    const newField: CustomField = {
      id: `${id}_${Date.now()}`,
      name: newFieldName.trim(),
      type: newFieldType,
      options,
    };

    setCustomFields([...customFields, newField]);
    setNewFieldName('');
    setNewFieldOptions('');
    setActiveSegment('custom');
  };

  const handleRemoveField = (fieldId: string) => {
    setCustomFields(customFields.filter((f) => f.id !== fieldId));
    setActiveSegment('custom');
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage('');
    try {
      const updated: StoreSettings = {
        storeName: storeName.trim() || 'Minha Loja',
        currency: 'BRL',
        activeSegment,
        customFields,
      };

      await saveStoreSettings(userId, updated);
      onSettingsUpdated(updated);
      setSuccessMessage('Configurações salvas com sucesso!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      alert('Erro ao salvar configurações: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Store className="w-7 h-7 text-blue-600" />
          Configurações da Loja & Segmento
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Adapte o sistema para o ramo do seu negócio sem precisar alterar código.
        </p>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2 text-sm shadow-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Identificação */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">Nome do Estabelecimento</h3>
        <input
          type="text"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          placeholder="Ex: Ateliê da Yasmin, Mercadinho Central..."
          className="w-full max-w-md px-3.5 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {/* Presets de Segmento */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-800">
            Modelos Prontos por Segmento
          </h3>
        </div>
        <p className="text-sm text-slate-500">
          Escolha um modelo para pré-configurar os campos dos seus produtos:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PRESET_SEGMENTS.map((preset) => {
            const isSelected = activeSegment === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset.id)}
                className={`text-left p-4 rounded-xl border-2 transition ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="font-semibold text-slate-800 text-sm mb-1">
                  {preset.label}
                </div>
                <div className="text-xs text-slate-500 mb-3">{preset.description}</div>
                <div className="text-[11px] font-medium text-slate-400">
                  {preset.fields.length === 0
                    ? 'Apenas campos padrão'
                    : `+ ${preset.fields.map((f) => f.name).join(', ')}`}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Gerenciamento de Campos Dinâmicos */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">
            Campos Personalizados do Catálogo
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Estes campos extras aparecerão automaticamente nos formulários e nas listagens de produtos.
          </p>
        </div>

        {customFields.length === 0 ? (
          <div className="p-6 bg-slate-50 rounded-xl text-center text-sm text-slate-500 border border-dashed border-slate-200">
            Nenhum campo personalizado ativo. Seus produtos terão os campos universais (Nome, Preço, Quantidade, Mínimo).
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {customFields.map((field) => (
              <div
                key={field.id}
                className="p-4 flex items-center justify-between bg-white hover:bg-slate-50/50 transition"
              >
                <div>
                  <span className="font-medium text-slate-800 text-sm">{field.name}</span>
                  <span className="ml-2 inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-600">
                    {field.type}
                  </span>
                  {field.options && field.options.length > 0 && (
                    <span className="ml-2 text-xs text-slate-400">
                      ({field.options.join(', ')})
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveField(field.id)}
                  className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition"
                  title="Remover campo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Adicionar Novo Campo */}
        <form
          onSubmit={handleAddField}
          className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3"
        >
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Adicionar Novo Campo Personalizado
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              placeholder="Nome do campo (ex: Voltagem, Marca)"
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={newFieldType}
              onChange={(e) => setNewFieldType(e.target.value as CustomFieldType)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="text">Texto livre</option>
              <option value="number">Numérico</option>
              <option value="date">Data (ex: Validade)</option>
              <option value="select">Lista de Opções</option>
            </select>
            <button
              type="submit"
              disabled={!newFieldName.trim()}
              className="py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg text-sm flex items-center justify-center gap-1.5 disabled:opacity-50 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Adicionar Campo
            </button>
          </div>

          {newFieldType === 'select' && (
            <input
              type="text"
              value={newFieldOptions}
              onChange={(e) => setNewFieldOptions(e.target.value)}
              placeholder="Opções separadas por vírgula (ex: P, M, G, GG)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </form>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition shadow-sm disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar Alterações da Loja'}
          </button>
        </div>
      </div>
    </div>
  );
};
