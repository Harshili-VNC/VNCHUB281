// Server-only. Client Master + approval workflow + change requests + sub-entities.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and, ne, lte, isNotNull } from "drizzle-orm";
import { db } from "../db/client";
import {
  clients,
  clientContacts,
  clientAccounts,
  clientSoftwareStacks,
  clientChangeRequests,
  clientHistory,
} from "../db/schema";
import { getSessionPersonId } from "./session";
import { findPersonById, findClientById, countClients } from "./repo";
import { generateId } from "./mappers";
import { nextClientCode } from "../lib/documents";

import {
  canCreateClient,
  canEditClient,
  canSubmitClient,
  canApproveClient,
  canManageClientMaster,
  canManageTeam,
  isBUHead,
  isUserInClientBU,
  getClientRole,
} from "../lib/client-visibility";

async function requireCurrentUser() {
  const personId = await getSessionPersonId();
  if (!personId) return null;
  const person = await findPersonById(personId);
  return person && person.status === "active" ? person : null;
}

async function logClientHistory(
  clientId: string,
  action: string,
  previousValue: string | null = null,
  newValue: string | null = null,
  remarks: string | null = null,
  userName: string,
) {
  try {
    await db.insert(clientHistory).values({
      id: generateId("clh"),
      clientId,
      action,
      previousValue,
      newValue,
      remarks,
      changedBy: userName,
    });
  } catch (err) {
    console.error("Error logging client history:", err);
  }
}

async function checkDuplicates(editingId: string | null, name: string, accounts: any[]) {
  // Check client name
  const nameQuery = db.select().from(clients).where(eq(clients.name, name.trim()));
  const [existingClientName] = editingId
    ? await db
        .select()
        .from(clients)
        .where(and(eq(clients.name, name.trim()), ne(clients.id, editingId)))
        .limit(1)
    : await db.select().from(clients).where(eq(clients.name, name.trim())).limit(1);

  if (existingClientName) {
    return "A client with this name already exists.";
  }

  // Check accounts' GST/PAN (taxRegistrationNumber) and website
  for (const acc of accounts) {
    const taxReg = acc.taxRegistrationNumber?.trim();
    if (taxReg) {
      const [dupTax] = await db
        .select()
        .from(clientAccounts)
        .where(
          editingId
            ? and(
                eq(clientAccounts.taxRegistrationNumber, taxReg),
                ne(clientAccounts.clientId, editingId),
              )
            : eq(clientAccounts.taxRegistrationNumber, taxReg),
        )
        .limit(1);
      if (dupTax) {
        return `Tax Registration Number / GST / PAN '${taxReg}' is already registered for another client account.`;
      }
    }

    const web = acc.website?.trim();
    if (web) {
      const [dupWeb] = await db
        .select()
        .from(clientAccounts)
        .where(
          editingId
            ? and(eq(clientAccounts.website, web), ne(clientAccounts.clientId, editingId))
            : eq(clientAccounts.website, web),
        )
        .limit(1);
      if (dupWeb) {
        return `Website '${web}' is already registered for another client account.`;
      }
    }
  }
  return null;
}

const clientFields = {
  // Section 1: Identity
  name: z.string().min(1),
  legalName: z.string().optional(),
  shortName: z.string().optional(),
  businessUnit: z.string().optional(),
  billingEntity: z.string().optional(),
  currency: z.string().optional(),
  clientSupportLevel: z.enum(["Level 1 - Priority Client", "Level 2 - Standard Client"]).optional(),
  companyPhoneNumber: z.string().optional(),
  status: z.enum(["Active", "On Hold", "Non Active"]).optional(),
  // Section 2: Address
  clientAddressLine1: z.string().optional(),
  clientAddressLine2: z.string().optional(),
  clientCountry: z.string().optional(),
  clientStateOrRegion: z.string().optional(),
  clientCity: z.string().optional(),
  clientZipOrPin: z.string().optional(),
  // Section 4: Contract & Billing
  contractType: z.string().optional(),
  contractStart: z.string().optional(),
  billingStartDate: z.string().optional(),
  contractEnd: z.string().optional(),
  contractRenewalDate: z.string().optional(),
  billingFrequency: z.string().optional(),
  billingType: z.string().optional(),
  oneOffDurationDays: z.number().int().optional(),
  billingNotes: z.string().optional(),
  paymentTerms: z.string().optional(),
  // Section 5: Accounts
  numberOfAccounts: z.number().int().min(1).max(10).optional(),
  // Section 7: Commercial
  applicableServiceCodes: z.string().optional(),
  contractCopyLink: z.string().optional(),
  scopeSummary: z.string().optional(),
  commercialNotes: z.string().optional(),
  // Section 11: Non-Active
  nonActiveReason: z.string().optional(),
  nonActiveOtherReasonText: z.string().optional(),
  accounts: z.array(z.any()).optional(),
  softwareStacks: z.array(z.any()).optional(),
};

