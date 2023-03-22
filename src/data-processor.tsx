import { read, utils, writeFileXLSX } from "xlsx";
import i18next from "./i18n";

const inputBaseKeys = [
  "Firma / organisation",
  "Vorname / prénom",
  "Name / nom",
  "Sprache / langue",
  "Geschlecht / genre",
  "Anrede / appel (formel)",
  "Anrede / appel (informel)",
  "Titel / titre",
  "Strasse / rue",
  "Adresszusatz / complément d’adresse",
  "PLZ / code postal",
  "Ort / localité",
  "Land / pays",
  "Paar-Kategorie / type de couple",
  "Partnerin-Anrede / appel de la partenaire (formel)",
  "Partnerin-Anrede / appel de la partenaire (informel)",
  "Wohnt mit (Vorname) / habite avec (prénom)",
  "Wohnt mit (Name) / habite avec (nom)",
  "E-Mail / courriel 1",
  "E-Mail / courriel 2",
  "Mitglieder ID / n° de membre",
] as const;

const inputInvoiceDEKeys = [
  "Status",
  "Erstellt am",
  "Titel",
  "Betrag",
  "Restbetrag",
  "Beleg Nr.",
  "Rechnungs ID",
] as const;

const inputInvoiceFRKeys = [
  "Statut",
  "créé le",
  "Titre",
  "montant",
  "solde",
  "pièce comptable n°",
  "n° (ID) de la facture",
] as const;

const generatedInvoiceKeys = ["Account", "Reference"] as const;

const generatedOutputKeys = [
  "Adressline 1",
  "Adressline 2",
  "Greeting informal",
  "Greeting formal",
  ...generatedInvoiceKeys,
] as const;

type InputBase<T> = {
  [K in typeof inputBaseKeys[number]]?: T;
};

type InputInvoiceDE<T> = {
  [K in typeof inputInvoiceDEKeys[number]]?: T;
};

type InputInvoiceFR<T> = {
  [K in typeof inputInvoiceFRKeys[number]]?: T;
};

interface InputData<T>
  extends InputBase<T>,
    InputInvoiceDE<T>,
    InputInvoiceFR<T> {
  // more columns may be present
}

type GeneratedInvoice = {
  [K in typeof generatedInvoiceKeys[number]]?: string | null;
};

type GeneratedOutput = {
  [K in typeof generatedOutputKeys[number]]?: string | null;
};

interface OutputData<T>
  extends InputBase<T>,
    InputInvoiceDE<T>,
    InputInvoiceFR<T>,
    GeneratedOutput {}

type RecordType =
  | "company_person"
  | "company"
  | "partner_identical_name"
  | "partner"
  | "single";
type RecordLang = "d" | "f";

export function processExcel(
  buffer: string | ArrayBuffer | null,
  iban: string
) {
  // read excel
  const workbook = read(buffer);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const headers = utils.sheet_to_json(sheet, { header: 1 })[0] as string[];
  const data = utils.sheet_to_json<InputData<any>>(sheet);

  // validate data
  if (!data || data.length < 1) throw new Error(i18next.t("no-data"));
  validateMemberColumns(headers);
  if (iban.length > 0) validateInvoiceColumns(headers);

  // detect correct invoice columns
  const invoiceColumns = getInvoiceColumns(headers);

  // process data: where the magic happens
  const outputCols = [
    ...generatedOutputKeys,
    ...inputBaseKeys,
    ...invoiceColumns,
  ];
  data.map((row, index) => {
    data[index] = processRow(row, iban, outputCols);
  });

  // create a new excel file with the processed data and download it
  const ws = utils.json_to_sheet(data, {
    header: [...generatedOutputKeys, ...inputBaseKeys, ...invoiceColumns],
  });
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Data");
  writeFileXLSX(wb, "mailing.xlsx", { compression: true });
}

function validateMemberColumns(columnKeys: string[]) {
  if (inputBaseKeys.every((key) => columnKeys.includes(key))) {
    return;
  }

  const missingColumns = inputBaseKeys.filter(
    (key) => !columnKeys.includes(key)
  );
  throw new Error(
    i18next.t("missing-columns", { missingColumns: missingColumns.join(", ") })
  );
}

