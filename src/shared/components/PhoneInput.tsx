import React from 'react';
import { PhoneInput as InternationalPhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';

interface PhoneInputProps {
  value: string;
  onChange: (phone: string, meta: { country: any; inputValue: string }) => void;
  label?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({ value, onChange, label }) => {
  return (
    <div>
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <InternationalPhoneInput
        defaultCountry="sn"
        preferredCountries={['sn', 'fr']}
        value={value}
        onChange={(phone, meta) => onChange(phone, meta)}
        className="champ mt-1 w-full"
      />
    </div>
  );
};