export const addClientFn = createServerFn({ method: "POST" })
  .validator(z.object(clientFields))
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };
    if (!canCreateClient(user)) {
      return {
        ok: false as const,
        error: "Only Marketing Head or Finance Head can create a new client.",
      };
    }

    // --- Validation Checks ---
    const name = data.name.trim();
    if (!name) return { ok: false as const, error: "Client Display Name is required." };
    if (!data.legalName || !data.legalName.trim()) {
      return { ok: false as const, error: "Legal Registered Name is required." };
    }
    if (!data.businessUnit) {
      return { ok: false as const, error: "Primary Business Unit is required." };
    }
    if (!data.billingEntity) {
      return { ok: false as const, error: "Billing Entity is required." };
    }
    if (!data.currency) {
      return { ok: false as const, error: "Invoice Currency is required." };
    }
    if (!data.clientSupportLevel) {
      return { ok: false as const, error: "Client Support Level is required." };
    }
    if (!data.companyPhoneNumber || !data.companyPhoneNumber.trim()) {
      return { ok: false as const, error: "Company Phone Number is required." };
    }

    // Address
    if (!data.clientAddressLine1 || !data.clientAddressLine1.trim()) {
      return { ok: false as const, error: "Address Line 1 is required." };
    }
    if (!data.clientCity || !data.clientCity.trim()) {
      return { ok: false as const, error: "City is required." };
    }
    if (!data.clientStateOrRegion || !data.clientStateOrRegion.trim()) {
      return { ok: false as const, error: "State / Region is required." };
    }
    if (!data.clientCountry || !data.clientCountry.trim()) {
      return { ok: false as const, error: "Country is required." };
    }
    if (!data.clientZipOrPin || !data.clientZipOrPin.trim()) {
      return { ok: false as const, error: "Zip / PIN Code is required." };
    }

    // Billing & Contract
    if (!data.contractType) {
      return { ok: false as const, error: "Contract Type is required." };
    }
    if (!data.billingFrequency) {
      return { ok: false as const, error: "Billing Frequency is required." };
    }
    if (!data.billingType) {
      return { ok: false as const, error: "Billing Type is required." };
    }
    if (!data.contractStart) {
      return { ok: false as const, error: "Contract Start Date is required." };
    }
    if (!data.billingStartDate) {
      return { ok: false as const, error: "Billing Start Date is required." };
    }
    if (new Date(data.billingStartDate) < new Date(data.contractStart)) {
      return {
        ok: false as const,
        error: "Billing Start Date must be on or after Contract Start Date.",
      };
    }
    if (!data.contractRenewalDate) {
      return { ok: false as const, error: "Contract Renewal Date is required." };
    }

    // Non Active Status validation
    if (data.status === "Non Active") {
      if (!data.contractEnd) {
        return {
          ok: false as const,
          error: "Contract End Date is required for Non Active status.",
        };
      }
      if (!data.nonActiveReason) {
        return { ok: false as const, error: "Reason for Non-Active Status is required." };
      }
      if (
        data.nonActiveReason === "Other" &&
        (!data.nonActiveOtherReasonText || !data.nonActiveOtherReasonText.trim())
      ) {
        return { ok: false as const, error: "Non-Active reason details are required." };
      }
    }

    // Commercial
    if (!data.scopeSummary || !data.scopeSummary.trim()) {
      return { ok: false as const, error: "Scope Summary is required." };
    }

    // Validate Accounts
    if (data.accounts) {
      const primaryCount = data.accounts.filter((a) => a.isPrimaryAccount).length;
      if (primaryCount !== 1) {
        return { ok: false as const, error: "Exactly one account must be marked as Primary." };
      }
      for (let i = 0; i < data.accounts.length; i++) {
        const acc = data.accounts[i];
        if (!acc.accountName || !acc.accountName.trim()) {
          return { ok: false as const, error: `Account #${i + 1} Name is required.` };
        }
        if (!acc.accountLegalStructure || !acc.accountLegalStructure.trim()) {
          return {
            ok: false as const,
            error: `Account #${i + 1} Legal Entity Structure is required.`,
          };
        }
        if (!acc.billingEntity) {
          return { ok: false as const, error: `Account #${i + 1} Billing Entity is required.` };
        }
        if (!acc.currency) {
          return { ok: false as const, error: `Account #${i + 1} Currency is required.` };
        }
        if (!acc.taxRegistrationNumber || !acc.taxRegistrationNumber.trim()) {
          return {
            ok: false as const,
            error: `Account #${i + 1} GST / Tax Registration Number is required.`,
          };
        }
        if (!acc.addressLine1 || !acc.addressLine1.trim()) {
          return { ok: false as const, error: `Account #${i + 1} Address Line 1 is required.` };
        }
        if (!acc.city || !acc.city.trim()) {
          return { ok: false as const, error: `Account #${i + 1} City is required.` };
        }
        if (!acc.stateOrRegion || !acc.stateOrRegion.trim()) {
          return { ok: false as const, error: `Account #${i + 1} State / Region is required.` };
        }
        if (!acc.country || !acc.country.trim()) {
          return { ok: false as const, error: `Account #${i + 1} Country is required.` };
        }
        if (!acc.zipOrPinCode || !acc.zipOrPinCode.trim()) {
          return { ok: false as const, error: `Account #${i + 1} Postal Code is required.` };
        }
        if (!acc.deliveryLocation || !acc.deliveryLocation.trim()) {
          return { ok: false as const, error: `Account #${i + 1} Delivery Location is required.` };
        }
      }
    }

    // Validate Software Stacks
    if (data.softwareStacks) {
      for (const stack of data.softwareStacks) {
        if (
          stack.selectedSoftware &&
          stack.selectedSoftware.length > 0 &&
          !stack.selectedSoftware.includes("NA")
        ) {
          if (
            stack.selectedSoftware.includes("Other") &&
            (!stack.otherDetails || !stack.otherDetails.trim())
          ) {
            return {
              ok: false as const,
              error: `${stack.category}: Details are required when 'Other' is selected.`,
            };
          }
          if (!stack.loginUrls || stack.loginUrls.filter((u: string) => u.trim()).length === 0) {
            return {
              ok: false as const,
              error: `${stack.category}: At least one Login URL is required.`,
            };
          }
          for (const url of stack.loginUrls) {
            if (url.trim()) {
              const trimmed = url.trim();
              if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
                return {
                  ok: false as const,
                  error: `${stack.category}: Login URL must start with http:// or https://.`,
                };
              }
            }
          }
        }
      }
    }

    // --- Duplicate Check ---
    const dupErr = await checkDuplicates(null, data.name, data.accounts || []);
    if (dupErr) return { ok: false as const, error: dupErr };

    // --- Create Record ---
    const id = generateId("client");
    const code = nextClientCode(
      (await db.select({ code: clients.code }).from(clients)).map((r) => r.code),
    );

    await db.insert(clients).values({
      id,
      name,
      code,
      legalName: data.legalName?.trim() || null,
      shortName: data.shortName?.trim() || null,
      businessUnit: data.businessUnit || null,
      billingEntity: data.billingEntity || null,
      currency: data.currency || null,
      clientSupportLevel: data.clientSupportLevel ?? null,
      companyPhoneNumber: data.companyPhoneNumber?.trim() || null,
      status: data.status ?? "Active",
      clientAddressLine1: data.clientAddressLine1?.trim() || null,
      clientAddressLine2: data.clientAddressLine2?.trim() || null,
      clientCountry: data.clientCountry?.trim() || null,
      clientStateOrRegion: data.clientStateOrRegion?.trim() || null,
      clientCity: data.clientCity?.trim() || null,
      clientZipOrPin: data.clientZipOrPin?.trim() || null,
      contractType: data.contractType || null,
      contractStart: data.contractStart || null,
      billingStartDate: data.billingStartDate || null,
      contractEnd: data.contractEnd || null,
      contractRenewalDate: data.contractRenewalDate || null,
      billingFrequency: data.billingFrequency || null,
      billingType: data.billingType || null,
      oneOffDurationDays: data.oneOffDurationDays ?? null,
      billingNotes: data.billingNotes?.trim() || null,
      paymentTerms: data.paymentTerms?.trim() || null,
      numberOfAccounts: data.accounts ? data.accounts.length : 1,
      applicableServiceCodes: data.applicableServiceCodes?.trim() || null,
      contractCopyLink: data.contractCopyLink?.trim() || null,
      scopeSummary: data.scopeSummary?.trim() || null,
      commercialNotes: data.commercialNotes?.trim() || null,
      nonActiveReason: data.status === "Non Active" ? data.nonActiveReason || null : null,
      nonActiveOtherReasonText:
        data.status === "Non Active" ? data.nonActiveOtherReasonText || null : null,
      recordStatus: "Draft",
      createdBy: user.name,
      lastUpdatedBy: user.name,
    });

    // --- Save Accounts ---
    if (data.accounts) {
      for (let i = 0; i < data.accounts.length; i++) {
        const acc = data.accounts[i];
        await db.insert(clientAccounts).values({
          id: generateId("acc"),
          clientId: id,
          accountName: acc.accountName.trim(),
          accountCode: acc.accountCode?.trim() || null,
          isPrimaryAccount: acc.isPrimaryAccount ?? i === 0,
          isInScope: acc.isInScope ?? true,
          accountStatus: acc.accountStatus ?? "Active",
          accountLegalStructure: acc.accountLegalStructure?.trim() || null,
          billingEntity: acc.billingEntity || null,
          currency: acc.currency || null,
          taxRegistrationNumber: acc.taxRegistrationNumber?.trim() || null,
          addressLine1: acc.addressLine1?.trim() || null,
          addressLine2: acc.addressLine2?.trim() || null,
          country: acc.country?.trim() || null,
          stateOrRegion: acc.stateOrRegion?.trim() || null,
          city: acc.city?.trim() || null,
          zipOrPinCode: acc.zipOrPinCode?.trim() || null,
          deliveryLocation: acc.deliveryLocation?.trim() || null,
          industryCode: acc.industryCode || null,
          subIndustry: acc.subIndustry?.trim() || null,
          businessUnitMapping: acc.businessUnitMapping || null,
          revenueLast1Year: acc.revenueLast1Year || null,
          employeeSize: acc.employeeSize || null,
          website: acc.website?.trim() || null,
          contactName: acc.contactName?.trim() || null,
          contactEmail: acc.contactEmail?.trim() || null,
          contactPhone: acc.contactPhone?.trim() || null,
          notes: acc.notes?.trim() || null,
          sortOrder: i + 1,
        });
      }
    }

    // --- Save Software Stacks ---
    if (data.softwareStacks) {
      for (const s of data.softwareStacks) {
        if (s.selectedSoftware.length === 0 && !s.otherDetails?.trim()) continue;
        await db.insert(clientSoftwareStacks).values({
          id: generateId("sw"),
          clientId: id,
          category: s.category,
          selectedSoftware: JSON.stringify(s.selectedSoftware),
          loginUrls: JSON.stringify(s.loginUrls),
          otherDetails: s.otherDetails?.trim() || null,
        });
      }
    }

    // --- Audit Trail ---
    await logClientHistory(
      id,
      "Client Created",
      null,
      "Draft",
      "Created new client master record as Draft",
      user.name,
    );

    return { ok: true as const, id, code };
  });

