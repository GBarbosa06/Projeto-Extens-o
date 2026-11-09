# Design Doc: Solução Digital para Organização e Gestão de Estoque de Pequenos Empreendedores

* **Data:** 09/11/2026
* **Status:** Em Revisão (Aguardando aprovação)
* **Contexto:** Projeto de Extensão Universitária (UCB - Engenharia de Software) em parceria com microempreendedores locais (Yasmin da Costa Ferreira Avelino - ME).

---

## 1. Visão Geral e Intenção (Why)

### Contexto e Problema
Pequenos empreendedores e trabalhadores autônomos gerenciam o fluxo de seus produtos predominantemente por meio de anotações em papel, cadernos, mensagens de WhatsApp e planilhas desconexas. Esse modelo gera perda de vendas, falta de visibilidade sobre o valor retido em mercadorias, descontrole na reposição e retrabalho.

### Objetivo
Desenvolver uma aplicação web simples, moderna, intuitiva e 100% gratuita para controle de estoque e movimentações rápidas (entradas e saídas), desenhada de forma genérica para atender qualquer microempresa, mas com capacidade de personalização de campos direto pela interface do usuário (sem necessidade de alterações de código).

Além do software em si, o projeto contempla um repositório com instruções pedagógicas e simplificadas para que qualquer empreendedor com conhecimentos básicos de informática consiga clonar, criar sua própria instância no plano gratuito do Firebase e publicar sua aplicação na nuvem a custo zero.

---

## 2. Metas, Não-Metas e Anti-Metas

### Metas (Goals)
1. **CRUD Completo de Produtos:** Cadastro, visualização, edição e exclusão de itens de forma rápida e responsiva.
2. **Movimentação Ágil de Estoque (+ Entrada / - Saída):** Registro direto na listagem com modal rápido para informar quantidade e motivo (ex: Venda, Reposição, Avaria/Perda), mantendo extrato de histórico.
3. **Campos Customizáveis por Segmento (In-App):** Tela de configuração onde o empreendedor pode ativar segmentos pré-definidos (ex: *Vestuário*, *Alimentação*, *Varejo Geral*) ou criar campos personalizados (ex: *Tamanho, Cor, Validade, Lote*), que são refletidos dinamicamente nos formulários.
4. **Alerta de Estoque Mínimo:** Destaque visual imediato para itens com estoque abaixo do limite pré-estabelecido ou zerado.
5. **Autenticação e Multi-Tenancy Seguro:** Login via Firebase Auth (e-mail/senha ou Google), com isolamento estrito de dados por usuário via Firestore Security Rules (em conformidade com a LGPD).
6. **Suporte a Funcionamento Offline:** Configuração de cache local automático via IndexedDB do Firestore SDK para garantir usabilidade em redes instáveis.
7. **Guia Completo de Replicação Gratuita:** Documentação clara no `README.md` orientando a criação de conta no Firebase (Plano Spark - sem cartão de crédito) e publicação gratuita (ex: Vercel ou Firebase Hosting).

### Não-Metas (Non-Goals)
* Emissão de Notas Fiscais Eletrônicas (NF-e/NFC-e) ou integração com SEFAZ.
* Gateway de pagamento online ou frente de caixa com PDV fiscal integrado.
* Integração nativa com marketplaces externos (Mercado Livre, Shopee, etc.) nesta primeira versão.

### Anti-Metas (O que tornaria o projeto um fracasso)
* **Custos Ocultos:** Exigir cartão de crédito ou planos pagos de nuvem (o projeto deve rodar 100% no tier gratuito).
* **Complexidade Excessiva de Interface:** Telas poluídas, jargões contábeis complexos ou formulários com dezenas de campos obrigatórios que afastem o usuário leigo.
* **Dependência de Backend Próprio Pago:** Obrigar a hospedagem de servidores VPS/Node dedicados pagos.

---

## 3. Restrições e Premissas

1. **Frontend:** React com Vite e TypeScript, estilizado com Tailwind CSS para garantir interface moderna, limpa e mobile-friendly (usável no celular do comerciante).
2. **Backend e Banco de Dados:** Firebase Client SDK v10 (Firebase Authentication + Cloud Firestore).
3. **Plano de Hospedagem:** 100% Spark (tier gratuito perpétuo do Firebase), sem uso de Cloud Functions para não exigir cartão de crédito.
4. **Segurança e LGPD:** Cada usuário possui isolamento total. Regras no Firestore impedem leitura ou escrita fora da árvore `/users/{userId}/`.

---

## 4. Abordagens Consideradas

| Abordagem | Descrição | Trade-offs | Decisão |
| :--- | :--- | :--- | :--- |
| **Opção 1: React + Vite + Firebase SDK Direto (Client-Side)** | Acesso direto ao Firestore com regras de segurança no banco e autenticação isolada. | Sem backend customizado; regras de segurança declarativas no Firestore; 100% grátis sem cartão. | **Escolhida** (Mais rápida, robusta e fácil de replicar por empreendedores). |
| **Opção 2: React + Vite + Firebase com Cloud Functions** | Camada intermediária de API Node.js serverless. | Exige plano Blaze (cartão de crédito obrigatório), violando o critério de gratuidade para qualquer usuário. | **Descartada**. |
| **Opção 3: Provedor Híbrido (LocalStorage + Firebase opcional)** | Suporte inicial sem cadastro em memória local e botão para migrar pro Firebase. | Adiciona complexidade de sincronização e migração de dados locais para a nuvem. | **Descartada**. |

