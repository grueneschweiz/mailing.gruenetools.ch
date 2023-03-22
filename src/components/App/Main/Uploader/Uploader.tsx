import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import { processExcel } from "../../../../data-processor";
import i18next from "../../../../i18n";
import "./Uploader.css";

export default function Uploader({ iban }: { iban: string }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const onDrop = (acceptedFiles: File[]) => {
    setLoading(true);
    
    // the timout is a hack to make the loading animation work
    // it makes sure, the loading state change is rendered before
    // a blocking thread starts processing the file
    window.setTimeout(() => {
      handleDrop({ acceptedFiles, iban })
        .then(() => setError(""))
        .catch((reason) => setError(reason))
        .finally(() => setLoading(false));
    }, 20);
  };

  const dropzoneConfig = {
    onDrop,
    multiple: false,
    disabled: loading,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
  };

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone(dropzoneConfig);

  if (fileRejections.length > 1 && error !== t("multiple-files")) {
    setError(t("multiple-files"));
  }

  const dropzoneClasses =
    "uploader__dropzone" +
    (isDragActive ? " dragging" : "") +
    (loading ? " loading" : "") +
    (error ? " invalid" : "");

  return (
    <>
      <div {...getRootProps()} className={dropzoneClasses}>
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>{t("dropzone-dragging")}</p>
        ) : (
          <p>{t("dropzone")}</p>
        )}
        <p className="uploader__accept">{t("dropzone-accept")}</p>
        {loading && (
          <div className="uploader__loading">
            <p className="uploader__loading-text">{t("processing")}</p>
          </div>
        )}
      </div>
      {error && <p className="uploader__error">{error}</p>}
    </>
  );
}

async function handleDrop({
  acceptedFiles,
  iban,
}: {
  acceptedFiles: File[];
  iban: string;
}) {
  if (acceptedFiles.length === 0) {
    return Promise.reject(i18next.t("no-file"));
  }

  return new Promise<void>((resolve, reject) => {
    acceptedFiles.forEach((file) => {
      const reader = new FileReader();

      reader.onabort = () => reject("File reading was aborted.");
      reader.onerror = () => reject("File reading has failed.");
      reader.onload = () => {
        try {
          processExcel(reader.result, iban);
          resolve();
        } catch (e: any) {
          reject(e.message);
        }
      };

      reader.readAsArrayBuffer(file);
    });
  });
}