export const updateClientFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1), ...clientFields }))
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    const target = await findClientById(data.id);
    if (!target) return { ok: false as const, error: "Client not found." };
    if (!canEditClient(user, target)) {
      return {
        ok: false as const,
        error: "You are not authorized to edit this client record.",
      };
    }

    const role = getClientRole(user);
    if (role === "Business Unit Head") {
      const hasCommercialChanges =
        (data.contractType !== undefined && data.contractType !== target.contractType) ||
        (data.contractStart !== undefined && data.contractStart !== target.contractStart) ||
        (data.billingStartDate !== undefined && data.billingStartDate !== target.billingStartDate) ||
        (data.contractEnd !== undefined && data.contractEnd !== target.contractEnd) ||
        (data.contractRenewalDate !== undefined && data.contractRenewalDate !== target.contractRenewalDate) ||
        (data.billingFrequency !== undefined && data.billingFrequency !== target.billingFrequency) ||
        (data.billingType !== undefined && data.billingType !== target.billingType) ||
        (data.oneOffDurationDays !== undefined && data.oneOffDurationDays !== target.oneOffDurationDays) ||
        (data.billingNotes !== undefined && data.billingNotes !== target.billingNotes) ||
        (data.paymentTerms !== undefined && data.paymentTerms !== target.paymentTerms) ||
        (data.applicableServiceCodes !== undefined && data.applicableServiceCodes !== target.applicableServiceCodes) ||
        (data.contractCopyLink !== undefined && data.contractCopyLink !== target.contractCopyLink) ||
        (data.scopeSummary !== undefined && data.scopeSummary !== target.scopeSummary) ||
        (data.commercialNotes !== undefined && data.commercialNotes !== target.commercialNotes);

      if (hasCommercialChanges) {
        return {
          ok: false as const,
          error: "Business Unit Heads are not permitted to modify commercial or contract information.",
        };
      }
    }

    // --- Validation Checks ---
    const name = data.name.trim();
    if (!name) return { ok: false as const, error: "Client Display Name is required." };
    if (!data.legalName || !data.legalName.trim()) {
      return { ok: false as const, error: "Legal Registered Name is required." };
    }
    if (!data.businessUnit) {
      return { ok: false as const, error: "Primary Business Unit is required." };
    }
    if (!data.billingEntity) {
      return { ok: false as const, error: "Billing Entity is required." };
    }
    if (!data.currency) {
      return { ok: false as const, error: "Invoice Currency is required." };
    }
    if (!data.clientSupportLevel) {
      return { ok: false as const, error: "Client Support Level is required." };
    }
    if (!data.companyPhoneNumber || !data.companyPhoneNumber.trim()) {
      return { ok: false as const, error: "Company Phone Number is required." };
    }

    // Address
    if (!data.clientAddressLine1 || !data.clientAddressLine1.trim()) {
      return { ok: false as const, error: "Address Line 1 is required." };
    }
    if (!data.clientCity || !data.clientCity.trim()) {
      return { ok: false as const, error: "City is required." };
    }
    if (!data.clientStateOrRegion || !data.clientStateOrRegion.trim()) {
      return { ok: false as const, error: "State / Region is required." };
    }
    if (!data.clientCountry || !data.clientCountry.trim()) {
      return { ok: false as const, error: "Country is required." };
    }
    if (!data.clientZipOrPin || !data.clientZipOrPin.trim()) {
      return { ok: false as const, error: "Zip / PIN Code is required." };
    }

    // Billing & Contract
    if (!data.contractType) {
      return { ok: false as const, error: "Contract Type is required." };
    }
    if (!data.billingFrequency) {
      return { ok: false as const, error: "Billing Frequency is required." };
    }
    if (!data.billingType) {
      return { ok: false as const, error: "Billing Type is required." };
    }
    if (!data.contractStart) {
      return { ok: false as const, error: "Contract Start Date is required." };
    }
    if (!data.billingStartDate) {
      return { ok: false as const, error: "Billing Start Date is required." };
    }
    if (new Date(data.billingStartDate) < new Date(data.contractStart)) {
      return {
        ok: false as const,
        error: "Billing Start Date must be on or after Contract Start Date.",
      };
    }
    if (!data.contractRenewalDate) {
      return { ok: false as const, error: "Contract Renewal Date is required." };
    }

    // Non Active Status validation
    if (data.status === "Non Active") {
      if (!data.contractEnd) {
        return {
          ok: false as const,
          error: "Contract End Date is required for Non Active status.",
        };
      }
      if (!data.nonActiveReason) {
        return { ok: false as const, error: "Reason for Non-Active Status is required." };
      }
      if (
        data.nonActiveReason === "Other" &&
        (!data.nonActiveOtherReasonText || !data.nonActiveOtherReasonText.trim())
      ) {
        return { ok: false as const, error: "Non-Active reason details are required." };
      }
    }

    // Commercial
    if (!data.scopeSummary || !data.scopeSummary.trim()) {
      return { ok: false as const, error: "Scope Summary is required." };
    }

    // Validate Accounts
    if (data.accounts) {
      const primaryCount = data.accounts.filter((a) => a.isPrimaryAccount).length;
      if (primaryCount !== 1) {
        return { ok: false as const, error: "Exactly one account must be marked as Primary." };
      }
      for (let i = 0; i < data.accounts.length; i++) {
        const acc = data.accounts[i];
        if (!acc.accountName || !acc.accountName.trim()) {
          return { ok: false as const, error: `Account #${i + 1} Name is required.` };
        }
        if (!acc.accountLegalStructure || !acc.accountLegalStructure.trim()) {
          return {
            ok: false as const,
            error: `Account #${i + 1} Legal Entity Structure is required.`,
          };
        }
        if (!acc.billingEntity) {
          return { ok: false as const, error: `Account #${i + 1} Billing Entity is required.` };
        }
        if (!acc.currency) {
          return { ok: false as const, error: `Account #${i + 1} Currency is required.` };
        }
        if (!acc.taxRegistrationNumber || !acc.taxRegistrationNumber.trim()) {
          return {
            ok: false as const,
            error: `Account #${i + 1} GST / Tax Registration Number is required.`,
          };
        }
        if (!acc.addressLine1 || !acc.addressLine1.trim()) {
          return { ok: false as const, error: `Account #${i + 1} Address Line 1 is required.` };
        }
        if (!acc.city || !acc.city.trim()) {
          return { ok: false as const, error: `Account #${i + 1} City is required.` };
        }
        if (!acc.stateOrRegion || !acc.stateOrRegion.trim()) {
          return { ok: false as const, error: `Account #${i + 1} State / Region is required.` };
        }
        if (!acc.country || !acc.country.trim()) {
          return { ok: false as const, error: `Account #${i + 1} Country is required.` };
        }
        if (!acc.zipOrPinCode || !acc.zipOrPinCode.trim()) {
          return { ok: false as const, error: `Account #${i + 1} Postal Code is required.` };
        }
        if (!acc.deliveryLocation || !acc.deliveryLocation.trim()) {
          return { ok: false as const, error: `Account #${i + 1} Delivery Location is required.` };
        }
      }
    }

    // Validate Software Stacks
    if (data.softwareStacks) {
      for (const stack of data.softwareStacks) {
        if (
          stack.selectedSoftware &&
          stack.selectedSoftware.length > 0 &&
          !stack.selectedSoftware.includes("NA")
        ) {
          if (
            stack.selectedSoftware.includes("Other") &&
            (!stack.otherDetails || !stack.otherDetails.trim())
          ) {
            return {
              ok: false as const,
              error: `${stack.category}: Details are required when 'Other' is selected.`,
            };
          }
          if (!stack.loginUrls || stack.loginUrls.filter((u: string) => u.trim()).length === 0) {
            return {
              ok: false as const,
              error: `${stack.category}: At least one Login URL is required.`,
            };
          }
          for (const url of stack.loginUrls) {
            if (url.trim()) {
              const trimmed = url.trim();
              if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
                return {
                  ok: false as const,
                  error: `${stack.category}: Login URL must start with http:// or https://.`,
                };
              }
            }
          }
        }
      }
    }

    // --- Duplicate Check ---
    const dupErr = await checkDuplicates(data.id, data.name, data.accounts || []);
    if (dupErr) return { ok: false as const, error: dupErr };

    // --- Audit Trail Pre-checks ---
    const prevStatus = target.status;
    const newStatus = data.status ?? target.status;
    const isRecordStatusChanged = target.recordStatus === "Approved"; // if approved, editing sends it back to review

    // Commercial update audit
    const isCommercialChanged =
      target.contractType !== data.contractType ||
      target.contractStart !== data.contractStart ||
      target.billingStartDate !== data.billingStartDate ||
      target.contractRenewalDate !== data.contractRenewalDate ||
      target.billingFrequency !== data.billingFrequency ||
      target.billingType !== data.billingType ||
      target.oneOffDurationDays !== data.oneOffDurationDays ||
      target.billingNotes !== data.billingNotes ||
      target.paymentTerms !== data.paymentTerms ||
      target.scopeSummary !== data.scopeSummary ||
      target.commercialNotes !== data.commercialNotes ||
      target.contractCopyLink !== data.contractCopyLink;

    await db
      .update(clients)
      .set({
        name: data.name.trim(),
        legalName: data.legalName?.trim() || null,
        shortName: data.shortName?.trim() || null,
        businessUnit: data.businessUnit || null,
        billingEntity: data.billingEntity || null,
        currency: data.currency || null,
        clientSupportLevel: data.clientSupportLevel ?? target.clientSupportLevel,
        companyPhoneNumber:
          data.companyPhoneNumber !== undefined
            ? data.companyPhoneNumber.trim() || null
            : target.companyPhoneNumber,
        status: newStatus,
        clientAddressLine1: data.clientAddressLine1?.trim() || null,
        clientAddressLine2: data.clientAddressLine2?.trim() || null,
        clientCountry: data.clientCountry?.trim() || null,
        clientStateOrRegion: data.clientStateOrRegion?.trim() || null,
        clientCity: data.clientCity?.trim() || null,
        clientZipOrPin: data.clientZipOrPin?.trim() || null,
        contractType: data.contractType || null,
        contractStart: data.contractStart || null,
        billingStartDate: data.billingStartDate || null,
        contractEnd: data.contractEnd || null,
        contractRenewalDate: data.contractRenewalDate || null,
        billingFrequency: data.billingFrequency || null,
        billingType: data.billingType || null,
        oneOffDurationDays: data.oneOffDurationDays ?? null,
        billingNotes: data.billingNotes?.trim() || null,
        paymentTerms: data.paymentTerms?.trim() || null,
        numberOfAccounts: data.accounts ? data.accounts.length : target.numberOfAccounts,
        applicableServiceCodes: data.applicableServiceCodes?.trim() || null,
        contractCopyLink: data.contractCopyLink?.trim() || null,
        scopeSummary: data.scopeSummary?.trim() || null,
        commercialNotes: data.commercialNotes?.trim() || null,
        nonActiveReason: newStatus === "Non Active" ? data.nonActiveReason || null : null,
        nonActiveOtherReasonText:
          newStatus === "Non Active" ? data.nonActiveOtherReasonText || null : null,
        recordStatus: target.recordStatus === "Approved" ? "Under Review" : target.recordStatus,
        lastUpdatedBy: user.name,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, data.id));

    // --- Save Accounts (with auditing) ---
    if (data.accounts) {
      const oldAccounts = await db
        .select()
        .from(clientAccounts)
        .where(eq(clientAccounts.clientId, data.id));
      const oldPrimary = oldAccounts.find((a) => a.isPrimaryAccount);
      const newPrimary = data.accounts.find((a) => a.isPrimaryAccount);

      await db.delete(clientAccounts).where(eq(clientAccounts.clientId, data.id));

      for (let i = 0; i < data.accounts.length; i++) {
        const acc = data.accounts[i];
        await db.insert(clientAccounts).values({
          id: generateId("acc"),
          clientId: data.id,
          accountName: acc.accountName.trim(),
          accountCode: acc.accountCode?.trim() || null,
          isPrimaryAccount: acc.isPrimaryAccount ?? i === 0,
          isInScope: acc.isInScope ?? true,
          accountStatus: acc.accountStatus ?? "Active",
          accountLegalStructure: acc.accountLegalStructure?.trim() || null,
          billingEntity: acc.billingEntity || null,
          currency: acc.currency || null,
          taxRegistrationNumber: acc.taxRegistrationNumber?.trim() || null,
          addressLine1: acc.addressLine1?.trim() || null,
          addressLine2: acc.addressLine2?.trim() || null,
          country: acc.country?.trim() || null,
          stateOrRegion: acc.stateOrRegion?.trim() || null,
          city: acc.city?.trim() || null,
          zipOrPinCode: acc.zipOrPinCode?.trim() || null,
          deliveryLocation: acc.deliveryLocation?.trim() || null,
          industryCode: acc.industryCode || null,
          subIndustry: acc.subIndustry?.trim() || null,
          businessUnitMapping: acc.businessUnitMapping || null,
          revenueLast1Year: acc.revenueLast1Year || null,
          employeeSize: acc.employeeSize || null,
          website: acc.website?.trim() || null,
          contactName: acc.contactName?.trim() || null,
          contactEmail: acc.contactEmail?.trim() || null,
          contactPhone: acc.contactPhone?.trim() || null,
          notes: acc.notes?.trim() || null,
          sortOrder: i + 1,
        });
      }

      // Audits for account count changes
      if (data.accounts.length > oldAccounts.length) {
        await logClientHistory(
          data.id,
          "Account Added",
          `${oldAccounts.length} accounts`,
          `${data.accounts.length} accounts`,
          "Added new managed account entity",
          user.name,
        );
      } else if (data.accounts.length < oldAccounts.length) {
        await logClientHistory(
          data.id,
          "Account Removed",
          `${oldAccounts.length} accounts`,
          `${data.accounts.length} accounts`,
          "Removed managed account entity",
          user.name,
        );
      }

      // Audit for primary account changed
      if (oldPrimary && newPrimary && oldPrimary.accountName !== newPrimary.accountName) {
        await logClientHistory(
          data.id,
          "Primary Account Changed",
          oldPrimary.accountName,
          newPrimary.accountName,
          "Changed primary billing account",
          user.name,
        );
      }
    }

    // --- Save Software Stacks (with auditing) ---
    if (data.softwareStacks) {
      await db.delete(clientSoftwareStacks).where(eq(clientSoftwareStacks.clientId, data.id));

      for (const s of data.softwareStacks) {
        if (s.selectedSoftware.length === 0 && !s.otherDetails?.trim()) continue;
        await db.insert(clientSoftwareStacks).values({
          id: generateId("sw"),
          clientId: data.id,
          category: s.category,
          selectedSoftware: JSON.stringify(s.selectedSoftware),
          loginUrls: JSON.stringify(s.loginUrls),
          otherDetails: s.otherDetails?.trim() || null,
        });
      }
      await logClientHistory(
        data.id,
        "Software Stack Updated",
        null,
        null,
        "Updated client software tools stack",
        user.name,
      );
    }

    // --- Audits for Client properties ---
    if (prevStatus !== newStatus) {
      await logClientHistory(
        data.id,
        "Client Status Changed",
        prevStatus,
        newStatus,
        `Status updated to ${newStatus}`,
        user.name,
      );
      if (newStatus === "Non Active") {
        await logClientHistory(
          data.id,
          "Non Active",
          null,
          null,
          `Client marked as Non Active. Reason: ${data.nonActiveReason}. Details: ${data.nonActiveOtherReasonText || ""}`,
          user.name,
        );
      } else if (prevStatus === "Non Active" && newStatus === "Active") {
        await logClientHistory(
          data.id,
          "Reactivated",
          null,
          null,
          "Client reactivated back to Active status",
          user.name,
        );
      }
    }

    if (isCommercialChanged) {
      await logClientHistory(
        data.id,
        "Commercial Updated",
        null,
        null,
        "Updated contract terms or billing specifications",
        user.name,
      );
    }

    if (isRecordStatusChanged) {
      await logClientHistory(
        data.id,
        "Submitted",
        "Approved",
        "Under Review",
        "Production changes require re-approval. Record status set to Under Review.",
        user.name,
      );
    } else {
      await logClientHistory(
        data.id,
        "Client Updated",
        null,
        null,
        "Updated client master information",
        user.name,
      );
    }

    return { ok: true as const };
  });

