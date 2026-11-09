import React from 'react';
import {
  LayoutDashboard,
  Package,
  History,
  Store,
  LogIn,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export type NavTab = 'dashboard' | 'products' | 'movements' | 'settings';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenAuth: () => void;
  storeName: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenAuth,
  storeName,
}) => {
  const { currentUser, logout } = useAuth();

  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Início', icon: LayoutDashboard },
    { id: 'products' as NavTab, label: 'Produtos', icon: Package },
    { id: 'movements' as NavTab, label: 'Movimentações', icon: History },
    { id: 'settings' as NavTab, label: 'Configurações', icon: Store },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Brand / Store title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-sm text-base">
            GE
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 leading-tight">
              {storeName || 'Gestão de Estoque'}
            </h1>
            <span className="text-[10px] text-slate-400 block font-medium">
              Pequenos Empreendedores • UCB Extensão
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav role="navigation" className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Auth / Profile Area */}
        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-800">
                  {currentUser.displayName || currentUser.email?.split('@')[0]}
                </span>
                <span className="text-[10px] text-slate-400">
                  {currentUser.email}
                </span>
              </div>
              <button
                onClick={() => logout()}
                className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                title="Sair da conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              Entrar / Cadastrar
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <nav className="md:hidden flex border-t border-slate-100 bg-slate-50/75 px-2 py-1 justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center py-1.5 px-3 rounded-lg text-[10px] font-medium transition ${
                isActive ? 'text-blue-600 font-bold' : 'text-slate-500'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
