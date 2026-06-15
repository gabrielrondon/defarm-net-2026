import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Ao trocar de rota (pathname), rola pro topo da página nova. Sem isso, o
// React Router preserva a posição de scroll anterior (a página "começa no meio").
// Não interfere em navegação por âncora (#hash), que tem o próprio comportamento.
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return; // deixa o salto pra âncora (#personas, #verificar) funcionar
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);

  return null;
}
