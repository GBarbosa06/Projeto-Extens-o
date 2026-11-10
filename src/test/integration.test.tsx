import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('App Navigation and Layout', () => {
  it('renders navbar navigation tabs', async () => {
    render(<App />);
    await waitFor(() => {
      const navs = screen.getAllByRole('navigation');
      expect(navs.length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(/Início/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Produtos/i)[0]).toBeInTheDocument();
  });

  it('navigates to products and opens spreadsheet import modal', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText(/Produtos/i)[0]).toBeInTheDocument();
    });

    const productsTabButton = screen.getAllByText(/Produtos/i)[0];
    fireEvent.click(productsTabButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Importar Planilha/i })).toBeInTheDocument();
    });

    const importButton = screen.getByRole('button', { name: /Importar Planilha/i });
    fireEvent.click(importButton);

    await waitFor(() => {
      expect(screen.getByText(/Importar Produtos via Planilha/i)).toBeInTheDocument();
      expect(screen.getByText(/Arraste sua planilha ou clique para selecionar/i)).toBeInTheDocument();
    });
  });
});

