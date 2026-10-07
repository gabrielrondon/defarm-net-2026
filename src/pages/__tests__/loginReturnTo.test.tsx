import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import Login from "../Login";

const authState = { isAuthenticated: true, isLoading: false, user: { workspace_type: "producer" } };

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ ...authState, login: vi.fn() }),
}));

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname + loc.search}</div>;
}

function renderLogin(entry: string | { pathname: string; search?: string; state?: unknown }) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("login returns to the page the user came from (net#237)", () => {
  beforeEach(() => {
    authState.isAuthenticated = true;
  });

  it("goes back to the guarded page, with its query", async () => {
    renderLogin({ pathname: "/login", state: { from: "/app/configuracoes?tab=seguranca" } });
    expect((await screen.findByTestId("where")).textContent).toBe("/app/configuracoes?tab=seguranca");
  });

  it("honors a safe ?redirect= (public item page)", async () => {
    renderLogin("/login?redirect=%2Fi%2FDFID-X");
    expect((await screen.findByTestId("where")).textContent).toBe("/i/DFID-X");
  });

  it("ignores an external or protocol-relative destination and uses the default", async () => {
    renderLogin({ pathname: "/login", search: "?redirect=%2F%2Fevil.example", state: { from: "https://evil.example" } });
    expect((await screen.findByTestId("where")).textContent).toBe("/app");
  });
});
