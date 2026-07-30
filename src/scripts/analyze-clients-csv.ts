import fs from "fs";
import path from "path";
import { config as loadEnv } from "dotenv";

loadEnv();

import { db, queryClient } from "../db/client";
import { people, clients } from "../db/schema";

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

async function analyze() {
  const csvPath = path.join(process.cwd(), "src", "scripts", "data", "clients-import-data.csv");
  const content = readCsvFile(csvPath);
  const rows = parseCsvRows(content);

  let headerRowIdx = 0;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some((cell) => cell.trim().length > 0)) {
      headerRowIdx = i;
      break;
    }
  }

  const rawHeaders = rows[headerRowIdx];
  const headers = rawHeaders.map(normalizeHeader);
  const dataRows = rows.slice(headerRowIdx + 1).filter(r => r.length > 0 && !r.every(c => c.trim() === ""));

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
  const taxNumberIdx = getColIdx("tax_number", "taxnumber");
  const contractDateIdx = getColIdx("contract_date", "contractdate");
  const billingStartDateIdx = getColIdx("billing_start_date", "billingstartdate");
  const firstNameIdx = getColIdx("firstname", "first_name");
  const lastNameIdx = getColIdx("lastname", "last_name");
  const contactNameIdx = getColIdx("contact_name", "contactname");
  const managerIdx = getColIdx("manager");
  const teamLeadIdx = getColIdx("team_lead", "teamlead");

  const totalRows = dataRows.length;

  const codeCounts = new Map<string, number>();
  const companyCounts = new Map<string, number>();
  const billingEntityCounts = new Map<string, number>();
  const taxNumberCounts = new Map<string, number>();

  const currencies = new Set<string>();
  const divisions = new Set<string>();
  const managerNames = new Set<string>();
  const teamLeadNames = new Set<string>();
  const dateFormats = new Set<string>();

  let emptyCustomerCodeCount = 0;
  let emptyCompanyNameCount = 0;
  let emptyBillingEntityCount = 0;
  let emptyDivisionCount = 0;
  let emptyCurrencyCount = 0;

  dataRows.forEach((r) => {
    const code = customerCodeIdx !== -1 ? (r[customerCodeIdx] || "").trim() : "";
    const company = clientNameIdx !== -1 ? (r[clientNameIdx] || "").trim() : "";
    const billingEntity = billingEntityIdx !== -1 ? (r[billingEntityIdx] || "").trim() : "";
    const division = divisionIdx !== -1 ? (r[divisionIdx] || "").trim() : "";
    const currency = billingCurrencyIdx !== -1 ? (r[billingCurrencyIdx] || "").trim() : "";
    const taxNumber = taxNumberIdx !== -1 ? (r[taxNumberIdx] || "").trim() : "";
    const contractDate = contractDateIdx !== -1 ? (r[contractDateIdx] || "").trim() : "";
    const billingStartDate = billingStartDateIdx !== -1 ? (r[billingStartDateIdx] || "").trim() : "";
    const manager = managerIdx !== -1 ? (r[managerIdx] || "").trim() : "";
    const teamLead = teamLeadIdx !== -1 ? (r[teamLeadIdx] || "").trim() : "";

    if (!code) emptyCustomerCodeCount++;
    else codeCounts.set(code, (codeCounts.get(code) || 0) + 1);

    if (!company) emptyCompanyNameCount++;
    else companyCounts.set(company.toLowerCase(), (companyCounts.get(company.toLowerCase()) || 0) + 1);

    if (!billingEntity) emptyBillingEntityCount++;
    else billingEntityCounts.set(billingEntity.toLowerCase(), (billingEntityCounts.get(billingEntity.toLowerCase()) || 0) + 1);

    if (taxNumber) taxNumberCounts.set(taxNumber, (taxNumberCounts.get(taxNumber) || 0) + 1);

    if (currency) currencies.add(currency);
    else emptyCurrencyCount++;

    if (division) divisions.add(division);
    else emptyDivisionCount++;

    if (manager) managerNames.add(manager);
    if (teamLead) teamLeadNames.add(teamLead);

    [contractDate, billingStartDate].forEach((d) => {
      if (d) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) dateFormats.add("YYYY-MM-DD");
        else if (/^[a-zA-Z]{3}[-/](\d{2}|\d{4})$/.test(d)) dateFormats.add("MMM-YY (e.g. Jan-26, Jun-26)");
        else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(d)) dateFormats.add("D/M/YYYY");
        else dateFormats.add(`Other: ${d}`);
      }
    });
  });

  const duplicateCodes = Array.from(codeCounts.entries()).filter(([_, count]) => count > 1);
  const duplicateCompanies = Array.from(companyCounts.entries()).filter(([_, count]) => count > 1);
  const duplicateBillingEntities = Array.from(billingEntityCounts.entries()).filter(([_, count]) => count > 1);
  const duplicateTaxNumbers = Array.from(taxNumberCounts.entries()).filter(([_, count]) => count > 1);

  // DB lookup
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

  const allStaffNames = new Set([...managerNames, ...teamLeadNames]);
  const managerResolutionReport: { name: string; matchCount: number; status: string }[] = [];

  allStaffNames.forEach((name) => {
    const norm = name.toLowerCase();
    const matches = peopleMap.get(norm) || [];
    let status = "UNMATCHED (will set to NULL)";
    if (matches.length === 1) status = "EXACT MATCH (1 person found)";
    else if (matches.length > 1) status = `MULTIPLE MATCHES (${matches.length} persons found -> will set to NULL)`;

    managerResolutionReport.push({
      name,
      matchCount: matches.length,
      status,
    });
  });

  const report = {
    totalRows,
    headers: rawHeaders,
    columnMapping: {
      clientNameColumn: rawHeaders[clientNameIdx],
      customerCodeColumn: rawHeaders[customerCodeIdx],
      contactPersonNameColumn: rawHeaders[contactNameIdx],
    },
    countsAndEmptyCheck: {
      totalRows,
      emptyCustomerCodeCount,
      emptyCompanyNameCount,
      emptyBillingEntityCount,
      emptyDivisionCount,
      emptyCurrencyCount,
    },
    duplicates: {
      duplicateCodesCount: duplicateCodes.length,
      duplicateCodesList: duplicateCodes.map(([code, c]) => `${code} (${c} occurrences)`),
      duplicateCompaniesCount: duplicateCompanies.length,
      duplicateCompaniesList: duplicateCompanies.map(([comp, c]) => `${comp} (${c} occurrences)`),
      duplicateBillingEntitiesCount: duplicateBillingEntities.length,
      duplicateTaxNumbersCount: duplicateTaxNumbers.length,
    },
    dateFormats: Array.from(dateFormats),
    distinctCurrencies: Array.from(currencies),
    distinctDivisions: Array.from(divisions),
    distinctStaffNames: managerResolutionReport,
  };

  fs.writeFileSync(
    path.join(process.cwd(), "src", "scripts", "csv-analysis-results.json"),
    JSON.stringify(report, null, 2)
  );

  console.log("Analysis complete! Summary written to src/scripts/csv-analysis-results.json");
}

analyze().catch((err) => {
  console.error("Analysis error:", err);
}).finally(() => {
  queryClient.end();
});
