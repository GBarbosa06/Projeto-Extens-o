# Gestão de Estoque para Pequenos Empreendedores - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir uma aplicação web moderna, acessível e gratuita (React + Vite + Tailwind + Firebase) para controle de estoque e movimentações de pequenos empreendedores, com campos customizáveis na interface e guia passo a passo para replicação sem custos.

**Architecture:** Frontend SPA em React com TypeScript e Tailwind CSS conectando-se diretamente ao Firebase Client SDK v10 (Firebase Auth e Cloud Firestore com persistência offline). O isolamento de dados é estrito por usuário (`/users/{uid}/...`) e as alterações de estoque utilizam transações atômicas para evitar inconsistências.

**Tech Stack:** React 18/19, Vite, TypeScript, Tailwind CSS, Lucide React, Vitest, Testing Library, Firebase SDK v10 (Auth, Firestore com IndexedDB cache).

**Spec:** [docs/superpowers/specs/2026-11-09-gestao-estoque-empreendedores-design.md](file:///C:/Users/User/Documents/GitHub/Projeto-Extensão/docs/superpowers/specs/2026-11-09-gestao-estoque-empreendedores-design.md)

## Global Constraints

- **Custo Zero:** Execução 100% no plano Spark do Firebase, sem dependência de Cloud Functions ou serviços pagos.
- **Isolamento de Dados (LGPD):** Nenhum usuário pode ler ou gravar dados fora de `/users/{request.auth.uid}/`.
- **Customização In-App:** Adaptação para nichos (vestuário, alimentos, varejo) feita pela interface do usuário sem alteração de código.
- **Atomicidade:** Toda movimentação de estoque (+Entrada ou -Saída) deve atualizar a quantidade do produto e criar o registro no extrato dentro da mesma transação atômica.
- **Portabilidade:** Guia amigável no `README.md` que permita a qualquer estudante ou comerciante clonar e hospedar o sistema gratuitamente.

## Review Focus

- **Saída maior que o saldo em estoque:** Deve alertar o usuário com diálogo de confirmação em vez de bloquear silenciosamente ou falhar.
- **Campo customizado excluído da loja:** Produtos antigos que possuíam esse campo preenchido não devem corromper nem quebrar a renderização.
- **Conexão offline momentânea:** O Firestore SDK deve manter as alterações em cache local (IndexedDB) e sincronizar automaticamente ao retornar a rede.
- **Validação de preços e quantidades monetárias:** Aceitar valores no padrão brasileiro (R$ com vírgula ou ponto) e quantidades decimais (ex: 2.5 kg).
- **Tentativa de acesso não autenticado:** Redirecionar imediatamente para a tela de login/cadastro, bloqueando telas privadas.

---

### Task 1: Scaffolding, Tooling & Test Setup

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Test: `src/test/App.test.tsx`

**Interfaces:**
- Produces: Base do projeto React executável com Vite, suporte a testes unitários via Vitest e estilização via Tailwind CSS.

- [ ] **Step 1: Write the failing test**
Create `src/test/App.test.tsx` verifying that the root app renders without crashing:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('App Root', () => {
  it('renders application title or welcome message', () => {
    render(<App />);
    expect(screen.getByText(/Gestão de Estoque/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test`
Expected: FAIL (missing dependencies or files)

- [ ] **Step 3: Setup Vite project configuration and install dependencies**
Configure `package.json` with React, Vite, TypeScript, Tailwind, Lucide React, Firebase, Vitest and `@testing-library/react`.
Install dependencies with `npm install`.
Create `src/App.tsx` displaying the header "Gestão de Estoque".

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/test/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add package.json package-lock.json vite.config.ts tsconfig*.json tailwind.config.js postcss.config.js index.html vitest.config.ts src/
git commit -m "chore: scaffold vite react typescript project with tailwind and vitest"
```

---

### Task 2: Core Domain Types & Firebase Security Rules

**Files:**
- Create: `src/types/index.ts`
- Create: `firestore.rules`
- Test: `src/test/types.test.ts`

**Interfaces:**
- Produces: Tipagens TypeScript `Product`, `StockMovement`, `CustomField`, `StoreSettings`, `MovementReason` e regras declarativas do Firestore.

- [ ] **Step 1: Write the test verifying types and valid structure contracts**
Create `src/test/types.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { Product, StockMovement, StoreSettings } from '../types';

describe('Domain Types', () => {
  it('instantiates valid product contract', () => {
    const product: Product = {
      id: 'prod-1',
      name: 'Camisa Polo',
      salePrice: 59.9,
      quantity: 10,
      minQuantity: 2,
      customFieldValues: { tamanho: 'M', cor: 'Azul' },
      createdAt: '2026-11-09T00:00:00Z',
      updatedAt: '2026-11-09T00:00:00Z',
    };
    expect(product.name).toBe('Camisa Polo');
    expect(product.quantity).toBe(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/test/types.test.ts`
Expected: FAIL (types not found)

- [ ] **Step 3: Define types in `src/types/index.ts` and write `firestore.rules`**
Define `Product`, `StockMovement`, `CustomField`, `StoreSettings`, `MovementType`, `MovementReason`.
Create `firestore.rules` enforcing multi-tenant isolation under `/users/{userId}/{document=**}`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/test/types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/types/ firestore.rules src/test/types.test.ts
git commit -m "feat: define domain types and firestore security rules"
```

---

### Task 3: Firebase Client Setup with Offline Persistence & Auth Context

**Files:**
- Create: `src/config/firebase.ts`
- Create: `src/contexts/AuthContext.tsx`
- Create: `src/components/auth/AuthModal.tsx`
- Test: `src/test/auth.test.tsx`

**Interfaces:**
- Consumes: `src/types/index.ts`
- Produces: `useAuth()` hook fornecendo `currentUser`, `loading`, `login(email, pass)`, `register(email, pass)`, `loginWithGoogle()`, `logout()`.

- [ ] **Step 1: Write the failing test for AuthContext**
Create `src/test/auth.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

const TestComponent = () => {
  const { currentUser, loading } = useAuth();
  if (loading) return <div>Carregando...</div>;
  return <div>{currentUser ? `Logado: ${currentUser.email}` : 'Desconectado'}</div>;
};

describe('AuthContext', () => {
  it('renders Desconectado when no user is logged in', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    expect(screen.getByText(/Desconectado|Carregando/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/test/auth.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement Firebase initialization and AuthContext**
In `src/config/firebase.ts`: inicializar Firebase App, Auth e Firestore com `enableIndexedDbPersistence`.
In `src/contexts/AuthContext.tsx`: criar provider com observador `onAuthStateChanged`.
In `src/components/auth/AuthModal.tsx`: modal para login / cadastro com e-mail e senha e botão de Google Login.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/test/auth.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/config/ src/contexts/ src/components/auth/ src/test/auth.test.tsx
git commit -m "feat: setup firebase client, offline persistence and auth context"
```

---

### Task 4: Store Settings & In-App Dynamic Custom Fields

**Files:**
- Create: `src/services/settingsService.ts`
- Create: `src/components/settings/SettingsView.tsx`
- Test: `src/test/settingsService.test.ts`

**Interfaces:**
- Consumes: `src/types/index.ts`, `src/config/firebase.ts`
- Produces: `getStoreSettings(userId)`, `saveStoreSettings(userId, settings)`, `PRESET_SEGMENTS` (Vestuário, Alimentação, Serviços/Geral).

- [ ] **Step 1: Write the failing test for settingsService**
Create `src/test/settingsService.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { PRESET_SEGMENTS } from '../services/settingsService';

describe('Settings Presets', () => {
  it('provides clothing preset with size and color fields', () => {
    const clothing = PRESET_SEGMENTS.find(s => s.id === 'clothing');
    expect(clothing).toBeDefined();
    expect(clothing?.fields.some(f => f.name.toLowerCase() === 'tamanho')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/test/settingsService.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/services/settingsService.ts` and `SettingsView.tsx`**
Implementar leitura/gravação das configurações em `/users/{userId}/settings/general`.
Criar interface para o empreendedor adicionar, editar ou remover campos extras dinâmicos, ou clicar em um botão para carregar presets (Vestuário, Alimentação, Artesanato).

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/test/settingsService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/services/settingsService.ts src/components/settings/ src/test/settingsService.test.ts
git commit -m "feat: implement store settings and in-app dynamic custom fields"
```

---

### Task 5: Products Service & Dynamic Product Management (CRUD)

**Files:**
- Create: `src/services/productService.ts`
- Create: `src/components/products/ProductFormModal.tsx`
- Create: `src/components/products/ProductList.tsx`
- Create: `src/components/products/LowStockBadge.tsx`
- Test: `src/test/productService.test.ts`

**Interfaces:**
- Consumes: `src/types/index.ts`, `src/config/firebase.ts`, `CustomField`
- Produces: `getProducts(userId)`, `addProduct(userId, product)`, `updateProduct(userId, id, data)`, `deleteProduct(userId, id)`.

- [ ] **Step 1: Write the failing test for product helpers and low stock calculation**
Create `src/test/productService.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { isLowStock } from '../services/productService';

describe('Product Service Helpers', () => {
  it('correctly identifies low stock condition', () => {
    expect(isLowStock({ quantity: 1, minQuantity: 3 })).toBe(true);
    expect(isLowStock({ quantity: 5, minQuantity: 3 })).toBe(false);
    expect(isLowStock({ quantity: 0, minQuantity: 0 })).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/test/productService.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `productService.ts`, `ProductFormModal.tsx` and `ProductList.tsx`**
Implementar CRUD no Firestore.
`ProductFormModal.tsx` deve ler a lista de `customFields` da loja e renderizar inputs dinâmicos correspondentes para cada campo extra.
`ProductList.tsx` renderiza a tabela de produtos com busca rápida, filtro por estoque baixo e ações de editar e excluir.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/test/productService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/services/productService.ts src/components/products/ src/test/productService.test.ts
git commit -m "feat: implement product crud service, dynamic form and list view"
```

---

### Task 6: Atomic Stock Movements (+ Entrada / - Saída) and History

**Files:**
- Create: `src/services/movementService.ts`
- Create: `src/components/movements/StockMovementModal.tsx`
- Create: `src/components/movements/MovementHistory.tsx`
- Test: `src/test/movementService.test.ts`

**Interfaces:**
- Consumes: `src/types/index.ts`, `src/config/firebase.ts`, `Product`
- Produces: `registerStockMovement(userId, movementData)` usando `runTransaction` no Firestore, `getMovements(userId)`.

- [ ] **Step 1: Write the failing test for movement calculation logic**
Create `src/test/movementService.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { calculateNewStock } from '../services/movementService';

describe('Stock Movement Logic', () => {
  it('calculates stock entry correctly', () => {
    const result = calculateNewStock(10, 5, 'IN');
    expect(result.newQuantity).toBe(15);
    expect(result.isNegative).toBe(false);
  });

  it('calculates stock exit and detects negative stock warning', () => {
    const result = calculateNewStock(5, 8, 'OUT');
    expect(result.newQuantity).toBe(-3);
    expect(result.isNegative).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/test/movementService.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `movementService.ts`, `StockMovementModal.tsx` and `MovementHistory.tsx`**
Implementar `calculateNewStock` e `registerStockMovement` com `runTransaction`.
Criar modal de ação rápida: ao clicar em `[+ Entrada]` ou `[- Saída]` na listagem de produtos, o modal solicita a quantidade e o motivo (Venda, Reposição, Avaria/Perda, etc.).
Se a saída gerar estoque negativo, exibir alerta claro com opção de confirmação antes de gravar.
Criar tela/tabela de extrato de movimentações.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/test/movementService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/services/movementService.ts src/components/movements/ src/test/movementService.test.ts
git commit -m "feat: implement atomic stock movements, quick action modal and history"
```

---

### Task 7: Dashboard Overview & Metric Cards

**Files:**
- Create: `src/components/dashboard/DashboardOverview.tsx`
- Test: `src/test/dashboard.test.ts`

**Interfaces:**
- Consumes: `Product`, `StockMovement`
- Produces: `calculateDashboardMetrics(products)` -> `{ totalProducts, totalItems, totalInventoryValue, lowStockCount }`

- [ ] **Step 1: Write the failing test for dashboard metrics calculation**
Create `src/test/dashboard.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { calculateDashboardMetrics } from '../components/dashboard/dashboardUtils';
import { Product } from '../types';

describe('Dashboard Metrics', () => {
  it('computes metrics from product list', () => {
    const mockProducts: Product[] = [
      { id: '1', name: 'Item 1', salePrice: 10, quantity: 5, minQuantity: 2, customFieldValues: {}, createdAt: '', updatedAt: '' },
      { id: '2', name: 'Item 2', salePrice: 20, quantity: 1, minQuantity: 3, customFieldValues: {}, createdAt: '', updatedAt: '' },
    ];
    const metrics = calculateDashboardMetrics(mockProducts);
    expect(metrics.totalProducts).toBe(2);
    expect(metrics.totalItems).toBe(6);
    expect(metrics.totalInventoryValue).toBe(70); // 5*10 + 1*20
    expect(metrics.lowStockCount).toBe(1); // Item 2 is below minQuantity
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/test/dashboard.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `dashboardUtils.ts` and `DashboardOverview.tsx`**
Implementar cálculo das métricas e componente visual com 4 cards elegantes (Total de Produtos, Itens em Estoque, Valor Total em R$, e Alerta de Estoque Baixo em destaque).

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/test/dashboard.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/components/dashboard/ src/test/dashboard.test.ts
git commit -m "feat: implement dashboard metrics and overview summary cards"
```

---

### Task 8: Navigation, Layout Integration & App Wireup

**Files:**
- Create: `src/components/layout/Navbar.tsx`
- Modify: `src/App.tsx`
- Test: `src/test/integration.test.tsx`

**Interfaces:**
- Consumes: Todos os componentes criados nas tasks anteriores
- Produces: Aplicação completa navegável entre Dashboard, Produtos, Movimentações e Configurações.

- [ ] **Step 1: Write the failing integration test**
Create `src/test/integration.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('App Navigation and Layout', () => {
  it('renders navbar navigation tabs', () => {
    render(<App />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/test/integration.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement Navbar and integrate views into App.tsx**
Criar navegação por abas responsiva (Início/Dashboard, Produtos, Histórico de Movimentações, Configurações da Loja), com botão de perfil/login no canto superior.
Gerenciar estado de autenticação e feedback visual amigável (Toasts).

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/test/integration.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/components/layout/ src/App.tsx src/test/integration.test.tsx
git commit -m "feat: assemble navigation tabs and full application layout"
```

---

### Task 9: Deployment Guide & Self-Hosting Documentation (README.md)

**Files:**
- Create: `README.md`
- Create: `.env.example`

**Interfaces:**
- Produces: Manual didático passo a passo para o microempreendedor ou estudante rodar localmente e publicar 100% grátis no Firebase Hosting ou Vercel.

- [ ] **Step 1: Create `.env.example`**
Descrever as variáveis de ambiente necessárias:
```env
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu_projeto_id
VITE_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
```

- [ ] **Step 2: Write comprehensive `README.md`**
Incluir seções:
1. Sobre o Projeto de Extensão Universitária e ODS 8 e 9 (ONU)
2. Demonstração e Funcionalidades (CRUD, Botões rápidos de Entrada/Saída, Campos customizáveis, Alertas)
3. Como rodar localmente (`npm install`, `npm run dev`)
4. Guia Passo a Passo: Criando seu Firebase Gratuito (Plano Spark, sem cartão de crédito)
5. Guia Passo a Passo: Publicando de graça na Vercel ou Firebase Hosting com 1 clique
6. Como cadastrar campos para o seu segmento de negócio

- [ ] **Step 3: Verify markdown formatting and test suite**
Run: `npm test`
Expected: All test suites PASS

- [ ] **Step 4: Commit**
```bash
git add README.md .env.example
git commit -m "docs: add comprehensive self-hosting and setup guide for entrepreneurs"
```
