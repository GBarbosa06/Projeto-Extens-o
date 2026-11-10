import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportProductsModal } from '../components/products/ImportProductsModal';
import { DEFAULT_STORE_SETTINGS, Product } from '../types';
import * as importService from '../services/importService';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'user-test-123', email: 'yasmin@teste.com' },
  }),
}));

describe('ImportProductsModal', () => {
  const mockProducts: Product[] = [
    {
      id: 'p-1',
      name: 'Bolsa de Couro',
      sku: 'BOL-01',
      salePrice: 150,
      quantity: 5,
      minQuantity: 1,
      customFieldValues: {},
      createdAt: '',
      updatedAt: '',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(
      <ImportProductsModal
        isOpen={false}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        existingProducts={mockProducts}
        settings={DEFAULT_STORE_SETTINGS}
      />
    );

    expect(screen.queryByText(/Importar Produtos via Planilha/i)).not.toBeInTheDocument();
  });

  it('renders upload dropzone when isOpen is true', () => {
    render(
      <ImportProductsModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        existingProducts={mockProducts}
        settings={DEFAULT_STORE_SETTINGS}
      />
    );

    expect(screen.getByText(/Importar Produtos via Planilha/i)).toBeInTheDocument();
    expect(screen.getByText(/Arraste sua planilha ou clique para selecionar/i)).toBeInTheDocument();
    expect(screen.getByText(/\.CSV, \.XLS ou \.XLSX/i)).toBeInTheDocument();
  });

  it('processes file upload and displays preview with detected fields and duplicate options', async () => {
    vi.spyOn(importService, 'parseSpreadsheet').mockResolvedValue([
      {
        Produto: 'Vestido Seda',
        Preço: '180,00',
        Qtd: '8',
        Material: 'Seda Pura',
      },
      {
        Produto: 'Bolsa de Couro',
        Preço: '150,00',
        Qtd: '3',
      },
    ]);

    render(
      <ImportProductsModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        existingProducts={mockProducts}
        settings={DEFAULT_STORE_SETTINGS}
      />
    );

    const file = new File(['mock content'], 'produtos.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Pré-visualização e Confirmação/i)).toBeInTheDocument();
      expect(screen.getByText('Vestido Seda')).toBeInTheDocument();
      expect(screen.getByText(/Material/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Somar ao estoque atual/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Substituir saldo/i)).toBeInTheDocument();
    });
  });

  it('executes batch import on confirm and triggers onSuccess', async () => {
    vi.spyOn(importService, 'parseSpreadsheet').mockResolvedValue([
      {
        Produto: 'Vestido Seda',
        Preço: '180,00',
        Qtd: '8',
      },
    ]);
    const executeSpy = vi.spyOn(importService, 'executeImportBatch').mockResolvedValue({
      importedCount: 1,
    });

    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <ImportProductsModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
        existingProducts={mockProducts}
        settings={DEFAULT_STORE_SETTINGS}
      />
    );

    const file = new File(['mock content'], 'produtos.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Confirmar Importação/i)).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /Confirmar Importação/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(executeSpy).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
