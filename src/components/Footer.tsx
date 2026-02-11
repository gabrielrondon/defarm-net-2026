import { Link } from "react-router-dom";
import { Linkedin } from "lucide-react";
import { useTranslation } from "react-i18next";
import logoIcon from "@/assets/logo-icon.png";

export function Footer() {
  const { t } = useTranslation();

  const footerLinks = {
    produto: [
      { name: t("footer.traceability"), href: "/solucoes" },
      { name: t("footer.compliance"), href: "/solucoes" },
      { name: t("footer.tokenization"), href: "/solucoes" },
    ],
    empresa: [
      { name: t("footer.aboutUs"), href: "/sobre" },
      { name: t("footer.contact"), href: "/contato" },
    ],
  };

  return (
    <footer className="bg-foreground text-background">
      <div className="section-container py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img src={logoIcon} alt="DeFarm" className="h-10 w-10" />
              <span className="text-2xl font-bold">DeFarm</span>
            </div>
            <p className="text-background/70 max-w-sm mb-6">
              {t("footer.description")}
            </p>
            <div className="flex gap-4">
              <a href="https://www.linkedin.com/company/106642089/" target="_blank" rel="noopener noreferrer" className="text-background/70 hover:text-primary transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="https://x.com/DeFarm_Net" target="_blank" rel="noopener noreferrer" className="text-background/70 hover:text-primary transition-colors">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">{t("footer.product")}</h4>
            <ul className="space-y-3">
              {footerLinks.produto.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-background/70 hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t("footer.company")}</h4>
            <ul className="space-y-3">
              {footerLinks.empresa.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-background/70 hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-background/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-background/70 text-sm">
            {t("footer.rights")}
          </p>
          <div className="flex gap-6 text-sm">
            <Link to="/privacidade" className="text-background/70 hover:text-primary transition-colors">
              {t("footer.privacy")}
            </Link>
            <Link to="/termos" className="text-background/70 hover:text-primary transition-colors">
              {t("footer.terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
