import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

const TestConsumer = () => {
  const { currentUser, loading } = useAuth();
  if (loading) return <div>Carregando...</div>;
  return <div>{currentUser ? `Logado: ${currentUser.email}` : 'Desconectado'}</div>;
};

describe('AuthContext', () => {
  it('renders Desconectado when no user is logged in', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByText('Desconectado')).toBeInTheDocument();
    });
  });
});
