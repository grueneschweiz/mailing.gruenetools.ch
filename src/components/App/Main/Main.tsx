import "./Main.css";
import "../../../i18n";
import { useTranslation } from "react-i18next";
import Uploader from "./Uploader/Uploader";
import IbanInput from "./IbanInput/IbanInput";
import { useState } from "react";

const LOCAL_STORAGE_IBAN = "iban";
const LOCAL_STORAGE_INVOICE = "invoice";

const INVOICES = "invoices";
const ADDRESSES_ONLY = "addresses-only";

export default function Main() {
  const { t } = useTranslation();
  const [iban, setIban] = useState(
    () => localStorage.getItem(LOCAL_STORAGE_IBAN) || ""
  );
  const [makeInvoices, setMakeInvoices] = useState(
    () => localStorage.getItem(LOCAL_STORAGE_INVOICE) === INVOICES
  );

  function handleIbanInput(value: string) {
    localStorage.setItem(LOCAL_STORAGE_IBAN, value);
    setIban(value);
  }

  function handleInvoiceChange(e: React.ChangeEvent<HTMLInputElement>) {
    localStorage.setItem(LOCAL_STORAGE_INVOICE, e.currentTarget.value);
    setMakeInvoices(e.currentTarget.value === INVOICES);
  }

  const linkToWebling = makeInvoices
    ? "https://gps.webling.ch/admin#/accounting"
    : "https://gps.webling.ch/admin#/members/find";

  return (
    <main>
      <h1>{t("title")}</h1>
      <p>{t("intro")}</p>

      <div className="main__type-selector-container">
        <label
          htmlFor="addresses-only"
          className={"main__type-selector" + (!makeInvoices ? " active" : "")}
        >
          <input
            type="radio"
            name="invoice"
            id="addresses-only"
            className="main__type-selector-input"
            value={ADDRESSES_ONLY}
            checked={!makeInvoices}
            onChange={handleInvoiceChange}
          />
          {t("addresses-only")}
        </label>
        <label
          htmlFor="invoices"
          className={"main__type-selector" + (makeInvoices ? " active" : "")}
        >
          <input
            type="radio"
            name="invoice"
            id="invoices"
            className="main__type-selector-input"
            value={INVOICES}
            checked={makeInvoices}
            onChange={handleInvoiceChange}
          />{" "}
          {t("invoices")}
        </label>
      </div>

      <div className="main__action-box">
        <ol>
          {makeInvoices && <li>{t("step-3")}</li>}
          {makeInvoices && <IbanInput value={iban} onInput={handleIbanInput} />}
          <li>
            <span
              dangerouslySetInnerHTML={{
                __html: t("step-1", {
                  link: `<a href="${linkToWebling}" target="_blank">Webling</a>`,
                }),
              }}
            />
            <ul>
              <li dangerouslySetInnerHTML={{ __html: t("step-1-1") }} />
              {makeInvoices && (
                <li dangerouslySetInnerHTML={{ __html: t("step-1-2") }} />
              )}
            </ul>
          </li>
          <li>{t("step-2")}</li>
        </ol>
        <Uploader iban={makeInvoices ? iban : ""} />
      </div>
    </main>
  );
}