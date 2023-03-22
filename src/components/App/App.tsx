import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./App.css";
import Footer from "./Footer/Footer";
import Main from "./Main/Main";


export default function App() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = `mailing.gruenetoos.ch: ${t("title")}`;
  }, []);

  return (
    <>
      <Main />
      <Footer />
    </>
  );
}