# Design Doc: Importação de Planilhas (CSV / XLS / XLSX) com Detecção Dinâmica de Campos e Confirmação de Segurança

* **Data:** 10/11/2026
* **Status:** Em Revisão (Aguardando Aprovação)
* **Contexto:** Projeto de Extensão Universitária (UCB - Engenharia de Software) em parceria com microempreendedores locais (62.162.600 Yasmin da Costa Ferreira Avelino - ME).

---

## 1. Visão Geral e Intenção (Why)

### Contexto e Problema
A empreendedora parceira e outros microempreendedores frequentemente mantêm seus controles de mercadorias ou recebem faturas de fornecedores organizadas em planilhas (arquivos CSV, XLS ou XLSX). Essas planilhas contêm particularidades de cada negócio (por exemplo, colunas como "Material", "Cor" ou "Fabricante"). Cadastrar dezenas ou centenas de produtos manualmente no formulário individual é um processo moroso e propenso a erros.

### Objetivo
Permitir que o usuário importe diretamente seus arquivos de planilha (CSV, XLS ou XLSX) pela interface web. O sistema processará o arquivo 100% no navegador (sem custos de infraestrutura no Firebase Spark), detectará dinamicamente colunas extras para integrá-las aos campos customizados da loja, aplicará valores genéricos seguros caso faltem campos obrigatórios e apresentará uma tela de pré-visualização e confirmação de segurança antes de gravar qualquer dado no Firestore em lote.