---

## 5. Arquitetura e Decisões de Implementação

### 5.1. Estrutura de Coleções no Firestore
A estrutura de dados adota o particionamento hierárquico por usuário (`uid`), garantindo segurança nativa:

```
users/{userId}
  ├── settings/general
  │     ├── storeName: string
  │     ├── currency: string (padrão: "BRL")
  │     ├── activeSegment: string ("general" | "clothing" | "food" | "custom")
  │     └── customFields: Array<{
  │           id: string,
  │           name: string,
  │           type: "text" | "number" | "date" | "select",
  │           options?: string[]
  │         }>
  │
  ├── products/{productId}
  │     ├── name: string (obrigatório)
  │     ├── sku: string (opcional)
  │     ├── category: string (opcional)
  │     ├── costPrice: number (opcional)
  │     ├── salePrice: number (obrigatório)
  │     ├── quantity: number (obrigatório)
  │     ├── minQuantity: number (opcional, padrão: 0)
  │     ├── customFieldValues: Record<string, any>
  │     ├── createdAt: timestamp
  │     └── updatedAt: timestamp
  │
  └── movements/{movementId}
        ├── productId: string
        ├── productName: string
        ├── type: "IN" | "OUT"
        ├── quantity: number
        ├── reason: "REPLENISHMENT" | "SALE" | "LOSS_DAMAGE" | "ADJUSTMENT" | "OTHER"
        ├── notes: string (opcional)
        ├── previousQuantity: number
        ├── newQuantity: number
        └── createdAt: timestamp
```

### 5.2. Regras de Segurança (`firestore.rules`)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 5.3. Módulos e Fluxos de Interface
1. **Autenticação:** Telas de Login, Registro e Recuperação de Senha (e-mail/senha e botão Google).
2. **Dashboard / Início:** 
   * Cards de métricas rápidas: Total de Produtos Cadastrados, Unidades em Estoque, Valor Estimado do Estoque (R$) e Quantidade de Itens com Estoque Baixo/Zerado.
   * Lista ou atalhos para produtos em estado crítico de estoque.
3. **Catálogo de Produtos (CRUD):**
   * Listagem em tabela ou cards com busca instantânea e filtro por categoria ou estoque baixo.
   * Botões de ação rápida em cada linha: `[ + Entrada ]` e `[ - Saída ]`.
   * Modal de Cadastro/Edição de produto que renderiza os campos universais e automaticamente os campos personalizados configurados.
4. **Histórico de Movimentações:**
   * Tabela cronológica mostrando tipo (Entrada com badge verde, Saída com badge vermelho), produto, quantidade, motivo e data/hora.
5. **Configurações da Loja & Segmento:**
   * Edição do nome da loja.
   * Gerenciador de campos extras: adicionar novo campo (Nome, Tipo) ou carregar presets ("Moda/Vestuário" -> Tamanho, Cor; "Alimentos" -> Validade, Lote).

---

## 6. Decisões Técnicas do Desenvolvedor (Builder Calls)
* **Atomicidade de Movimentações:** Uso de `runTransaction` do Firebase SDK para garantir que a atualização da quantidade do produto e a inserção no extrato de movimentações ocorram de forma atômica (sem risco de inconsistência em caso de falha de conexão).
* **Tratamento de Estoque Negativo:** O sistema emite um alerta caso uma saída resulte em saldo menor que zero, permitindo confirmação consciente pelo empreendedor (evita travamento de vendas no mundo real quando a reposição física ainda não foi lançada no sistema).
* **Ciclo de Vida de Campos Dinâmicos:** Ao remover um campo personalizado das configurações, novos cadastros deixam de exibi-lo, mas os valores já salvos em produtos antigos permanecem preservados no histórico.
* **Formatos Numéricos e Unidades:** Suporte a unidades fracionadas (ex: kg, litros) e inteiros (unidades), com formatação de moeda automática no padrão brasileiro (BRL / R$).
* **Interface e Estilos:** Tailwind CSS com design responsivo (mobile-first), biblioteca `lucide-react` para iconografia e Toasts para confirmações de ação rápida.

---

## 7. Critérios de Aceite para Validação
* [ ] Empreendedor consegue criar conta e logar com e-mail/senha ou Google.
* [ ] Empreendedor cadastra um produto com nome, preço, quantidade inicial e estoque mínimo.
* [ ] É possível configurar um campo extra (ex: "Validade") e cadastrar um produto preenchendo esse campo.
* [ ] Ao dar saída de 3 unidades com motivo "Venda", o estoque reduz imediatamente e o extrato registra a movimentação.
* [ ] Um produto com estoque abaixo do mínimo aparece destacado com alerta visual.
* [ ] O `README.md` contém o guia passo a passo em linguagem simples e clara para replicação gratuita do projeto.