function validateInvoiceColumns(columnKeys: string[]) {
  if (
    inputInvoiceDEKeys.every((key) => columnKeys.includes(key)) ||
    inputInvoiceFRKeys.every((key) => columnKeys.includes(key))
  ) {
    return;
  }

  const missingColumnsDE = inputInvoiceDEKeys.filter(
    (key) => !columnKeys.includes(key)
  );
  const missingColumnsFR = inputInvoiceFRKeys.filter(
    (key) => !columnKeys.includes(key)
  );

  if (
    missingColumnsDE.length === inputInvoiceDEKeys.length &&
    missingColumnsFR.length === inputInvoiceFRKeys.length
  ) {
    throw new Error(i18next.t("missing-invoice-columns-all"));
  }

  const missing =
    missingColumnsDE.length < missingColumnsFR.length
      ? missingColumnsDE
      : missingColumnsFR;

  throw new Error(
    i18next.t("missing-invoice-columns", {
      missingColumns: missing.join(", "),
    })
  );
}

function getInvoiceColumns(columnKeys: string[]) {
  if (inputInvoiceDEKeys.every((key) => columnKeys.includes(key)))
    return [...inputInvoiceDEKeys];
  if (inputInvoiceFRKeys.every((key) => columnKeys.includes(key)))
    return [...inputInvoiceFRKeys];
  return [];
}

function processRow(
  row: InputData<any>,
  iban: string,
  outputCols: string[]
): OutputData<any> {
  const sanitizedRow = sanitizeRow({ ...row }, outputCols);

  const type = detectRecordType(sanitizedRow);
  const lang = detectLang(sanitizedRow);

  const invoiceData: GeneratedInvoice = {};
  if (iban.length > 0) {
    invoiceData.Account = iban;
    invoiceData.Reference = getReferenceNum(
      sanitizedRow["Rechnungs ID"] || sanitizedRow["n° (ID) de la facture"]
    );
  }

  return {
    "Adressline 1": getFirstAddressLine(sanitizedRow, type),
    "Adressline 2": getSecondAddressLine(sanitizedRow, type),
    "Greeting informal": getGreetingInformal(sanitizedRow, type, lang),
    "Greeting formal": getGreetingFormal(sanitizedRow, type, lang),
    ...invoiceData,
    ...sanitizedRow,
  };
}

function sanitizeRow(
  row: {[key: string]: any},
  outputCols: string[]
): InputData<string> {
  // remove all columns that are not required by the output cols
  Object.keys(row).forEach((key) => {
    if (!outputCols.includes(key)) {
      delete row[key];
    }
  });

  // ensure all values are strings
  Object.keys(row).forEach((key) => {
    if (typeof row[key] === "undefined") {
      row[key] = "";
    } else if (row[key] === null) {
      row[key] = "";
    } else {
      row[key] = row[key].toString().trim();
    }
  });
  return row;
}

function detectRecordType(row: InputData<string>): RecordType {
  if (
    !empty(row, "Firma / organisation") &&
    !empty(row, "Vorname / prénom") &&
    !empty(row, "Name / nom")
  ) {
    return "company_person";
  }

  if (!empty(row, "Firma / organisation")) {
    return "company";
  }

  if (
    !empty(row, "Wohnt mit (Vorname) / habite avec (prénom)") &&
    empty(row, "Wohnt mit (Name) / habite avec (nom)") &&
    !empty(row, "Vorname / prénom") &&
    !empty(row, "Name / nom")
  ) {
    return "partner_identical_name";
  }

  if (
    !empty(row, "Wohnt mit (Vorname) / habite avec (prénom)") &&
    !empty(row, "Wohnt mit (Name) / habite avec (nom)") &&
    !empty(row, "Vorname / prénom") &&
    !empty(row, "Name / nom")
  ) {
    if (row["Wohnt mit (Name) / habite avec (nom)"] === row["Name / nom"]) {
      return "partner_identical_name";
    } else {
      return "partner";
    }
  }

  return "single";
}

