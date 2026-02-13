#!/bin/bash

# Script de sincronização - Pull do repo original e Push para repo pessoal
# Uso: ./sync.sh

set -e

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🔄 Sincronização DeFarm Net${NC}\n"

# Pull do repo original
echo -e "${BLUE}⬇️  [1/2] Pull do repo original...${NC}"
git pull upstream main

# Push para o repo pessoal
echo -e "${BLUE}⬆️  [2/2] Push para repo pessoal...${NC}"
git push origin main

echo -e "\n${GREEN}✅ Sincronização concluída!${NC}"
echo -e "${BLUE}🚀 Netlify vai detectar e fazer deploy automático${NC}"