O formulário manual existente ([ProductFormModal.tsx](file:///C:/Users/User/Documents/GitHub/Projeto-Extensão/src/components/products/ProductFormModal.tsx)) permanecerá integralmente preservado.

---

## 2. Metas, Não-Metas e Anti-Metas

### Metas (Goals)
1. **Suporte Amplo a Arquivos:** Suporte a arquivos `.csv` (com detecção automática de delimitadores vírgula e ponto-e-vírgula), `.xls` e `.xlsx`.
2. **Reconhecimento Inteligente de Cabeçalhos:** Mapear automaticamente variações comuns de cabeçalhos em português (ex: "Nome", "Produto", "Descrição" -> `name`; "Preço", "Valor", "Preço Venda" -> `salePrice`; "Qtd", "Quantidade", "Estoque" -> `quantity`; "Código", "SKU", "Ref" -> `sku`).
3. **Descoberta Dinâmica de Esquema (Schema Extension):** Se a planilha contiver colunas adicionais (ex: "Material", "Tamanho"), o sistema identifica essas colunas como novos campos customizados, sugerindo sua adição imediata a [StoreSettings.customFields](file:///C:/Users/User/Documents/GitHub/Projeto-Extensão/src/types/index.ts#L11-L16) e populando `customFieldValues` de cada produto correspondente.
4. **Resiliência e Tolerância a Falhas:** Registros sem campos obrigatórios recebem preenchimento genérico seguro (ex.: nome ausente vira "Produto importado sem nome"; preço ausente vira R$ 0,00; quantidade ausente vira 0), evitando o descarte acidental de linhas.
5. **Pré-visualização e Confirmação de Segurança:** Modal interativo exibindo o total de produtos lidos, itens com avisos/valores padrão aplicados e novos campos identificados, com botão explícito de confirmação antes de gravar no banco.
6. **Gravação Atômica em Lote:** Persistência no Firestore utilizando lotes (`writeBatch` em blocos de até 500 registros) em `/users/{uid}/products` e criação de registros no extrato de movimentações (`StockMovement` tipo `IN`, motivo `ADJUSTMENT` ou `REPLENISHMENT`).
7. **Tratamento de Duplicados:** Opção na tela de prévia para definir o comportamento se um produto com mesmo SKU ou Nome já existir: somar saldo de estoque ou atualizar informações.
8. **Preservação do Fluxo Existente:** Manter o formulário manual [ProductFormModal.tsx](file:///C:/Users/User/Documents/GitHub/Projeto-Extensão/src/components/products/ProductFormModal.tsx) intacto.

### Não-Metas (Non-Goals)
* Processamento server-side via Cloud Functions (permanece 100% no cliente para respeitar a gratuidade perpétua do plano Spark).
* Leitura de notas fiscais em PDF ou imagens escaneadas via OCR.
* Sincronização contínua em tempo real com Google Sheets ou Microsoft OneDrive.

### Anti-Metas (O que tornaria o projeto um fracasso)
* **Importação Silenciosa:** Gravar no banco sem confirmação prévia do usuário, corrompendo o inventário existente.
* **Inflexibilidade de Formato:** Exigir que a microempreendedora adeque sua planilha existente a um modelo pré-formatado rígido.
* **Custos de Infraestrutura:** Depender de serviços pagos de terceiros ou planos pagos de nuvem.

---

## 3. Restrições e Premissas

1. **Execução Client-Side:** Uso de biblioteca consolidada de leitura de planilhas no navegador (`xlsx` / SheetJS), permitindo leitura rápida sem envio do arquivo bruto a servidores externos (alinhado à LGPD).
2. **Segurança Firestore:** Todas as gravações ocorrem estritamente dentro da árvore de dados do usuário autenticado (`/users/{uid}/products`, `/users/{uid}/settings/general`, `/users/{uid}/movements`).
3. **Limites do Firestore:** Gravações em lote respeitam o teto de 500 operações por `writeBatch` do SDK do Firebase.

---

## 4. Abordagens Consideradas

| Abordagem | Descrição | Trade-offs | Decisão |
| :--- | :--- | :--- | :--- |
| **Opção 1: Leitura no Navegador com Prévia Interativa e Auto-Mapeamento** | Processamento no client-side com reconhecimento dinâmico de colunas e tela de prévia antes de gravar em lote no Firestore. | Adiciona pequena dependência no frontend (~40kb gzip); atende integralmente à demanda da parceira; 100% grátis e seguro. | **Escolhida** (Mais amigável para microempreendedores e segura contra erros). |
| **Opção 2: Template Rígido CSV** | Fornece um arquivo modelo e exige que o usuário preencha exatamente as colunas pré-definidas. | Simples de programar, mas rígido; exige retrabalho manual da parceira no Excel. | **Descartada**. |
| **Opção 3: Importação Direta Silenciosa** | Gravação imediata após o upload do arquivo, sem tela de conferência. | Menos cliques, mas alto risco de inconsistência e corrupção de dados cadastrais. | **Descartada**. |

---

## 5. Arquitetura e Decisões de Implementação

### 5.1. Fluxo de Usuário
```
[Botão "Importar Planilha" em ProductList.tsx]
                     │
                     ▼
       [Modal ImportProductsModal]
                     │
        1. Seleção / Drop do arquivo (.csv, .xls, .xlsx)
                     │
        2. Leitura e Análise no Navegador (importService.ts)
           - Detecção de colunas padrão vs. novas colunas
           - Aplicação de valores genéricos em campos ausentes
           - Verificação de duplicados (mesmo SKU ou Nome)
                     │
        3. Tela de Prévia e Confirmação de Segurança
           - Resumo: X novos produtos, Y duplicados, Z avisos
           - Lista de novos campos a serem criados na loja (ex: "Material")
           - Tabela interativa com amostra dos dados tratados
           - Seleção do comportamento de duplicados (Somar estoque vs. Sobrescrever)
                     │
        4. Ação do Usuário: [Confirmar Importação]
                     │
        5. Persistência em Lote (Firestore writeBatch)
           - Atualiza StoreSettings (se houver novos campos)
           - Cria/Atualiza produtos em /users/{uid}/products
           - Registra movimentações iniciais em /users/{uid}/movements
                     │
        6. Feedback visual (Toast de Sucesso) e atualização da lista
```

### 5.2. Mapeamento Inteligente de Colunas
O serviço `importService.ts` conterá dicionários de sinônimos para os campos padrão:
* `name`: "nome", "produto", "descrição", "descricao", "item", "titulo".
* `salePrice`: "preço", "preco", "preço de venda", "preco de venda", "valor", "valor unitario", "venda".
* `quantity`: "quantidade", "qtd", "estoque", "saldo", "unidades".
* `costPrice`: "custo", "preço de custo", "preco de custo", "valor de custo".
* `sku`: "sku", "código", "codigo", "ref", "referência", "referencia", "cod".
* `category`: "categoria", "departamento", "seção", "grupo".
* `minQuantity`: "mínimo", "minimo", "estoque mínimo", "estoque minimo".

Colunas restantes não mapeadas para campos padrão serão verificadas contra [StoreSettings.customFields](file:///C:/Users/User/Documents/GitHub/Projeto-Extensão/src/types/index.ts#L11-L16). Se não existirem, serão classificadas como `newCustomFields` a serem adicionadas automaticamente como campos do tipo `text`.

### 5.3. Normalização e Fallbacks
* **Valores Monetários e Numéricos:** Tratamento de formatação brasileira (ex: `"R$ 1.250,50"` ou `"15,00"` convertidos para número `1250.5` e `15.0`).
* **Campos Obrigatórios:**
  * Se `name` estiver vazio: `Produto sem nome (Linha X)`.
  * Se `salePrice` for inválido ou ausente: `0.00`.
  * Se `quantity` for inválido ou ausente: `0`.
* Cada linha tratada com fallback é sinalizada com um indicador de aviso visual no modal de prévia.

---

## 6. O que Fica a Cargo do Construtor (Left to the Builder)

* Escolha da biblioteca de leitura (`xlsx` versão standalone leve para suporte a xls/xlsx/csv).
* Estilização dos componentes visuais de drag-and-drop e das badges de aviso usando Tailwind CSS.
* Divisão do lote de escrita em blocos de até 500 itens caso o arquivo contenha mais de 500 registros.
* Textos das mensagens de toast e estados de carregamento com spinners.
