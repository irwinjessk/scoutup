import PhoneInput from 'react-phone-number-input'
import fr from 'react-phone-number-input/locale/fr'
import flags from 'react-phone-number-input/flags'

import { cn } from '@/lib/utils'

import 'react-phone-number-input/style.css'

/**
 * Saisie téléphone internationale (défaut Côte d'Ivoire).
 */
export function PhoneField({
  value,
  onChange,
  label = 'Téléphone',
  required = false,
  className,
}) {
  return (
    <label className={cn('block space-y-2 text-sm', className)}>
      <span className="text-white/70">
        {label}
        {required ? ' *' : ''}
      </span>
      <PhoneInput
        international
        defaultCountry="CI"
        countries={['CI', 'BF', 'BJ', 'ML', 'SN', 'GN', 'TG', 'NE', 'CM', 'FR']}
        labels={fr}
        flags={flags}
        value={value}
        onChange={onChange}
        numberInputProps={{
          required,
          autoComplete: 'tel',
          className:
            'PhoneInputInput h-12 w-full bg-transparent text-white outline-none placeholder:text-white/30',
        }}
        className="PhoneInput ScoutPhoneInput"
      />
    </label>
  )
}
