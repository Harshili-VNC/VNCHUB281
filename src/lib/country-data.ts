import { Country, State, City, type ICountry, type IState, type ICity } from "country-state-city";

export interface FormattedCountry {
  isoCode: string;
  name: string;
  flag: string;
  phonecode: string; // e.g. "91" or "+91"
  isdCode: string; // e.g. "+91"
}

export interface FormattedState {
  isoCode: string;
  name: string;
  countryCode: string;
}

export interface FormattedCity {
  name: string;
  stateCode?: string;
  countryCode?: string;
}

// Memoized countries list
let cachedCountries: FormattedCountry[] | null = null;

export function getAllCountries(): FormattedCountry[] {
  if (cachedCountries) return cachedCountries;

  const raw = Country.getAllCountries();
  cachedCountries = raw.map((c) => {
    const rawPhone = (c.phonecode || "").replace(/^\+/, "").trim();
    const isdCode = rawPhone ? `+${rawPhone}` : "";
    return {
      isoCode: c.isoCode,
      name: c.name,
      flag: c.flag || "🌐",
      phonecode: rawPhone,
      isdCode: isdCode,
    };
  });

  return cachedCountries;
}

export function getCountryByIso(isoCode?: string | null): FormattedCountry | null {
  if (!isoCode) return null;
  const upper = isoCode.trim().toUpperCase();
  const countries = getAllCountries();
  return countries.find((c) => c.isoCode === upper) || null;
}

export function getCountryByName(name?: string | null): FormattedCountry | null {
  if (!name) return null;
  const trimmed = name.trim().toLowerCase();
  const countries = getAllCountries();
  return (
    countries.find(
      (c) =>
        c.name.toLowerCase() === trimmed ||
        c.isoCode.toLowerCase() === trimmed
    ) || null
  );
}

export function getCountryByIsdCode(isdCode?: string | null): FormattedCountry | null {
  if (!isdCode) return null;
  const cleanIsd = isdCode.trim().replace(/^\+/, "");
  const countries = getAllCountries();
  return countries.find((c) => c.phonecode === cleanIsd) || null;
}

export function getStatesByCountry(countryIsoCode?: string | null): FormattedState[] {
  if (!countryIsoCode) return [];
  const upper = countryIsoCode.trim().toUpperCase();
  const states = State.getStatesOfCountry(upper);
  return states.map((s) => ({
    isoCode: s.isoCode,
    name: s.name,
    countryCode: s.countryCode,
  }));
}

export function getStateByNameOrIso(
  countryIsoCode: string | null | undefined,
  stateNameOrIso: string | null | undefined
): FormattedState | null {
  if (!countryIsoCode || !stateNameOrIso) return null;
  const states = getStatesByCountry(countryIsoCode);
  const target = stateNameOrIso.trim().toLowerCase();
  return (
    states.find(
      (s) => s.name.toLowerCase() === target || s.isoCode.toLowerCase() === target
    ) || null
  );
}

export function getCitiesByState(
  countryIsoCode?: string | null,
  stateIsoCodeOrName?: string | null
): FormattedCity[] {
  if (!countryIsoCode || !stateIsoCodeOrName) return [];
  const countryUpper = countryIsoCode.trim().toUpperCase();
  
  // Find state isoCode if name was passed
  const stateObj = getStateByNameOrIso(countryIsoCode, stateIsoCodeOrName);
  const stateIso = stateObj ? stateObj.isoCode : stateIsoCodeOrName.trim().toUpperCase();

  let cities: ICity[] = [];
  if (stateIso) {
    cities = City.getCitiesOfState(countryUpper, stateIso);
  }

  // If no cities found by state code, fallback to all cities of country and filter if matches state
  if (cities.length === 0) {
    const allCountryCities = City.getCitiesOfCountry(countryUpper) || [];
    if (stateObj) {
      cities = allCountryCities.filter(
        (c) => c.stateCode.toLowerCase() === stateObj.isoCode.toLowerCase()
      );
    } else {
      cities = allCountryCities;
    }
  }

  // Map to unique city names
  const uniqueNames = new Set<string>();
  const result: FormattedCity[] = [];
  for (const c of cities) {
    if (!uniqueNames.has(c.name.toLowerCase())) {
      uniqueNames.add(c.name.toLowerCase());
      result.push({
        name: c.name,
        stateCode: c.stateCode,
        countryCode: c.countryCode,
      });
    }
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Validates postal code according to selected country rules.
 */
export function validatePostalCode(
  countryIsoCode: string | null | undefined,
  postalCode: string
): { valid: boolean; error?: string } {
  const code = postalCode.trim();
  if (!code) {
    return { valid: false, error: "ZIP / Postal Code is required" };
  }

  const iso = (countryIsoCode || "").toUpperCase();

  switch (iso) {
    case "IN": // India: 6 digits
      if (!/^\d{6}$/.test(code)) {
        return { valid: false, error: "India postal code must be exactly 6 digits (e.g., 380001)" };
      }
      break;
    case "US": // USA: 5 digits or 5+4
      if (!/^\d{5}(-\d{4})?$/.test(code)) {
        return { valid: false, error: "US ZIP code must be 5 digits (e.g., 90210) or ZIP+4" };
      }
      break;
    case "CA": // Canada: Alphanumeric A1A 1A1
      if (!/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(code)) {
        return { valid: false, error: "Canada postal code format must be A1A 1A1" };
      }
      break;
    case "GB": // United Kingdom: Alphanumeric
      if (!/^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/.test(code)) {
        return { valid: false, error: "UK postal code format must be valid (e.g., SW1A 1AA)" };
      }
      break;
    case "AU": // Australia: 4 digits
      if (!/^\d{4}$/.test(code)) {
        return { valid: false, error: "Australia postal code must be 4 digits (e.g., 2000)" };
      }
      break;
    default:
      // Generic check: 2 to 12 alphanumeric characters
      if (code.length < 2 || code.length > 12) {
        return { valid: false, error: "ZIP / Postal code should be between 2 and 12 characters" };
      }
  }

  return { valid: true };
}

/**
 * Parses legacy unformatted phone strings into ISD code and subscriber phone number.
 */
export function parsePhoneNumber(
  fullPhone: string | null | undefined,
  countryIso?: string | null
): { isdCode: string; phoneNumber: string } {
  if (!fullPhone) {
    const country = getCountryByIso(countryIso);
    return {
      isdCode: country ? country.isdCode : "+91",
      phoneNumber: "",
    };
  }

  const trimmed = fullPhone.trim();
  
  // If phone starts with '+', try to match known ISD codes
  if (trimmed.startsWith("+")) {
    const countries = getAllCountries();
    // Sort by ISD code length descending to match +971 before +9
    const sorted = [...countries].sort((a, b) => b.isdCode.length - a.isdCode.length);
    for (const c of sorted) {
      if (c.isdCode && trimmed.startsWith(c.isdCode)) {
        const rest = trimmed.slice(c.isdCode.length).trim().replace(/^[\s-]+/, "");
        return {
          isdCode: c.isdCode,
          phoneNumber: rest,
        };
      }
    }
  }

  // Fallback if country ISO provided
  const country = getCountryByIso(countryIso);
  const defaultIsd = country ? country.isdCode : "+91";

  // Clean subscriber number
  const subscriber = trimmed.replace(/^\+\d+\s*/, "");
  return {
    isdCode: defaultIsd || "+91",
    phoneNumber: subscriber,
  };
}
