export const COUNTRY_PHONE_OPTIONS = [
  { iso2: 'IN', country: 'India', dialCode: '91' },
  { iso2: 'US', country: 'United States', dialCode: '1' },
  { iso2: 'GB', country: 'United Kingdom', dialCode: '44' },
  { iso2: 'AE', country: 'United Arab Emirates', dialCode: '971' },
  { iso2: 'SA', country: 'Saudi Arabia', dialCode: '966' },
  { iso2: 'SG', country: 'Singapore', dialCode: '65' },
  { iso2: 'AU', country: 'Australia', dialCode: '61' },
  { iso2: 'CA', country: 'Canada', dialCode: '1' },
  { iso2: 'DE', country: 'Germany', dialCode: '49' },
  { iso2: 'FR', country: 'France', dialCode: '33' },
  { iso2: 'IT', country: 'Italy', dialCode: '39' },
  { iso2: 'ES', country: 'Spain', dialCode: '34' },
  { iso2: 'BR', country: 'Brazil', dialCode: '55' },
  { iso2: 'NG', country: 'Nigeria', dialCode: '234' },
  { iso2: 'ZA', country: 'South Africa', dialCode: '27' },
  { iso2: 'ID', country: 'Indonesia', dialCode: '62' },
  { iso2: 'PH', country: 'Philippines', dialCode: '63' },
  { iso2: 'MY', country: 'Malaysia', dialCode: '60' },
  { iso2: 'TH', country: 'Thailand', dialCode: '66' },
  { iso2: 'PK', country: 'Pakistan', dialCode: '92' },
  { iso2: 'BD', country: 'Bangladesh', dialCode: '880' },
  { iso2: 'LK', country: 'Sri Lanka', dialCode: '94' },
  { iso2: 'NP', country: 'Nepal', dialCode: '977' },
];

const COUNTRY_BY_ISO2 = COUNTRY_PHONE_OPTIONS.reduce((acc, item) => {
  acc[item.iso2] = item;
  return acc;
}, {});

const DIAL_CODES_SORTED = Array.from(new Set(COUNTRY_PHONE_OPTIONS.map((item) => item.dialCode))).sort(
  (a, b) => b.length - a.length
);

export const digitsOnly = (value = '') => String(value || '').replace(/[^\d]/g, '');
export const normalizeCountryCode = (value = '') => digitsOnly(value).replace(/^0+/, '');
export const normalizeNationalNumber = (value = '') => digitsOnly(value);

export const splitCombinedPhone = (phone = '', fallbackCountryCode = '91') => {
  const combined = digitsOnly(phone);
  if (!combined) return { country_code: '', phone_number: '', phone: '' };

  const matchedDialCode = DIAL_CODES_SORTED.find((code) => combined.startsWith(code));
  if (matchedDialCode && combined.length > matchedDialCode.length + 5) {
    return {
      country_code: matchedDialCode,
      phone_number: combined.slice(matchedDialCode.length),
      phone: combined,
    };
  }

  const fallback = normalizeCountryCode(fallbackCountryCode);
  if (fallback) {
    const startsWithFallback = combined.startsWith(fallback) && combined.length > fallback.length + 5;
    if (startsWithFallback) {
      return {
        country_code: fallback,
        phone_number: combined.slice(fallback.length),
        phone: combined,
      };
    }
    return {
      country_code: fallback,
      phone_number: combined,
      phone: `${fallback}${combined}`,
    };
  }

  return { country_code: '', phone_number: combined, phone: combined };
};

export const parsePhoneInput = ({ phone = '', country_code = '', phone_number = '', default_country_code = '91' } = {}) => {
  const directCountryCode = normalizeCountryCode(country_code);
  const directPhoneNumber = normalizeNationalNumber(phone_number);
  const combined = digitsOnly(phone);

  let resolvedCountryCode = directCountryCode;
  let resolvedPhoneNumber = directPhoneNumber;
  let resolvedPhone = '';

  if (resolvedCountryCode && resolvedPhoneNumber) {
    resolvedPhone = `${resolvedCountryCode}${resolvedPhoneNumber}`;
  } else if (combined) {
    const split = splitCombinedPhone(combined, default_country_code);
    resolvedCountryCode = resolvedCountryCode || split.country_code;
    resolvedPhoneNumber = resolvedPhoneNumber || split.phone_number;
    resolvedPhone = split.phone;
  } else if (resolvedCountryCode || resolvedPhoneNumber) {
    resolvedPhone = `${resolvedCountryCode}${resolvedPhoneNumber}`;
  }

  const normalizedPhone = digitsOnly(resolvedPhone);
  const normalizedCountryCode = normalizeCountryCode(resolvedCountryCode);
  const normalizedPhoneNumber = normalizeNationalNumber(resolvedPhoneNumber || (normalizedCountryCode ? normalizedPhone.slice(normalizedCountryCode.length) : ''));

  if (!normalizedPhone) {
    return { ok: false, error: 'Phone is required', phone: '', country_code: normalizedCountryCode, phone_number: normalizedPhoneNumber };
  }

  if (normalizedPhone.length < 8 || normalizedPhone.length > 15) {
    return { ok: false, error: 'Phone must contain 8 to 15 digits with country code', phone: normalizedPhone, country_code: normalizedCountryCode, phone_number: normalizedPhoneNumber };
  }

  if (!normalizedCountryCode) {
    return { ok: false, error: 'Country code is required', phone: normalizedPhone, country_code: '', phone_number: normalizedPhoneNumber };
  }

  if (!normalizedPhone.startsWith(normalizedCountryCode)) {
    return { ok: false, error: 'Country code does not match phone number', phone: normalizedPhone, country_code: normalizedCountryCode, phone_number: normalizedPhoneNumber };
  }

  if (normalizedPhoneNumber.length < 6 || normalizedPhoneNumber.length > 13) {
    return { ok: false, error: 'Phone number must contain 6 to 13 digits', phone: normalizedPhone, country_code: normalizedCountryCode, phone_number: normalizedPhoneNumber };
  }

  return { ok: true, error: '', phone: normalizedPhone, country_code: normalizedCountryCode, phone_number: normalizedPhoneNumber };
};

export const formatDisplayPhone = (phone = '', countryCode = '') => {
  const normalized = digitsOnly(phone);
  const cc = normalizeCountryCode(countryCode);
  if (!normalized) return '';
  if (cc && normalized.startsWith(cc)) return `+${cc} ${normalized.slice(cc.length)}`;
  return `+${normalized}`;
};

export const detectDefaultCountryOption = async () => {
  const timeoutController = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = timeoutController ? setTimeout(() => timeoutController.abort(), 1800) : null;

  try {
    const response = await fetch('https://ipapi.co/json/', timeoutController ? { signal: timeoutController.signal } : {});
    if (response.ok) {
      const data = await response.json();
      const iso2 = String(data?.country_code || '').toUpperCase();
      if (iso2 && COUNTRY_BY_ISO2[iso2]) return COUNTRY_BY_ISO2[iso2];
    }
  } catch {}
  finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  const localeIso2 = String((typeof navigator !== 'undefined' ? navigator.language : '') || '')
    .split('-')
    .pop()
    .toUpperCase();
  if (localeIso2 && COUNTRY_BY_ISO2[localeIso2]) return COUNTRY_BY_ISO2[localeIso2];

  return COUNTRY_BY_ISO2.IN;
};
