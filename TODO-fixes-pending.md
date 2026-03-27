# Fixes Pendentes — PublicItem

## Prioridade alta (UX quebrada)

- [ ] **Mapa propriedade overflow** — o mini-mapa PropertyMapMini está saindo do card. Precisa `overflow-hidden` no container ou review do height
- [ ] **QR code overlay** — quando expande o QR code do AssetQRCode, parece sobrepor outros cards. Verificar z-index
- [ ] **Jornada → mover** — seção "Jornada do Animal" deve ficar logo abaixo do card de propriedade atual (beta), não abaixo dos metadados

## Prioridade média (consistência)

- [ ] **QR codes do embed e selo** — substituir `api.qrserver.com` pelo componente AssetQRCode com logo DeFarm SVG
- [ ] **Idioma EN nos cards beta** — sanidade, propriedade, peso, previsões não traduzem quando muda pra EN. Precisa usar `metadataLocale` pra labels
- [ ] **Tour expandir** — cobrir todos os features, não só os beta (incluir QR, blockchain, metadados)

## Nice-to-have

- [ ] **Ordem final das seções (beta)**: Header → QR → Propriedade → Jornada → Sanidade → Peso → Previsões → Metadados → Blockchain → Timeline
- [ ] **Comparador link** — adicionar link pro comparador em algum lugar acessível (toolbar ou footer)