export const submitClientForReviewFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    const target = await findClientById(data.id);
    if (!target) return { ok: false as const, error: "Client not found." };
    if (!canSubmitClient(user, target)) {
      return {
        ok: false as const,
        error: "Only Marketing Head or Finance Head can submit client records for approval.",
      };
    }

    await db
      .update(clients)
      .set({
        recordStatus: "Under Review",
        rejectionCorrectionNotes: null,
        lastUpdatedBy: user.name,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, data.id));

    await logClientHistory(
      data.id,
      "Submitted",
      target.recordStatus,
      "Under Review",
      "Submitted client master for Business Unit review",
      user.name,
    );

    return { ok: true as const };
  });

export const decideClientApprovalFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      decision: z.enum(["Approved", "Rejected", "Sent Back for Correction"]),
      note: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    const target = await findClientById(data.id);
    if (!target) return { ok: false as const, error: "Client not found." };
    if (!canApproveClient(user, target)) {
      return {
        ok: false as const,
        error: "Only the Business Unit Head for this client can approve, reject, or send back.",
      };
    }
    if (data.decision !== "Approved" && !data.note?.trim()) {
      return {
        ok: false as const,
        error:
          "Rejection / Correction Notes are required when rejecting or sending back for correction.",
      };
    }

    await db
      .update(clients)
      .set({
        recordStatus: data.decision,
        approvedBy: data.decision === "Approved" ? user.name : target.approvedBy,
        approvedAt:
          data.decision === "Approved" ? new Date().toISOString().slice(0, 10) : target.approvedAt,
        rejectionCorrectionNotes: data.decision === "Approved" ? null : data.note?.trim() || null,
        lastUpdatedBy: user.name,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, data.id));

    let auditAction = "";
    if (data.decision === "Approved") auditAction = "Approved";
    else if (data.decision === "Rejected") auditAction = "Rejected";
    else auditAction = "Sent Back";

    await logClientHistory(
      data.id,
      auditAction,
      target.recordStatus,
      data.decision,
      data.note?.trim() || `Client record ${data.decision.toLowerCase()} by Business Unit Head`,
      user.name,
    );

    return { ok: true as const };
  });