function detectLang(row: InputData<string>): RecordLang {
  if (
    !empty(row, "Sprache / langue") &&
    ["d", "f"].includes(row["Sprache / langue"] || "")
  ) {
    return row["Sprache / langue"] as RecordLang;
  }

  if (
    !empty(row, "Anrede / appel (formel)") &&
    ["Madame", "Monsieur", "Madame & Monsieur"].includes(
      row["Anrede / appel (formel)"] || ""
    )
  ) {
    return "f";
  }

  if (
    !empty(row, "Anrede / appel (informel)") &&
    ["Chère", "Cher", "Chères & Chers"].includes(
      row["Anrede / appel (informel)"] || ""
    )
  ) {
    return "f";
  }

  return "d";
}

function getFirstAddressLine(
  row: InputData<string>,
  type: RecordType
): string | null {
  switch (type) {
    case "company_person":
      return !empty(row, "Firma / organisation")
        ? row["Firma / organisation"]!
        : null;
    case "company":
      return null;
    case "partner_identical_name":
    case "partner":
      if (
        !empty(row, "Anrede / appel (formel)") &&
        !empty(row, "Partnerin-Anrede / appel de la partenaire (formel)")
      ) {
        return `${row["Anrede / appel (formel)"]} & ${row["Partnerin-Anrede / appel de la partenaire (formel)"]}`;
      } else {
        return null;
      }
    case "single":
    default:
      return !empty(row, "Anrede / appel (formel)")
        ? row["Anrede / appel (formel)"]!
        : null;
  }
}

function getSecondAddressLine(
  row: InputData<string>,
  type: RecordType
): string | null {
  const company = row["Firma / organisation"] || "";
  const firstName = row["Vorname / prénom"] || "";
  const lastName = row["Name / nom"] || "";
  const partnerFirstName =
    row["Wohnt mit (Vorname) / habite avec (prénom)"] || "";
  const partnerLastName = row["Wohnt mit (Name) / habite avec (nom)"] || "";

  switch (type) {
    case "company_person":
      return `${firstName} ${lastName}`.trim();
    case "company":
      return `${company}`;
    case "partner_identical_name":
      return `${[firstName, partnerFirstName].join(" & ")} ${lastName}`.trim();
    case "partner":
      return [
        `${firstName} ${lastName}`,
        `${partnerFirstName} ${partnerLastName}`,
      ].join(" & ");
    case "single":
    default:
      return `${firstName} ${lastName}`.trim();
  }
}

