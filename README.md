# ALLNOVA

Aplicativo de gestão completa para donos de lojas de moda: produtos, estoque, vendas, financeiro, relatórios, catálogo, fornecedores, equipe e a assistente Nova.

## Como rodar

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`. Para testar no celular, use o endereço de rede que o terminal mostra (o computador e o celular precisam estar no mesmo Wi-Fi).

Outros comandos: `npm run build` (gera a versão final em `dist/`), `npm run preview` (abre essa versão) e `npm run typecheck`.

## Seções

| Seção | O que faz |
|---|---|
| Início | Resumo do dia: faturamento, meta do mês, semana, insights, reposição, mais vendidos e equipe |
| Gestão | Evolução semanal e mensal, comparação com o período anterior e indicadores de saúde da loja |
| Financeiro | Meta de faturamento, despesas, lucro bruto e líquido, valor do estoque |
| Relatórios | Vendas e faturamento por semana ou mês, com exportação em CSV e impressão |
| Produtos | Cadastro numerado com fotos, tamanhos, marca, preço, custo e categorias |
| Estoque | Quantidade por tamanho, entradas, saídas e contagens |
| Reposição | Avisos do que está acabando, sugestão de compra e pedido ao fornecedor pelo WhatsApp |
| Catálogo | Seleções de produtos para enviar ao cliente (WhatsApp, compartilhamento com fotos, PDF) |
| Fornecedores | Seus contatos, contatos VIP (pagos) e comparação de preços por categoria |
| Equipe | Funcionários, metas mensais e comissões |
| Nova IA | Assistente que responde sobre estoque, financeiro e relatórios |

## Como os dados funcionam

- Tudo fica salvo no navegador do aparelho (IndexedDB). Não há servidor nem conta nesta versão.
- **A Nova trabalha apenas com os dados cadastrados na loja.** A análise roda no próprio aparelho, em `src/lib/ai.ts`, sem chamar nenhuma API externa.
- Em Ajustes dá para exportar e restaurar um backup, carregar a loja de demonstração ou começar do zero.

## Estrutura

```
design/          logo e referências visuais
public/          ícones do app (recortados da logo)
src/
  pages/         uma tela por seção
  components/    estrutura (Shell), gráficos, modais e componentes base
  lib/           cálculos (analytics), assistente (ai), insights, datas e formatação
  store/         dados da loja (store), loja de demonstração (seed), conversa e interface
```

## Ainda não incluído

- Login e sincronização entre aparelhos (hoje cada aparelho tem os seus dados).
- Cobrança do plano VIP: a área funciona em modo de demonstração, com contatos de exemplo.
- Link público do catálogo: o envio é feito por mensagem, fotos ou PDF.