// --- Section 3: Client Contacts (Repeating block, 1 to 5) ---

const contactItemSchema = z.object({
  fullName: z.string().min(1),
  designation: z.string().optional(),
  phoneNumber: z.string().optional(),
  emailId: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

export const setClientContactsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      clientId: z.string().min(1),
      contacts: z.array(contactItemSchema).min(1).max(5),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    const target = await findClientById(data.clientId);
    if (!target) return { ok: false as const, error: "Client not found." };
    if (!canEditClient(user, target)) {
      return {
        ok: false as const,
        error: "You are not authorized to update contacts for this client.",
      };
    }

    // Replace all existing contacts for this client
    await db.delete(clientContacts).where(eq(clientContacts.clientId, data.clientId));

    for (let i = 0; i < data.contacts.length; i++) {
      const c = data.contacts[i];
      await db.insert(clientContacts).values({
        id: generateId("cnt"),
        clientId: data.clientId,
        fullName: c.fullName.trim(),
        designation: c.designation?.trim() || null,
        phoneNumber: c.phoneNumber?.trim() || null,
        emailId: c.emailId?.trim() || null,
        isPrimary: c.isPrimary ?? i === 0,
        sortOrder: i + 1,
      });
    }

    return { ok: true as const };
  });

// --- Section 5: Client Accounts (1 to 10 per client) ---

