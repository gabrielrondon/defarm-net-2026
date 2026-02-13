# DeFarm Net - Sync Repository

Este repositório funciona como espelho de [watiinspired-design](https://github.com/defarm-repo/watiinspired-design) para deploy automático no Netlify.

## 🔄 Fluxo de Sincronização

```
defarm-repo/watiinspired-design  →  gabrielrondon/defarm-net-2026  →  Netlify Deploy
         (upstream)                        (origin)                    (automático)
```

## 🚀 Como sincronizar

Quando houver atualizações no repositório original, execute:

```bash
./sync.sh
```

Isso vai:
1. ⬇️ Fazer **pull** do repo original (`upstream`)
2. ⬆️ Fazer **push** para o repo pessoal (`origin`)
3. 🚀 Netlify detecta e faz **deploy** automaticamente

## 📋 Setup inicial (já feito)

```bash
# Remote origin (seu repo pessoal)
git remote add origin git@github.com:gabrielrondon/defarm-net-2026.git

# Remote upstream (repo original)
git remote add upstream git@github.com:defarm-repo/watiinspired-design.git
```

## 🔗 Links

- **Repo Original:** https://github.com/defarm-repo/watiinspired-design
- **Repo Pessoal:** https://github.com/gabrielrondon/defarm-net-2026
- **Deploy Netlify:** Configurado no dashboard

## 🛠️ Desenvolvimento local

```bash
# Instalar dependências
npm install

# Rodar dev server
npm run dev

# Build
npm run build
```

## 📦 Tecnologias

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