function getGreetingInformal(
  row: InputData<string>,
  type: RecordType,
  lang: RecordLang
) {
  switch (`${type}_${lang}`) {
    case "company_person_d":
      if (
        !empty(row, "Vorname / prénom") &&
        !empty(row, "Anrede / appel (informel)")
      ) {
        return `${row["Anrede / appel (informel)"]} ${row["Vorname / prénom"]}`;
      }
      if (!empty(row, "Vorname / prénom")) {
        return `Hallo ${row["Vorname / prénom"]}`;
      }

      return "Guten Tag";

    case "company_person_f":
      if (
        !empty(row, "Vorname / prénom") &&
        !empty(row, "Anrede / appel (informel)")
      ) {
        return `${row["Anrede / appel (informel)"]} ${row["Vorname / prénom"]},`;
      }

      return "Bonjour,";

    case "company_d":
      if (!empty(row, "Firma / organisation")) {
        return `Hallo ${row["Firma / organisation"]}`;
      }

      return "Guten Tag";

    case "company_f":
      return "Bonjour,";

    case "partner_identical_name_d":
    case "partner_d":
      if (
        !empty(row, "Vorname / prénom") &&
        !empty(row, "Anrede / appel (informel)") &&
        !empty(row, "Wohnt mit (Vorname) / habite avec (prénom)") &&
        !empty(row, "Partnerin-Anrede / appel de la partenaire (informel)")
      ) {
        return `${row["Anrede / appel (informel)"]} ${
          row["Vorname / prénom"]
        }, ${(
          row["Partnerin-Anrede / appel de la partenaire (informel)"] || ""
        ).toLocaleLowerCase()} ${
          row["Wohnt mit (Vorname) / habite avec (prénom)"]
        }`;
      }

      if (
        !empty(row, "Vorname / prénom") &&
        !empty(row, "Wohnt mit (Vorname) / habite avec (prénom)")
      ) {
        return `Hallo ${row["Vorname / prénom"]} & ${row["Wohnt mit (Vorname) / habite avec (prénom)"]}`;
      }

      return "Guten Tag";

    case "partner_identical_name_f":
    case "partner_f":
      if (
        !empty(row, "Vorname / prénom") &&
        !empty(row, "Anrede / appel (informel)") &&
        !empty(row, "Wohnt mit (Vorname) / habite avec (prénom)") &&
        !empty(row, "Partnerin-Anrede / appel de la partenaire (informel)")
      ) {
        return `${row["Anrede / appel (informel)"]} ${
          row["Vorname / prénom"]
        }, ${(
          row["Partnerin-Anrede / appel de la partenaire (informel)"] || ""
        ).toLocaleLowerCase()} ${
          row["Wohnt mit (Vorname) / habite avec (prénom)"]
        },`;
      }

      if (
        !empty(row, "Vorname / prénom") &&
        !empty(row, "Wohnt mit (Vorname) / habite avec (prénom)")
      ) {
        return `Chers ${row["Vorname / prénom"]} & ${row["Wohnt mit (Vorname) / habite avec (prénom)"]},`;
      }

      return "Bonjour,";

    case "single_d":
      if (
        !empty(row, "Vorname / prénom") &&
        !empty(row, "Anrede / appel (informel)")
      ) {
        return `${row["Anrede / appel (informel)"]} ${row["Vorname / prénom"]}`;
      }
      if (!empty(row, "Vorname / prénom")) {
        return `Hallo ${row["Vorname / prénom"]}`;
      }

      return "Guten Tag";

    case "single_f":
      if (
        !empty(row, "Vorname / prénom") &&
        !empty(row, "Anrede / appel (informel)")
      ) {
        return `${row["Anrede / appel (informel)"]} ${row["Vorname / prénom"]},`;
      }

      return "Bonjour,";

    default:
      return null;
  }
}

