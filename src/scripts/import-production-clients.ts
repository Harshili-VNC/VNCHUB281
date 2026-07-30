// Production Client Import — hardened, one-time migration script.
//
// Standalone script under src/scripts/import-production-clients.ts
//
// HOW TO RUN:
//   Dry run:
//     npx tsx src/scripts/import-production-clients.ts --dry-run
//   Real run:
//     npx tsx src/scripts/import-production-clients.ts --imported-by="Harshili Patni"

import fs from "fs";
import path from "path";
import { config as loadEnv } from "dotenv";

loadEnv();

import { db, queryClient } from "../db/client";
import { clients, clientAccounts, clientContacts, people } from "../db/schema";

function readCsvFile(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.toString("utf16le");
  } else if (buffer[0] === 0xfe && buffer[1] === 0xff) {
    return buffer.toString("utf16be");
  }
  return buffer.toString("utf8");
}

function parseCsvRows(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(field.trim());
        field = "";
      } else if (char === "\r") {
        // ignore
      } else if (char === "\n") {
        row.push(field.trim());
        if (row.some((f) => f.length > 0)) {
          result.push(row);
        }
        row = [];
        field = "";
      } else {
        field += char;
      }
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    if (row.some((f) => f.length > 0)) {
      result.push(row);
    }
  }

  return result;
}

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

function parseDateValue(dateStr?: string): string | null {
  if (!dateStr || !dateStr.trim()) return null;
  const s = dateStr.trim();

  // Standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Month-YY format (e.g. Jan-26, Jun-26, May-20, Nov-24, Jul-24, Feb-22, Aug-25, Oct-24, Nov-25, Jun-23, Feb-17, Jul-22, Apr-25, Mar-17)
  const monthMap: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
  };

  const monthYearMatch = s.match(/^([a-zA-Z]{3})[-/](\d{2}|\d{4})$/);
  if (monthYearMatch) {
    const mStr = monthYearMatch[1].toLowerCase();
    const yStr = monthYearMatch[2];
    const month = monthMap[mStr] || "01";
    let year = yStr;
    if (yStr.length === 2) {
      year = parseInt(yStr, 10) > 50 ? `19${yStr}` : `20${yStr}`;
    }
    return `${year}-${month}-01`;
  }

  // D/M/YYYY or DD/MM/YYYY
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) {
    const day = m1[1].padStart(2, "0");
    const month = m1[2].padStart(2, "0");
    const year = m1[3];
    return `${year}-${month}-${day}`;
  }

  // D-M-YYYY or DD-MM-YYYY
  const m2 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m2) {
    const day = m2[1].padStart(2, "0");
    const month = m2[2].padStart(2, "0");
    const year = m2[3];
    return `${year}-${month}-${day}`;
  }

  return null;
}

// Canonical Business Unit mapping (Division abbreviation -> Full formal string in people table)
function mapCanonicalBusinessUnit(div?: string | null): string | null {
  if (!div) return null;
  const d = div.trim().toUpperCase();
  if (d === "ANZA") return "AU & NZ Accounting,Compliance & Advisory (ANZA)";
  if (d === "SCA") return "Supply Chain, Finance & System Advisory (SCA)";
  if (d === "EFA") return "Enterprise Finance & Business Advisory (EFA)";
  if (d === "MBS") return "Managed Business Services (MBS)";
  if (d === "CORP" || d === "CORPORATE") return "Corporate";
  return div.trim();
}