const accountItemSchema = z.object({
  accountName: z.string().min(1),
  accountCode: z.string().optional(),
  isPrimaryAccount: z.boolean().optional(),
  isInScope: z.boolean().optional(),
  accountStatus: z.enum(["Active", "Inactive"]).optional(),
  // Legal & billing
  accountLegalStructure: z.string().optional(),
  billingEntity: z.string().optional(),
  currency: z.string().optional(),
  taxRegistrationNumber: z.string().optional(),
  // Address
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  country: z.string().optional(),
  stateOrRegion: z.string().optional(),
  city: z.string().optional(),
  zipOrPinCode: z.string().optional(),
  deliveryLocation: z.string().optional(),
  // Industry
  industryCode: z.string().optional(),
  subIndustry: z.string().optional(),
  businessUnitMapping: z.string().optional(),
  // Financial
  revenueLast1Year: z.string().optional(),
  employeeSize: z.string().optional(),
  website: z.string().optional(),
  // Contact
  contactName: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  // Notes
  notes: z.string().optional(),
});

export const getClientAccountsFn = createServerFn({ method: "GET" })
  .validator(z.object({ clientId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const rows = await db
      .select()
      .from(clientAccounts)
      .where(eq(clientAccounts.clientId, data.clientId));
    return rows
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((row) => ({
        id: row.id,
        clientId: row.clientId,
        accountName: row.accountName,
        accountCode: row.accountCode ?? null,
        isPrimaryAccount: row.isPrimaryAccount,
        isInScope: row.isInScope,
        accountStatus: row.accountStatus ?? "Active",
        accountLegalStructure: row.accountLegalStructure ?? null,
        billingEntity: row.billingEntity ?? null,
        currency: row.currency ?? null,
        taxRegistrationNumber: row.taxRegistrationNumber ?? null,
        addressLine1: row.addressLine1 ?? null,
        addressLine2: row.addressLine2 ?? null,
        country: row.country ?? null,
        stateOrRegion: row.stateOrRegion ?? null,
        city: row.city ?? null,
        zipOrPinCode: row.zipOrPinCode ?? null,
        deliveryLocation: row.deliveryLocation ?? null,
        industryCode: row.industryCode ?? null,
        subIndustry: row.subIndustry ?? null,
        businessUnitMapping: row.businessUnitMapping ?? null,
        revenueLast1Year: row.revenueLast1Year ?? null,
        employeeSize: row.employeeSize ?? null,
        website: row.website ?? null,
        contactName: row.contactName ?? null,
        contactEmail: row.contactEmail ?? null,
        contactPhone: row.contactPhone ?? null,
        notes: row.notes ?? null,
        sortOrder: row.sortOrder,
        createdAt: row.createdAt.toISOString().slice(0, 10),
        updatedAt: row.updatedAt.toISOString().slice(0, 10),
      }));
  });

export const setClientAccountsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      clientId: z.string().min(1),
      accounts: z.array(accountItemSchema).min(1).max(10),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    const target = await findClientById(data.clientId);
    if (!target) return { ok: false as const, error: "Client not found." };
    if (!canEditClient(user, target)) {
      return {
        ok: false as const,
        error: "You are not authorized to update accounts for this client.",
      };
    }

    // Validate account completeness
    for (let i = 0; i < data.accounts.length; i++) {
      const acc = data.accounts[i];
      if (!acc.accountName || !acc.accountName.trim()) {
        return { ok: false as const, error: `Account #${i + 1} Name is required.` };
      }
      if (!acc.accountLegalStructure || !acc.accountLegalStructure.trim()) {
        return {
          ok: false as const,
          error: `Account #${i + 1} Legal Entity Structure is required.`,
        };
      }
      if (!acc.billingEntity) {
        return { ok: false as const, error: `Account #${i + 1} Billing Entity is required.` };
      }
      if (!acc.currency) {
        return { ok: false as const, error: `Account #${i + 1} Currency is required.` };
      }
      if (!acc.taxRegistrationNumber || !acc.taxRegistrationNumber.trim()) {
        return {
          ok: false as const,
          error: `Account #${i + 1} GST / Tax Registration Number is required.`,
        };
      }
      if (!acc.addressLine1 || !acc.addressLine1.trim()) {
        return { ok: false as const, error: `Account #${i + 1} Address Line 1 is required.` };
      }
      if (!acc.city || !acc.city.trim()) {
        return { ok: false as const, error: `Account #${i + 1} City is required.` };
      }
      if (!acc.stateOrRegion || !acc.stateOrRegion.trim()) {
        return { ok: false as const, error: `Account #${i + 1} State / Region is required.` };
      }
      if (!acc.country || !acc.country.trim()) {
        return { ok: false as const, error: `Account #${i + 1} Country is required.` };
      }
      if (!acc.zipOrPinCode || !acc.zipOrPinCode.trim()) {
        return { ok: false as const, error: `Account #${i + 1} Postal Code is required.` };
      }
      if (!acc.deliveryLocation || !acc.deliveryLocation.trim()) {
        return { ok: false as const, error: `Account #${i + 1} Delivery Location is required.` };
      }
    }

    // Validate exactly one primary
    const primaryCount = data.accounts.filter((a) => a.isPrimaryAccount).length;
    if (primaryCount !== 1) {
      return { ok: false as const, error: "Exactly one account must be marked as Primary." };
    }

    await db.delete(clientAccounts).where(eq(clientAccounts.clientId, data.clientId));

    for (let i = 0; i < data.accounts.length; i++) {
      const acc = data.accounts[i];
      await db.insert(clientAccounts).values({
        id: generateId("acc"),
        clientId: data.clientId,
        accountName: acc.accountName.trim(),
        accountCode: acc.accountCode?.trim() || null,
        isPrimaryAccount: acc.isPrimaryAccount ?? i === 0,
        isInScope: acc.isInScope ?? true,
        accountStatus: acc.accountStatus ?? "Active",
        accountLegalStructure: acc.accountLegalStructure?.trim() || null,
        billingEntity: acc.billingEntity || null,
        currency: acc.currency || null,
        taxRegistrationNumber: acc.taxRegistrationNumber?.trim() || null,
        addressLine1: acc.addressLine1?.trim() || null,
        addressLine2: acc.addressLine2?.trim() || null,
        country: acc.country?.trim() || null,
        stateOrRegion: acc.stateOrRegion?.trim() || null,
        city: acc.city?.trim() || null,
        zipOrPinCode: acc.zipOrPinCode?.trim() || null,
        deliveryLocation: acc.deliveryLocation?.trim() || null,
        industryCode: acc.industryCode || null,
        subIndustry: acc.subIndustry?.trim() || null,
        businessUnitMapping: acc.businessUnitMapping || null,
        revenueLast1Year: acc.revenueLast1Year || null,
        employeeSize: acc.employeeSize || null,
        website: acc.website?.trim() || null,
        contactName: acc.contactName?.trim() || null,
        contactEmail: acc.contactEmail?.trim() || null,
        contactPhone: acc.contactPhone?.trim() || null,
        notes: acc.notes?.trim() || null,
        sortOrder: i + 1,
      });
    }

    // Update client account count
    await db
      .update(clients)
      .set({ numberOfAccounts: data.accounts.length, updatedAt: new Date() })
      .where(eq(clients.id, data.clientId));

    return { ok: true as const };
  });

