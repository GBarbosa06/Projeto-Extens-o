import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  X,
  Layers,
  ArrowRight,
  ArrowLeft,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import type {
  Product,
  StoreSettings,
  DuplicateStrategy,
  DetectedCustomField,
  ImportAnalysisResult,
} from '../../types';
import {
  parseSpreadsheet,
  analyzeSpreadsheetData,
  executeImportBatch,
} from '../../services/importService';
import { useAuth } from '../../contexts/AuthContext';

export interface ImportProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingProducts: Product[];
  settings: StoreSettings;
  onSettingsUpdated?: (newSettings: StoreSettings) => void;
}

export const ImportProductsModal: React.FC<ImportProductsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingProducts,
  settings,
  onSettingsUpdated,
}) => {
  const { currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<ImportAnalysisResult | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>('sum');
  const [newFields, setNewFields] = useState<DetectedCustomField[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const handleReset = () => {
    setStep('upload');
    setSelectedFile(null);
    setAnalysis(null);
    setDuplicateStrategy('sum');
    setNewFields([]);
    setErrorMsg(null);
    setIsDragging(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const processFile = async (file: File) => {
    try {
      setErrorMsg(null);
      setSelectedFile(file);
      const rawRows = await parseSpreadsheet(file);

      if (rawRows.length === 0) {
        setErrorMsg('Nenhuma linha de dados encontrada na planilha selecionada.');
        return;
      }

      const analyzed = analyzeSpreadsheetData(
        rawRows,
        existingProducts,
        settings.customFields
      );

      setAnalysis(analyzed);
      setNewFields(analyzed.newCustomFields);
      setStep('preview');
    } catch (err: any) {
      console.error('Erro ao processar planilha:', err);
      setErrorMsg(
        'Falha ao ler o arquivo. Certifique-se de que é uma planilha válida (.csv, .xls ou .xlsx).'
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const toggleFieldSelection = (fieldId: string) => {
    setNewFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, selected: !f.selected } : f))
    );
  };

  const handleConfirmImport = async () => {
    if (!analysis || !currentUser) return;

    try {
      setStep('importing');
      setErrorMsg(null);

      await executeImportBatch(
        currentUser.uid,
        analysis,
        duplicateStrategy,
        newFields,
        settings
      );

      // Notifica atualização de campos de loja se novos campos foram criados
      const approvedFields = newFields.filter((f) => f.selected);
      if (approvedFields.length > 0 && onSettingsUpdated) {
        const addedCustomFields = approvedFields.map((f) => ({
          id: f.id,
          name: f.name,
          type: 'text' as const,
        }));
        onSettingsUpdated({
          ...settings,
          customFields: [...settings.customFields, ...addedCustomFields],
        });
      }

      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Erro ao salvar importação:', err);
      setErrorMsg('Ocorreu um erro ao gravar os dados. Tente novamente.');
      setStep('preview');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Importar Produtos via Planilha
              </h2>
              <p className="text-xs text-gray-500">
                {step === 'upload' && 'Carregue arquivos CSV, XLS ou XLSX de forma simples e rápida'}
                {step === 'preview' && (selectedFile ? `Arquivo: ${selectedFile.name} — Pré-visualização e Confirmação de Segurança` : 'Pré-visualização e Confirmação de Segurança')}
                {step === 'importing' && 'Gravando produtos e atualizando estoque...'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mensagem de Erro */}
        {errorMsg && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Corpo do Modal */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 'upload' && (
            <div className="space-y-6">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/50'
                    : 'border-gray-200 bg-gray-50/50 hover:border-blue-400 hover:bg-gray-50'
                }`}
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
                  <UploadCloud className="h-7 w-7 text-blue-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">
                  Arraste sua planilha ou clique para selecionar
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Suporta arquivos .CSV, .XLS ou .XLSX
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* Dicas Pedagógicas */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-900">
                  <HelpCircle className="h-4 w-4" />
                  Como o sistema organiza sua planilha:
                </h4>
                <ul className="mt-2 space-y-1.5 text-xs text-blue-800">
                  <li>
                    • <strong>Colunas padrão reconhecidas:</strong> Nome/Produto, Preço de Venda, Quantidade/Estoque, Código/SKU e Categoria.
                  </li>
                  <li>
                    • <strong>Colunas específicas (ex: Material, Tamanho):</strong> Serão identificadas automaticamente e você poderá adicioná-las como campos personalizados da sua loja.
                  </li>
                  <li>
                    • <strong>Tolerância a faltas:</strong> Se faltar nome ou preço em alguma linha, atribuímos um valor genérico para não travar sua importação.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {step === 'preview' && analysis && (
            <div className="space-y-6">
              {/* Cards de Resumo */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <span className="text-xs text-gray-500">Total Encontrado</span>
                  <div className="text-xl font-bold text-gray-900">
                    {analysis.totalRows} itens
                  </div>
                </div>
                <div className="rounded-xl border border-green-100 bg-green-50/60 p-3">
                  <span className="text-xs text-green-700">Completos</span>
                  <div className="text-xl font-bold text-green-800">
                    {analysis.validCount} itens
                  </div>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                  <span className="text-xs text-amber-700">Com Avisos / Padrões</span>
                  <div className="text-xl font-bold text-amber-800">
                    {analysis.warningCount} itens
                  </div>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                  <span className="text-xs text-blue-700">Duplicados na Loja</span>
                  <div className="text-xl font-bold text-blue-800">
                    {analysis.duplicateCount} itens
                  </div>
                </div>
              </div>

              {/* Opção para Produtos Duplicados */}
              {analysis.duplicateCount > 0 && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                  <span className="text-xs font-bold text-blue-900">
                    Produtos já existentes no estoque ({analysis.duplicateCount} itens):
                  </span>
                  <p className="mt-0.5 text-xs text-blue-700">
                    Como deseja tratar o estoque desses produtos já cadastrados?
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                      <input
                        type="radio"
                        name="duplicateStrategy"
                        value="sum"
                        checked={duplicateStrategy === 'sum'}
                        onChange={() => setDuplicateStrategy('sum')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Somar ao estoque atual</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                      <input
                        type="radio"
                        name="duplicateStrategy"
                        value="overwrite"
                        checked={duplicateStrategy === 'overwrite'}
                        onChange={() => setDuplicateStrategy('overwrite')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Substituir saldo pelo da planilha</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Seção de Novos Campos Customizados */}
              {newFields.length > 0 && (
                <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-900">
                    <Layers className="h-4 w-4" />
                    Novas Colunas Encontradas (Campos Customizados):
                  </div>
                  <p className="mt-1 text-xs text-purple-700">
                    Marque as colunas que você deseja adicionar permanentemente aos atributos dos produtos da sua loja:
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {newFields.map((field) => (
                      <label
                        key={field.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                          field.selected
                            ? 'border-purple-300 bg-white text-purple-900 shadow-sm'
                            : 'border-transparent bg-purple-100/50 text-purple-400 line-through'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={field.selected}
                          onChange={() => toggleFieldSelection(field.id)}
                          className="h-3.5 w-3.5 rounded text-purple-600 focus:ring-purple-500"
                        />
                        <span>{field.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabela de Pré-visualização */}
              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-600">
                  Amostra dos Dados Tratados ({analysis.items.length} itens)
                </h4>
                <div className="max-h-56 overflow-auto rounded-xl border border-gray-200">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Produto</th>
                        <th className="px-3 py-2 font-semibold">Código / SKU</th>
                        <th className="px-3 py-2 font-semibold">Qtd</th>
                        <th className="px-3 py-2 font-semibold">Preço Venda</th>
                        <th className="px-3 py-2 font-semibold">Status / Avisos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {analysis.items.slice(0, 50).map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900">
                            {item.name}
                            {item.category && (
                              <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                                {item.category}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-gray-500">
                            {item.sku || '-'}
                          </td>
                          <td className="px-3 py-2 font-semibold text-gray-900">
                            {item.quantity}
                          </td>
                          <td className="px-3 py-2 text-gray-700">
                            R$ {item.salePrice.toFixed(2)}
                          </td>
                          <td className="px-3 py-2">
                            {item.isDuplicate && (
                              <span className="mr-1 inline-block rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
                                Já na loja
                              </span>
                            )}
                            {item.warnings.length > 0 && (
                              <span
                                title={item.warnings.join(' | ')}
                                className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800"
                              >
                                <AlertTriangle className="h-3 w-3" />
                                {item.warnings[0]}
                              </span>
                            )}
                            {!item.isDuplicate && item.warnings.length === 0 && (
                              <span className="inline-flex items-center gap-1 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-800">
                                <CheckCircle2 className="h-3 w-3" />
                                Pronto
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {analysis.items.length > 50 && (
                  <p className="mt-1 text-center text-[11px] text-gray-400">
                    Exibindo os primeiros 50 itens da planilha. Todos os {analysis.items.length} itens serão importados.
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              <h3 className="mt-4 text-base font-semibold text-gray-900">
                Processando importação...
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Criando produtos, aplicando regras de estoque e registrando movimentações no Firestore.
              </p>
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4 rounded-b-2xl">
          {step === 'preview' ? (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Escolher outro arquivo
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:ring-4 focus:ring-blue-100"
              >
                Confirmar Importação ({analysis?.items.length || 0} produtos)
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="ml-auto">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
