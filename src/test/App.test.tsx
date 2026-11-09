import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('App Root', () => {
  it('renders application title or welcome message', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/Gestão de Estoque/i)).toBeInTheDocument();
    });
  });
});