// --- Section 6: Client Software Stack ---

const softwareCategorySchema = z.object({
  category: z.string().min(1),
  selectedSoftware: z.array(z.string()),
  loginUrls: z.array(z.string()),
  otherDetails: z.string().optional(),
});

export const setClientSoftwareStackFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      clientId: z.string().min(1),
      stacks: z.array(softwareCategorySchema),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    const target = await findClientById(data.clientId);
    if (!target) return { ok: false as const, error: "Client not found." };
    if (!canEditClient(user, target)) {
      return {
        ok: false as const,
        error: "You are not authorized to update software stack for this client.",
      };
    }

    await db.delete(clientSoftwareStacks).where(eq(clientSoftwareStacks.clientId, data.clientId));

    for (const s of data.stacks) {
      if (s.selectedSoftware.length === 0 && !s.otherDetails?.trim()) continue;
      await db.insert(clientSoftwareStacks).values({
        id: generateId("sw"),
        clientId: data.clientId,
        category: s.category,
        selectedSoftware: JSON.stringify(s.selectedSoftware),
        loginUrls: JSON.stringify(s.loginUrls),
        otherDetails: s.otherDetails?.trim() || null,
      });
    }

    return { ok: true as const };
  });

// --- Change Requests & Team Ownership ---

export const addClientChangeRequestFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      clientId: z.string().min(1),
      field: z.enum(["Business Unit", "Billing Entity", "Client Status"]),
      newValue: z.string().min(1),
      effectiveFrom: z.string().min(1),
      reason: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    const target = await findClientById(data.clientId);
    if (!target) return { ok: false as const, error: "Client not found." };
    if (!canEditClient(user, target)) {
      return {
        ok: false as const,
        error: "You are not authorized to request changes for this client.",
      };
    }

    const fieldMap = {
      "Business Unit": "businessUnit",
      "Billing Entity": "billingEntity",
      "Client Status": "status",
    } as const;
    const previousValue = (target[fieldMap[data.field]] ?? "") as string;

    await db.insert(clientChangeRequests).values({
      id: generateId("ccr"),
      clientId: data.clientId,
      field: data.field,
      previousValue,
      newValue: data.newValue,
      effectiveFrom: data.effectiveFrom,
      reason: data.reason?.trim() || "",
      status: "Pending",
      requestedBy: user.name,
    });

    await logClientHistory(
      data.clientId,
      "Change Request Raised",
      previousValue,
      data.newValue,
      `Change request raised for ${data.field} (Effective: ${data.effectiveFrom}). Reason: ${data.reason || ""}`,
      user.name,
    );

    return { ok: true as const };
  });

export const decideClientChangeRequestFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      decision: z.enum(["Approved", "Rejected", "Sent Back"]),
      note: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    const [row] = await db
      .select()
      .from(clientChangeRequests)
      .where(eq(clientChangeRequests.id, data.id))
      .limit(1);
    if (!row) return { ok: false as const, error: "Change request not found." };
    if (row.status !== "Pending")
      return { ok: false as const, error: "Change request is already resolved." };

    const target = await findClientById(row.clientId);
    if (!target) return { ok: false as const, error: "Client not found." };
    if (!canApproveClient(user, target)) {
      return {
        ok: false as const,
        error: "Only the Business Unit Head for this client can approve or reject change requests.",
      };
    }

    const today = new Date().toISOString().slice(0, 10);

    if (data.decision === "Approved") {
      if (row.effectiveFrom <= today) {
        // Apply immediately
        const fieldMap = {
          "Business Unit": "businessUnit",
          "Billing Entity": "billingEntity",
          "Client Status": "status",
        } as const;
        const col = fieldMap[row.field as keyof typeof fieldMap];

        await db
          .update(clients)
          .set({ [col]: row.newValue, updatedAt: new Date() })
          .where(eq(clients.id, row.clientId));

        await db
          .update(clientChangeRequests)
          .set({ status: "Applied", reviewedBy: user.name, reviewedAt: new Date() })
          .where(eq(clientChangeRequests.id, data.id));

        await logClientHistory(
          row.clientId,
          "Change Request Applied",
          row.previousValue,
          row.newValue,
          `Approved and applied immediately by Business Unit Head. Reason: ${row.reason || ""}`,
          user.name,
        );
      } else {
        // Future dated change, mark as approved but do not apply
        await db
          .update(clientChangeRequests)
          .set({ reviewedBy: user.name, reviewedAt: new Date() })
          .where(eq(clientChangeRequests.id, data.id));

        await logClientHistory(
          row.clientId,
          "Change Request Approved",
          row.previousValue,
          row.newValue,
          `Approved by Business Unit Head (Future-dated for ${row.effectiveFrom})`,
          user.name,
        );
      }
    } else {
      // Rejected or Sent Back
      await db
        .update(clientChangeRequests)
        .set({ status: "Rejected", reviewedBy: user.name, reviewedAt: new Date() })
        .where(eq(clientChangeRequests.id, data.id));

      const logAction =
        data.decision === "Rejected" ? "Change Request Rejected" : "Change Request Sent Back";
      await logClientHistory(
        row.clientId,
        logAction,
        row.previousValue,
        row.newValue,
        data.note || "Rejected by Business Unit Head",
        user.name,
      );
    }

    return { ok: true as const };
  });

