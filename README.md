# Solução Digital para Organização e Gestão de Estoque de Pequenos Empreendedores

> **Projeto de Extensão Universitária**  
> **Instituição:** Universidade Católica de Brasília (UCB) — Engenharia de Software  
> **Unidade Curricular:** Extensão: Cooperação, Humanismo Solidário e Redes e Comunidades  
> **Parceria Comunitária:** 62.162.600 YASMIN DA COSTA FERREIRA AVELINO - ME  
> **Alinhamento ODS (Agenda 2030 ONU):**  
> * **ODS 8:** Trabalho Decente e Crescimento Econômico  
> * **ODS 9:** Indústria, Inovação e Infraestrutura  

---

## 📌 Sobre o Projeto

Microempreendedores individuais e autônomos enfrentam desafios diários no controle de suas mercadorias, dependendo de anotações manuais em papel, mensagens de WhatsApp ou planilhas desorganizadas. Essa prática acarreta perda de produtos, descontrole financeiro e falta de previsão de reposição.

Este projeto entrega uma **solução web completa, moderna, intuitiva e 100% gratuita** para gerenciamento de estoque e controle de movimentações (+Entrada / -Saída). A aplicação é desenhada com arquitetura flexível, permitindo que **o próprio empreendedor personalize campos e segmentos diretamente pela interface**, sem necessidade de alterar código.

---

## 🚀 Principais Funcionalidades

1. **Dashboard com Visão Geral em Tempo Real:**
   * Total de produtos cadastrados.
   * Volume físico de unidades em estoque.
   * Valor financeiro total retido em mercadorias (estimado pelo preço de venda em R$).
   * Contador de alerta de estoque crítico/baixo.
2. **Catálogo de Produtos (CRUD Completo):**
   * Cadastro, visualização, edição e exclusão rápida.
   * Busca instantânea por nome, categoria ou código/SKU.
   * Filtros por estoque normal, baixo ou esgotado.
3. **Movimentações Rápidas de Estoque (+ Entrada / - Saída):**
   * Botões de ação rápida em cada linha de produto.
   * Modal para registro com motivo (Reposição, Venda, Avaria/Perda, Ajuste) e observações.
   * Alerta preventivo com diálogo de confirmação caso uma saída resulte em estoque negativo.
4. **Extrato Cronológico de Movimentações:**
   * Histórico detalhado com tipo (Entrada/Saída), saldo anterior e resultante, motivo e data/hora.
5. **Personalização In-App por Segmento:**
   * Modelos pré-configurados prontos para uso:
     * **Moda & Vestuário:** Tamanho, Cor, Material.
     * **Alimentos & Bebidas:** Validade, Lote, Unidade de Medida.
     * **Varejo / Geral:** Campos universais.
   * Criação de campos extras personalizados (texto, número, data ou lista de seleção) direto na tela de configurações.
6. **Autenticação e Multi-Tenancy Seguro (LGPD):**
   * Login e cadastro seguro com e-mail/senha ou Google.
   * Isolamento rigoroso de dados: cada empreendedor acessa exclusivamente sua própria loja via regras de segurança do Firestore.
7. **Suporte a Funcionamento Offline:**
   * Cache local via IndexedDB do navegador para continuidade de uso mesmo em conexões instáveis.

---

## 🛠️ Tecnologias Utilizadas

* **Frontend:** React 18 + TypeScript + Vite.
* **Estilização e UX:** Tailwind CSS + Lucide Icons (design moderno e responsivo mobile-first).
* **Backend & Banco de Dados:** Firebase Client SDK v10 (Authentication + Cloud Firestore).
* **Qualidade de Software:** Vitest + React Testing Library (TDD com cobertura de testes unitários e de integração).

---

## 💻 Como Rodar o Projeto Localmente

### Pré-requisitos
* Node.js instalado (versão 18 ou superior).
* Git instalado.

### Passo a Passo
1. Clone o repositório:
```bash
git clone https://github.com/SEU_USUARIO/Projeto-Extensao.git
cd Projeto-Extensao
```

2. Instale as dependências:
```bash
npm install
```

3. Crie o arquivo de variáveis de ambiente com base no exemplo:
```bash
cp .env.example .env
```
*(Se você ainda não configurou o Firebase, o app funciona normalmente em modo demonstração local no navegador)*.

4. Execute o servidor de desenvolvimento:
```bash
npm run dev
```
Abra o navegador no endereço indicado (geralmente `http://localhost:5173`).

5. Para rodar a suíte de testes automatizados:
```bash
npm test
```

---

## 🌐 Guia Didático: Como Criar seu Firebase Gratuito (Passo a Passo)

O sistema foi concebido para rodar **100% no Plano Spark (gratuito perpétuo do Firebase)**, sem necessidade de cartão de crédito:

1. Acesse o [Console do Firebase](https://console.firebase.google.com/) com sua conta Google.
2. Clique em **"Adicionar projeto"** e dê um nome (ex: `meu-estoque-gratis`).
3. Desative o Google Analytics (opcional) e clique em **"Criar projeto"**.
4. No menu lateral:
   * Acesse **Build > Authentication** > Clique em **"Primeiros passos"** > Ative os provedores **E-mail/senha** e **Google**.
   * Acesse **Build > Firestore Database** > Clique em **"Criar banco de dados"** > Escolha o local padrão (ex: `southamerica-east1` ou `us-central1`) e selecione o modo de teste ou cole as regras de `firestore.rules`.
5. Na página inicial do projeto no Firebase, clique no ícone da Web (`</>`) para registrar uma aplicação web.
6. Copie as chaves geradas (`apiKey`, `authDomain`, `projectId`, etc.) e cole no seu arquivo `.env`:
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=meu-estoque-gratis.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=meu-estoque-gratis
VITE_FIREBASE_STORAGE_BUCKET=meu-estoque-gratis.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789...
VITE_FIREBASE_APP_ID=1:123456789:web:...
```

---

## ☁️ Como Publicar Gratuitamente na Nuvem (Vercel ou Firebase Hosting)

### Opção A: Deploy Grátis na Vercel (Recomendado - 1 Clique)
1. Crie uma conta gratuita em [Vercel.com](https://vercel.com).
2. Conecte sua conta do GitHub e importe este repositório.
3. Na seção **Environment Variables**, adicione as mesmas variáveis do seu arquivo `.env`.
4. Clique em **Deploy**. Seu sistema estará online em menos de 2 minutos com link seguro HTTPS!

### Opção B: Deploy com Firebase Hosting
1. No terminal do projeto, instale o CLI do Firebase:
```bash
npm install -g firebase-tools
```
2. Faça login e inicialize o hosting:
```bash
firebase login
firebase init hosting
```
*(Indique a pasta `dist` como diretório público e responda 'Sim' para single-page app).*
3. Gere o build e faça o deploy:
```bash
npm run build
firebase deploy --only hosting
```

---

## 👥 Equipe de Desenvolvimento (UCB)

* **Guilherme de Andrade Barbosa** – UC24101201 (Engenharia de Software)
* **Leticia da Costa Ferreira** – UC25200227 (Engenharia de Software)
* **Thiago Alves do Rêgo** – UC24103048 (Engenharia de Software)
* **Pedro Lucas Lopes de Melo** – UC24101086 (Engenharia de Software)
* **Professor Orientador:** Marco Antonio de Abreu Machado