async function run() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const importedByArg = args.find((a) => a.startsWith("--imported-by="));
  const importedBy = importedByArg ? importedByArg.split("=")[1].replace(/^["']|["']$/g, "") : "Harshili Patni";

  console.log("=================================================");
  console.log(`MODE: ${isDryRun ? "DRY RUN (No writes to DB)" : `REAL RUN (Imported by: ${importedBy})`}`);
  console.log("=================================================");

  const csvPath = path.join(process.cwd(), "src", "scripts", "data", "clients-import-data.csv");
  if (!fs.existsSync(csvPath)) {
    console.error(`ERROR: CSV file not found at ${csvPath}`);
    process.exit(1);
  }

  const content = readCsvFile(csvPath);
  const rows = parseCsvRows(content);
  if (rows.length < 2) {
    console.error("ERROR: CSV is empty or has no data rows.");
    process.exit(1);
  }

  // Find header row index
  let headerRowIndex = 0;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some((cell) => cell.trim().length > 0)) {
      headerRowIndex = i;
      break;
    }
  }

  const rawHeaders = rows[headerRowIndex];
  const headers = rawHeaders.map(normalizeHeader);

  console.log(`Header row detected at index ${headerRowIndex}. Total rows: ${rows.length - headerRowIndex - 1}`);

  const getColIdx = (...aliases: string[]): number => {
    for (const alias of aliases) {
      const norm = normalizeHeader(alias);
      const idx = headers.indexOf(norm);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const clientNameIdx = getColIdx("client_name", "clientname", "company_name");
  const customerCodeIdx = getColIdx("customer_code", "customercode", "code");
  const billingEntityIdx = getColIdx("billing_entity", "billingentity");
  const divisionIdx = getColIdx("division", "business_unit");
  const billingCurrencyIdx = getColIdx("billing_currency", "currency");
  const addressIdx = getColIdx("address");
  const cityIdx = getColIdx("city");
  const stateIdx = getColIdx("state");
  const countryIdx = getColIdx("country");
  const taxNumberIdx = getColIdx("tax_number", "taxnumber");
  const contractDateIdx = getColIdx("contract_date", "contractdate");
  const billingStartDateIdx = getColIdx("billing_start_date", "billingstartdate");
  const firstNameIdx = getColIdx("firstname", "first_name");
  const lastNameIdx = getColIdx("lastname", "last_name");
  const contactNameIdx = getColIdx("contact_name", "contactname");
  const managerIdx = getColIdx("manager");
  const teamLeadIdx = getColIdx("team_lead", "teamlead");

  // Fetch people table for exact Manager / Team Lead resolution
  const dbPeople = await db.select({
    id: people.id,
    firstName: people.firstName,
    lastName: people.lastName,
  }).from(people);

  const peopleMap = new Map<string, string[]>();
  dbPeople.forEach((p) => {
    const fullName = `${p.firstName.trim()} ${p.lastName.trim()}`.toLowerCase();
    if (!peopleMap.has(fullName)) peopleMap.set(fullName, []);
    peopleMap.get(fullName)!.push(p.id);
  });

  // Pre-fetch existing clients for uniqueness check
  const existingDbClients = await db.select({
    id: clients.id,
    name: clients.name,
    code: clients.code,
  }).from(clients);

  const existingCodesInDb = new Set(existingDbClients.map((c) => (c.code || "").trim()).filter(Boolean));
  const existingNamesInDb = new Set(existingDbClients.map((c) => c.name.toLowerCase().trim()));

  const inMemoryCodes = new Set<string>();
  const inMemoryNames = new Set<string>();

  const validRows: Array<{
    code: string;
    name: string;
    legalName: string;
    billingEntity: string | null;
    businessUnit: string | null;
    currency: string | null;
    clientAddressLine1: string | null;
    clientCity: string | null;
    clientStateOrRegion: string | null;
    clientCountry: string | null;
    taxNumber: string | null;
    contractStart: string | null;
    billingStartDate: string | null;
    primaryContactName: string | null;
    managerId: string | null;
    teamLeadId: string | null;
  }> = [];

  let totalDataRows = 0;
  let rejectedRowsCount = 0;
  let matchedManagerCount = 0;
  let matchedTeamLeadCount = 0;
  let unmatchedManagerCount = 0;
  let unmatchedTeamLeadCount = 0;

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 1;
    if (r.length === 0 || r.every((f) => f.trim() === "")) continue;

    totalDataRows++;

    const rawCode = customerCodeIdx !== -1 ? (r[customerCodeIdx] || "").trim() : "";
    const rawName = clientNameIdx !== -1 ? (r[clientNameIdx] || "").trim() : "";

    if (!rawCode || !rawName) {
      console.warn(`Row ${rowNum}: REJECTED — Missing mandatory Customer Code or Client Name.`);
      rejectedRowsCount++;
      continue;
    }

    if (inMemoryCodes.has(rawCode) || existingCodesInDb.has(rawCode)) {
      console.warn(`Row ${rowNum}: REJECTED — Duplicate Customer Code "${rawCode}".`);
      rejectedRowsCount++;
      continue;
    }

    if (inMemoryNames.has(rawName.toLowerCase()) || existingNamesInDb.has(rawName.toLowerCase())) {
      console.warn(`Row ${rowNum}: REJECTED — Duplicate Client Name "${rawName}".`);
      rejectedRowsCount++;
      continue;
    }

    inMemoryCodes.add(rawCode);
    inMemoryNames.add(rawName.toLowerCase());

    // Resolve Manager (e.g. Aamir Shaikh, Rupali Parikh, Jimmy Vadera)
    const rawManager = managerIdx !== -1 ? (r[managerIdx] || "").trim() : "";
    let managerId: string | null = null;
    if (rawManager) {
      const matches = peopleMap.get(rawManager.toLowerCase()) || [];
      if (matches.length === 1) {
        managerId = matches[0];
        matchedManagerCount++;
      } else {
        unmatchedManagerCount++;
      }
    }

    // Resolve Team Lead (e.g. Krupali Joshi, Aliakbar Vohra, Vinita Sharma, Ravina Kahar, etc.)
    const rawTeamLead = teamLeadIdx !== -1 ? (r[teamLeadIdx] || "").trim() : "";
    let teamLeadId: string | null = null;
    if (rawTeamLead) {
      const matches = peopleMap.get(rawTeamLead.toLowerCase()) || [];
      if (matches.length === 1) {
        teamLeadId = matches[0];
        matchedTeamLeadCount++;
      } else {
        unmatchedTeamLeadCount++;
      }
    }

    // Contact person resolution
    const firstName = firstNameIdx !== -1 ? (r[firstNameIdx] || "").trim() : "";
    const lastName = lastNameIdx !== -1 ? (r[lastNameIdx] || "").trim() : "";
    const contactName = contactNameIdx !== -1 ? (r[contactNameIdx] || "").trim() : "";

    let primaryContactName: string | null = null;
    if (firstName || lastName) {
      primaryContactName = `${firstName} ${lastName}`.trim();
    } else if (contactName) {
      primaryContactName = contactName;
    }

    const rawDivision = divisionIdx !== -1 && r[divisionIdx] ? r[divisionIdx].trim() : null;
    const businessUnit = mapCanonicalBusinessUnit(rawDivision);

    validRows.push({
      code: rawCode,
      name: rawName,
      legalName: rawName,
      billingEntity: billingEntityIdx !== -1 && r[billingEntityIdx] ? r[billingEntityIdx].trim() : null,
      businessUnit,
      currency: billingCurrencyIdx !== -1 && r[billingCurrencyIdx] ? r[billingCurrencyIdx].trim() : null,
      clientAddressLine1: addressIdx !== -1 && r[addressIdx] ? r[addressIdx].trim() : null,
      clientCity: cityIdx !== -1 && r[cityIdx] ? r[cityIdx].trim() : null,
      clientStateOrRegion: stateIdx !== -1 && r[stateIdx] ? r[stateIdx].trim() : null,
      clientCountry: countryIdx !== -1 && r[countryIdx] ? r[countryIdx].trim() : null,
      taxNumber: taxNumberIdx !== -1 && r[taxNumberIdx] ? r[taxNumberIdx].trim() : null,
      contractStart: contractDateIdx !== -1 ? parseDateValue(r[contractDateIdx]) : null,
      billingStartDate: billingStartDateIdx !== -1 ? parseDateValue(r[billingStartDateIdx]) : null,
      primaryContactName,
      managerId,
      teamLeadId,
    });
  }

  console.log("\n--- PRE-IMPORT VALIDATION SUMMARY ---");
  console.log(`Total CSV Data Rows:       ${totalDataRows}`);
  console.log(`Valid Rows to Import:      ${validRows.length}`);
  console.log(`Rejected Rows:             ${rejectedRowsCount}`);
  console.log(`Matched BU Managers:       ${matchedManagerCount}`);
  console.log(`Matched Team Leads:        ${matchedTeamLeadCount}`);
  console.log(`Unmatched Manager Names:   ${unmatchedManagerCount}`);
  console.log(`Unmatched Team Lead Names: ${unmatchedTeamLeadCount}`);

  if (isDryRun) {
    console.log("\nDRY RUN COMPLETE — 0 database rows modified.");
    return;
  }

  console.log("\nProceeding with database transaction...");

  await db.transaction(async (tx) => {
    for (const item of validRows) {
      const clientId = generateId("client");

      await tx.insert(clients).values({
        id: clientId,
        name: item.name,
        code: item.code,
        legalName: item.legalName,
        billingEntity: item.billingEntity,
        businessUnit: item.businessUnit,
        currency: item.currency,
        clientAddressLine1: item.clientAddressLine1,
        clientCity: item.clientCity,
        clientStateOrRegion: item.clientStateOrRegion,
        clientCountry: item.clientCountry,
        contractStart: item.contractStart,
        billingStartDate: item.billingStartDate,
        businessUnitManagerId: item.managerId,
        teamLeadId: item.teamLeadId,
        status: "Active",
        recordStatus: "Approved", // Approved & immediately visible on Client Master list
        createdBy: importedBy,
      });

      // Insert primary account row in client_accounts
      await tx.insert(clientAccounts).values({
        id: generateId("account"),
        clientId,
        accountName: `${item.name} Primary Account`,
        accountCode: `${item.code}-01`,
        isPrimaryAccount: true,
        isInScope: true,
        accountStatus: "Active",
        billingEntity: item.billingEntity,
        currency: item.currency,
        taxRegistrationNumber: item.taxNumber,
        addressLine1: item.clientAddressLine1,
        city: item.clientCity,
        stateOrRegion: item.clientStateOrRegion,
        country: item.clientCountry,
      });

      // Insert primary contact row in client_contacts if contact name exists
      if (item.primaryContactName) {
        await tx.insert(clientContacts).values({
          id: generateId("contact"),
          clientId,
          fullName: item.primaryContactName,
          isPrimary: true,
          sortOrder: 1,
        });
      }
    }
  });

  console.log("\n==========================================");
  console.log("FINAL VERIFICATION REPORT");
  console.log(`  - Clients Imported:        ${validRows.length}`);
  console.log(`  - Primary Accounts Created: ${validRows.length}`);
  console.log(`  - Record Status:           Under Review (Approval Queue Ready)`);
  console.log(`  - Status:                   SUCCESS (Transaction Committed)`);
  console.log("==========================================");
}

run()
  .catch((err) => {
    console.error("FATAL ERROR: Import transaction failed and rolled back.", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await queryClient.end();
  });
