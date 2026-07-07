// A lista de circuitos vive em rotas diferentes conforme o workspace: parceiros
// veem "Meus Circuitos" (/app/meus-circuitos, único item no menu deles), todos os
// outros tipos veem /app/circuitos. Componentes de circuito são compartilhados por
// todos os tipos, então ao voltar pra lista precisam resolver a rota pelo contexto
// — senão o parceiro cai numa tela fora do próprio menu (#8).
export function circuitsListPath(workspaceType?: string | null): string {
  return workspaceType === "partner" ? "/app/meus-circuitos" : "/app/circuitos";
}
