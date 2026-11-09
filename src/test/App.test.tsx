import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('App Root', () => {
  it('renders application title or welcome message', () => {
    render(<App />);
    expect(screen.getByText(/Gestão de Estoque/i)).toBeInTheDocument();
  });
});
