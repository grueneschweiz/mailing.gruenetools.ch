import { useTranslation } from "react-i18next";
import { renderToStaticMarkup } from "react-dom/server";
import "./Footer.css";

export default function Footer() {
  const { t, i18n } = useTranslation();

  const orgLink =
    i18n.language === "fr" ? "https://verts.ch" : "https://gruene.ch";
  const orgLinkTag = (
    <a href={orgLink} target="_blank">
      {t("org-name")}
    </a>
  );
  const email = i18n.language === "fr" ? "verts@verts.ch" : "gruene@gruene.ch"

  const githubLinkTag = (
    <a
      href="https://github.com/grueneschweiz/mailing.gruenetools.ch"
      target="_blank"
    >
      GitHub
    </a>
  );

  return (
    <footer className="footer">
      <p className="footer__privacy">{t("privacy")}</p>
      <div className="footer__imprint">
        <a href={orgLink} target="_blank">
          <img
            className="footer_logo"
            src="/gruene-les-vert-e-s_vector-green.svg"
            alt="Logo"
          />
        </a>
        <p>
          <strong>{orgLinkTag}</strong>
          <br />
          Waisenhausplatz 21
          <br />
          3011 Bern
          <br />
          <a className="footer_mail" href={`mailto:${email}`} target="_blank">
            {email}
          </a>
        </p>
      </div>
      <p
        className="footer__credits"
        dangerouslySetInnerHTML={{
          __html:
            t("imprint", { link: renderToStaticMarkup(orgLinkTag) }) +
            "<br>" +
            t("license", { link: renderToStaticMarkup(githubLinkTag) }),
        }}
      />
    </footer>
  );
}
