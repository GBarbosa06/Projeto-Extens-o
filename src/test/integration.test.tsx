import { render, screen, waitFor } from '@testing-library/react';
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
});
