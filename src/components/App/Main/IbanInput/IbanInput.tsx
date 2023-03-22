import iban from "iban";
import "./IbanInput.css";
import { useEffect, useState } from "react";

export default function IbanInput({
  value,
  onInput,
}: {
  value: string;
  onInput: (v: string) => void;
}) {
  const valid = isValidQrIban(value);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (value) {
      setTouched(true);
    }
  }, [])

  const validityClass = () => {
    if (!touched) return "";
    return valid ? "valid" : "invalid"
  };

  return (
    <div className="iban-input">
      <input
        id="iban"
        className={`iban-input__input ${validityClass()}`}
        type="text"
        placeholder="CH00 0000 0000 0000 0000 0"
        value={value}
        onInput={(e) => onInput(e.currentTarget.value)}
        onFocus={() => setTouched(true)}
        maxLength={26}
      />
      {touched && (
        <div className="input__input-hint">
          {valid && <>✅</>}
          {!valid && <>❌</>}
        </div>
      )}
    </div>
  );
}

function isValidQrIban(value: string) {
  if (!value) return false;

  const validIban = iban.isValid(value);
  const isQRIban =
    null !== value.match(/^(CH|LI)\d{2}\s?3[01]\d{2}(\s?\d{4}){3}\s?\d$/);
  return validIban && isQRIban;
}