function getGreetingFormal(
  row: InputData<string>,
  type: RecordType,
  lang: RecordLang
) {
  switch (`${type}_${lang}`) {
    case "company_person_d":
      if (
        !empty(row, "Name / nom") &&
        !empty(row, "Anrede / appel (formel)") &&
        !empty(row, "Anrede / appel (informel)")
      ) {
        return `${row["Anrede / appel (informel)"]} ${row["Anrede / appel (formel)"]} ${row["Name / nom"]}`;
      }
      if (!empty(row, "Vorname / prénom") && !empty(row, "Name / nom")) {
        return `Guten Tag ${row["Vorname / prénom"]} ${row["Name / nom"]}`;
      }

      return "Sehr geehrte Damen und Herren";

    case "company_person_f":
      if (!empty(row, "Name / nom") && !empty(row, "Anrede / appel (formel)")) {
        return `${row["Anrede / appel (formel)"]} ${row["Name / nom"]},`;
      }

      return "Mesdames et Messieurs,";

    case "company_d":
      return "Sehr geehrte Damen und Herren";

    case "company_f":
      return "Mesdames et Messieurs,";

    case "partner_identical_name_d":
    case "partner_d":
      if (
        !empty(row, "Name / nom") &&
        !empty(row, "Anrede / appel (informel)") &&
        !empty(row, "Anrede / appel (formel)") &&
        !empty(row, "Wohnt mit (Name) / habite avec (nom)") &&
        !empty(row, "Partnerin-Anrede / appel de la partenaire (informel)") &&
        !empty(row, "Partnerin-Anrede / appel de la partenaire (formel)")
      ) {
        return `${row["Anrede / appel (informel)"]} ${
          row["Anrede / appel (formel)"]
        } ${row["Name / nom"]}, ${(
          row["Partnerin-Anrede / appel de la partenaire (informel)"] || ""
        ).toLocaleLowerCase()} ${
          row["Partnerin-Anrede / appel de la partenaire (formel)"]
        } ${row["Wohnt mit (Name) / habite avec (nom)"]}`;
      }

      if (
        !empty(row, "Vorname / prénom") &&
        !empty(row, "Wohnt mit (Vorname) / habite avec (prénom)") &&
        !empty(row, "Wohnt mit (Name) / habite avec (nom)") &&
        !empty(row, "Name / nom")
      ) {
        return `Guten Tag ${row["Vorname / prénom"]} ${row["Name / nom"]} & ${row["Wohnt mit (Vorname) / habite avec (prénom)"]} ${row["Wohnt mit (Name) / habite avec (nom)"]}`;
      }

      return "Guten Tag";

    case "partner_identical_name_f":
    case "partner_f":
      if (
        !empty(row, "Name / nom") &&
        !empty(row, "Anrede / appel (informel)") &&
        !empty(row, "Anrede / appel (formel)") &&
        !empty(row, "Wohnt mit (Name) / habite avec (nom)") &&
        !empty(row, "Partnerin-Anrede / appel de la partenaire (informel)") &&
        !empty(row, "Partnerin-Anrede / appel de la partenaire (formel)")
      ) {
        return `${row["Anrede / appel (informel)"]} ${
          row["Anrede / appel (formel)"]
        } ${row["Name / nom"]}, ${(
          row["Partnerin-Anrede / appel de la partenaire (informel)"] || ""
        ).toLocaleLowerCase()} ${
          row["Partnerin-Anrede / appel de la partenaire (formel)"]
        } ${row["Wohnt mit (Name) / habite avec (nom)"]},`;
      }

      if (
        !empty(row, "Vorname / prénom") &&
        !empty(row, "Wohnt mit (Vorname) / habite avec (prénom)") &&
        !empty(row, "Wohnt mit (Name) / habite avec (nom)") &&
        !empty(row, "Name / nom")
      ) {
        return `Bonjour ${row["Vorname / prénom"]} ${row["Name / nom"]} & ${row["Wohnt mit (Vorname) / habite avec (prénom)"]} ${row["Wohnt mit (Name) / habite avec (nom)"]},`;
      }

      return "Mesdames et Messieurs,";

    case "single_d":
      if (
        !empty(row, "Name / nom") &&
        !empty(row, "Anrede / appel (formel)") &&
        !empty(row, "Anrede / appel (informel)")
      ) {
        return `${row["Anrede / appel (informel)"]} ${row["Anrede / appel (formel)"]} ${row["Name / nom"]}`;
      }

      if (!empty(row, "Name / nom") && !empty(row, "Vorname / prénom")) {
        return `Guten Tag ${row["Vorname / prénom"]} ${row["Name / nom"]}`;
      }

      return "Guten Tag";

    case "single_f":
      if (
        !empty(row, "Name / nom") &&
        !empty(row, "Anrede / appel (formel)") &&
        !empty(row, "Anrede / appel (informel)")
      ) {
        return `${row["Anrede / appel (informel)"]} ${row["Anrede / appel (formel)"]} ${row["Name / nom"]},`;
      }

      return "Bonjour,";

    default:
      return null;
  }
}

function empty(obj: { [key: string]: any }, key: string) {
  return (
    !(key in obj) ||
    obj[key] === undefined ||
    obj[key] === null ||
    obj[key] === ""
  );
}

function getReferenceNum(invoiceNum: string | undefined) {
  if (invoiceNum === undefined) {
    return "";
  }

  // generate reference number
  let referenceNum = `${invoiceNum}${mod10recursive(invoiceNum)}`;
  referenceNum = referenceNum.padStart(27, "0");

  // format it
  const length = referenceNum.length;
  for (let i = length; i > 0; i -= 5) {
    referenceNum = `${referenceNum.slice(0, i)} ${referenceNum.slice(i)}`;
  }

  return referenceNum.trim();
}

/**
 * Return checksum of given number using the modulo 10 recursive method
 *
 * Google "Recordstrukturen Elektronische Dienstleistungen Postfinance" for more information
 */
function mod10recursive(num: string): number {
  const table = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];
  let carry = 0;

  num.split("").forEach((digit) => {
    carry = table[(carry + parseInt(digit)) % 10];
  });

  return (10 - carry) % 10;
}
