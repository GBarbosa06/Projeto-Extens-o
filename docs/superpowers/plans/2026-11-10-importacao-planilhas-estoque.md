# Importação de Planilhas (CSV / XLS / XLSX) - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar funcionalidade completa de importação de planilhas (CSV, XLS, XLSX) processadas 100% no navegador, com mapeamento inteligente de colunas, auto-detecção de novos campos customizados para a loja, tolerância a dados faltantes com valores genéricos e modal com pré-visualização e confirmação antes da gravação em lote no Firestore.

**Architecture:** O arquivo é analisado no cliente com a biblioteca `xlsx` (SheetJS) sem tráfego de arquivo por servidores externos. O serviço `importService.ts` normaliza cabeçalhos e números no formato brasileiro, detecta colunas extras que não existiam na loja, calcula duplicidades contra os produtos atuais do usuário e monta operações de escrita em lote (`writeBatch`) no Firestore atualizando produtos, configurações e extrato de movimentações.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React, SheetJS (`xlsx`), Firebase Firestore SDK v10, Vitest, Testing Library.

**Spec:** [docs/superpowers/specs/2026-11-10-importacao-planilhas-estoque-design.md](file:///C:/Users/User/Documents/GitHub/Projeto-Extensão/docs/superpowers/specs/2026-11-10-importacao-planilhas-estoque-design.md)

## Global Constraints

- **Custo Zero:** Execução 100% client-side, sem Cloud Functions ou serviços pagos.
- **Isolamento de Dados (LGPD):** Todas as consultas e gravações ocorrem estritamente sob `/users/{userId}/...`.
- **Preservação de UI:** O formulário manual existente [ProductFormModal.tsx](file:///C:/Users/User/Documents/GitHub/Projeto-Extensão/src/components/products/ProductFormModal.tsx) permanece inalterado.
- **Tolerância a Falhas:** Registros sem campos obrigatórios recebem fallbacks seguros ("Produto sem nome", R$ 0,00, qtd 0).
- **Limite de Lote:** Escritas no Firestore divididas em lotes seguros de no máximo 200 produtos (400 operações atômicas).

## Review Focus

- **Planilha com separador ponto-e-vírgula (CSV brasileiro) e encoding com acentuação:** O parser deve identificar acentos e delimitadores `;` e `,` sem corromper caracteres.
- **Valores monetários com "R$" e vírgula decimal:** Converter strings como `"R$ 1.540,90"` ou `" 12,50 "` corretamente para números float válidos.
- **Colunas extras indesejadas:** O usuário deve ser capaz de desmarcar colunas extras no modal para que não sejam adicionadas aos campos customizados da loja.
- **Duplicados parciais sem SKU:** Quando o SKU estiver vazio no banco ou na planilha, o sistema deve casar produtos pelo Nome sem colidir itens diferentes.
- **Persistência de movimentações no extrato:** Produtos novos importados com estoque > 0 devem criar movimentações de entrada do tipo `IN` e motivo `ADJUSTMENT`.

---

### Task 1: Instalação da Dependência `xlsx` e Definição de Tipos de Importação

**Files:**
- Modify: `package.json`
- Modify: `src/types/index.ts`
- Test: `src/test/types.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export type DuplicateStrategy = 'sum' | 'overwrite';

  export interface DetectedCustomField {
    id: string;
    name: string;
    selected: boolean;
  }

  export interface ImportParsedItem {
    name: string;
    sku?: string;
    category?: string;
    costPrice?: number;
    salePrice: number;
    quantity: number;
    minQuantity: number;
    customFieldValues: Record<string, any>;
    warnings: string[];
    isDuplicate: boolean;
    existingProductId?: string;
    previousQuantity?: number;
  }

  export interface ImportAnalysisResult {
    items: ImportParsedItem[];
    newCustomFields: DetectedCustomField[];
    totalRows: number;
    validCount: number;
    warningCount: number;
    duplicateCount: number;
  }
  ```

- [ ] **Step 1: Write failing test in `src/test/types.test.ts` checking import types structure**
- [ ] **Step 2: Run `npx vitest run src/test/types.test.ts` and verify it fails**
- [ ] **Step 3: Install `xlsx` dependency (`npm install xlsx`) and add import interfaces to `src/types/index.ts`**
- [ ] **Step 4: Run `npx vitest run src/test/types.test.ts` and verify it passes**
- [ ] **Step 5: Commit:** `git commit -am "feat: add xlsx dependency and import type definitions"`

---

### Task 2: Serviço de Análise e Parsing de Planilhas (`importService.ts` - Leitura e Normalização)

**Files:**
- Create: `src/services/importService.ts`
- Create: `src/test/importService.test.ts`

**Interfaces:**
- Produces:
  - `parseSpreadsheet(file: File | ArrayBuffer): Promise<Record<string, any>[]>`
  - `parseMonetaryOrNumeric(val: any): number`
  - `analyzeSpreadsheetData(rows: Record<string, any>[], existingProducts: Product[], existingCustomFields: CustomField[]): ImportAnalysisResult`

- [ ] **Step 1: Write failing unit tests in `src/test/importService.test.ts`**
  - Test parsing Brazilian numbers (`"R$ 29,90"`, `"1.250,00"`, `10`).
  - Test header matching (e.g., `"Descricao"` -> `name`, `"Qtd"` -> `quantity`, `"Valor Venda"` -> `salePrice`).
  - Test unknown columns flagged as `newCustomFields`.
  - Test fallback application for empty names and prices with warning generation.
  - Test duplicate detection by SKU (case-insensitive) and by Name when SKU is missing.
- [ ] **Step 2: Run `npx vitest run src/test/importService.test.ts` and verify failures**
- [ ] **Step 3: Implement `parseMonetaryOrNumeric`, header mapping dictionaries, and `analyzeSpreadsheetData` in `src/services/importService.ts`**
- [ ] **Step 4: Run `npx vitest run src/test/importService.test.ts` and verify it passes**
- [ ] **Step 5: Commit:** `git commit -am "feat: implement spreadsheet parsing and analysis with dynamic column detection"`

---

### Task 3: Gravação em Lote no Firestore e Registro de Movimentações (`executeImportBatch`)

**Files:**
- Modify: `src/services/importService.ts`
- Modify: `src/test/importService.test.ts`

**Interfaces:**
- Produces:
  - `executeImportBatch(userId: string, analysis: ImportAnalysisResult, duplicateStrategy: DuplicateStrategy, selectedNewFields: DetectedCustomField[]): Promise<{ importedCount: number }>`

- [ ] **Step 1: Write failing test in `src/test/importService.test.ts` for `executeImportBatch`**
  - Verify Firestore `writeBatch` execution with chunks <= 200 items.
  - Verify update of `StoreSettings` with selected new custom fields.
  - Verify creation of `StockMovement` (type `IN`, reason `ADJUSTMENT`) for products with quantity > 0.
  - Verify `sum` vs `overwrite` behaviors on duplicate products.
- [ ] **Step 2: Run `npx vitest run src/test/importService.test.ts` and verify failure**
- [ ] **Step 3: Implement `executeImportBatch` in `src/services/importService.ts` using Firestore `writeBatch`**
- [ ] **Step 4: Run `npx vitest run src/test/importService.test.ts` and verify it passes**
- [ ] **Step 5: Commit:** `git commit -am "feat: implement batch persistence and stock movement tracking for imports"`

---

### Task 4: Componente de Modal de Importação com Prévia e Confirmação (`ImportProductsModal.tsx`)

**Files:**
- Create: `src/components/products/ImportProductsModal.tsx`
- Create: `src/test/ImportProductsModal.test.tsx`

**Interfaces:**
- Produces:
  ```typescript
  export interface ImportProductsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    existingProducts: Product[];
    settings: StoreSettings;
    onSettingsUpdated?: (newSettings: StoreSettings) => void;
  }
  ```

- [ ] **Step 1: Write failing test in `src/test/ImportProductsModal.test.tsx`**
  - Test drag-and-drop / file input rendering for `.csv, .xls, .xlsx`.
  - Test transitioning to preview step upon file upload.
  - Test rendering detected new custom fields with toggleable checkboxes.
  - Test switching duplicate strategy ("Somar ao estoque" vs "Substituir saldo").
  - Test calling `executeImportBatch` and notifying success on confirmation.
- [ ] **Step 2: Run `npx vitest run src/test/ImportProductsModal.test.tsx` and verify failure**
- [ ] **Step 3: Implement `ImportProductsModal.tsx` with Tailwind CSS, file reader, summary badges, warnings table and confirmation buttons**
- [ ] **Step 4: Run `npx vitest run src/test/ImportProductsModal.test.tsx` and verify it passes**
- [ ] **Step 5: Commit:** `git commit -am "feat: create ImportProductsModal with interactive preview and confirmation"`

---

### Task 5: Integração no Catálogo de Produtos e Testes Finais de Ponta a Ponta

**Files:**
- Modify: `src/components/products/ProductList.tsx`
- Modify: `src/App.tsx`
- Test: `src/test/integration.test.tsx`

**Interfaces:**
- Consumes: `ImportProductsModal` integrado com botão "Importar Planilha" no cabeçalho de ações da listagem.
- Produces: Fluxo completo ponta a ponta acessível para o usuário final.

- [ ] **Step 1: Write failing integration test checking the "Importar Planilha" button and modal trigger**
- [ ] **Step 2: Run `npx vitest run src/test/integration.test.tsx` and verify failure**
- [ ] **Step 3: Add "Importar Planilha" button (with FileSpreadsheet icon) in `ProductList.tsx` and wire modal open/close states in `App.tsx`**
- [ ] **Step 4: Run the full test suite (`npm test`) and check that all tests pass**
- [ ] **Step 5: Commit:** `git commit -am "feat: integrate spreadsheet import into ProductList view and App navigation"`