export const applyClientChangeRequestFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    // Kept for backward compatibility, handles approval/apply directly
    return decideClientChangeRequestFn({ data: { id: data.id, decision: "Approved" } });
  });

export const processDueChangeRequestsFn = createServerFn({ method: "POST" }).handler(async () => {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await db
    .select()
    .from(clientChangeRequests)
    .where(
      and(
        eq(clientChangeRequests.status, "Pending"),
        isNotNull(clientChangeRequests.reviewedBy),
        lte(clientChangeRequests.effectiveFrom, today),
      ),
    );

  const fieldMap = {
    "Business Unit": "businessUnit",
    "Billing Entity": "billingEntity",
    "Client Status": "status",
  } as const;

  let appliedCount = 0;
  for (const row of rows) {
    const col = fieldMap[row.field as keyof typeof fieldMap];
    await db
      .update(clients)
      .set({ [col]: row.newValue, updatedAt: new Date() })
      .where(eq(clients.id, row.clientId));

    await db
      .update(clientChangeRequests)
      .set({ status: "Applied" })
      .where(eq(clientChangeRequests.id, row.id));

    await logClientHistory(
      row.clientId,
      "Change Request Applied",
      row.previousValue,
      row.newValue,
      "Automatically applied on effective date",
      "System",
    );
    appliedCount++;
  }

  return { ok: true as const, count: appliedCount };
});

const employeeIdOrNa = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : null));

export const assignClientTeamOwnershipFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      businessUnitManagerId: employeeIdOrNa,
      teamLeadId: z.string().min(1),
      assistantTeamLeadId: employeeIdOrNa,
      backupBusinessUnitManagerId: employeeIdOrNa,
      backupTeamLeadId: employeeIdOrNa,
      backupAssistantTeamLeadId: employeeIdOrNa,
      numberOfFinanceAnalysts: z.number().int().min(1).max(5).optional().default(1),
      financeAnalyst1Id: employeeIdOrNa,
      backupFinanceAnalyst1Id: employeeIdOrNa,
      financeAnalyst2Id: employeeIdOrNa,
      backupFinanceAnalyst2Id: employeeIdOrNa,
      financeAnalyst3Id: employeeIdOrNa,
      backupFinanceAnalyst3Id: employeeIdOrNa,
      financeAnalyst4Id: employeeIdOrNa,
      backupFinanceAnalyst4Id: employeeIdOrNa,
      financeAnalyst5Id: employeeIdOrNa,
      backupFinanceAnalyst5Id: employeeIdOrNa,
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    const target = await findClientById(data.id);
    if (!target) return { ok: false as const, error: "Client not found." };
    if (!canManageTeam(user, target)) {
      return {
        ok: false as const,
        error: "You are not authorized to manage team for this client.",
      };
    }

    const role = getClientRole(user);
    const tlChanged = target.teamLeadId !== data.teamLeadId;
    const backupTlChanged = target.backupTeamLeadId !== data.backupTeamLeadId;

    if (tlChanged || backupTlChanged) {
      if (role !== "Business Unit Head" || !isUserInClientBU(user, target)) {
        return {
          ok: false as const,
          error: "Only the Business Unit Head can assign or change the Team Lead and Backup Team Lead.",
        };
      }
    }

    if (role === "Business Unit Head") {
      const hasOtherChanges =
        data.businessUnitManagerId !== target.businessUnitManagerId ||
        data.assistantTeamLeadId !== target.assistantTeamLeadId ||
        data.backupBusinessUnitManagerId !== target.backupBusinessUnitManagerId ||
        data.backupAssistantTeamLeadId !== target.backupAssistantTeamLeadId ||
        data.financeAnalyst1Id !== target.financeAnalyst1Id ||
        data.backupFinanceAnalyst1Id !== target.backupFinanceAnalyst1Id ||
        data.financeAnalyst2Id !== target.financeAnalyst2Id ||
        data.backupFinanceAnalyst2Id !== target.backupFinanceAnalyst2Id ||
        data.financeAnalyst3Id !== target.financeAnalyst3Id ||
        data.backupFinanceAnalyst3Id !== target.backupFinanceAnalyst3Id ||
        data.financeAnalyst4Id !== target.financeAnalyst4Id ||
        data.backupFinanceAnalyst4Id !== target.backupFinanceAnalyst4Id ||
        data.financeAnalyst5Id !== target.financeAnalyst5Id ||
        data.backupFinanceAnalyst5Id !== target.backupFinanceAnalyst5Id;

      if (hasOtherChanges) {
        return {
          ok: false as const,
          error: "Business Unit Heads can only assign the Team Lead and Backup Team Lead, and cannot manage the remaining delivery team members.",
        };
      }
    }

    await db
      .update(clients)
      .set({
        businessUnitManagerId: data.businessUnitManagerId,
        teamLeadId: data.teamLeadId,
        assistantTeamLeadId: data.assistantTeamLeadId,
        backupBusinessUnitManagerId: data.backupBusinessUnitManagerId,
        backupTeamLeadId: data.backupTeamLeadId,
        backupAssistantTeamLeadId: data.backupAssistantTeamLeadId,
        numberOfFinanceAnalysts: data.numberOfFinanceAnalysts,
        financeAnalyst1Id: data.financeAnalyst1Id,
        backupFinanceAnalyst1Id: data.backupFinanceAnalyst1Id,
        financeAnalyst2Id: data.financeAnalyst2Id,
        backupFinanceAnalyst2Id: data.backupFinanceAnalyst2Id,
        financeAnalyst3Id: data.financeAnalyst3Id,
        backupFinanceAnalyst3Id: data.backupFinanceAnalyst3Id,
        financeAnalyst4Id: data.financeAnalyst4Id,
        backupFinanceAnalyst4Id: data.backupFinanceAnalyst4Id,
        financeAnalyst5Id: data.financeAnalyst5Id,
        backupFinanceAnalyst5Id: data.backupFinanceAnalyst5Id,
        lastUpdatedBy: user.name,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, data.id));

    if (tlChanged) {
      await logClientHistory(
        data.id,
        "Team Lead Assigned",
        target.teamLeadId || "Unassigned",
        data.teamLeadId,
        "Assigned new Team Lead owner",
        user.name,
      );
    }
    await logClientHistory(
      data.id,
      "Delivery Team Updated",
      null,
      null,
      "Updated delivery team composition and analysts",
      user.name,
    );

    return { ok: true as const };
  });
