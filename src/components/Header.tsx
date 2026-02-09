import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "./LanguageToggle";
import logo from "@/assets/logo.png";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();

  const navItems = [
    { name: t("nav.solutions"), href: "/solucoes" },
    { name: t("nav.about"), href: "/sobre" },
    { name: t("nav.contact"), href: "/contato" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
      <nav className="section-container flex items-center justify-between py-4">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img src={logo} alt="DeFarm" className="h-8 sm:h-10" />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "text-muted-foreground hover:text-foreground transition-colors font-medium",
                location.pathname === item.href && "text-foreground"
              )}
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* CTA + Language */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageToggle />
          <Button className="btn-offset bg-primary hover:bg-primary text-primary-foreground font-semibold px-6 rounded-lg">
            {t("nav.requestAccess")}
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-2">
          <LanguageToggle />
          <button
            className="p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-background border-b border-border">
          <div className="section-container py-4 space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "block text-muted-foreground hover:text-foreground transition-colors font-medium py-2",
                  location.pathname === item.href && "text-foreground"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              {t("nav.requestAccess")}
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
