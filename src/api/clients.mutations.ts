// Server-only. Client Master + approval workflow + change requests + sub-entities.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { clients, clientContacts, clientAccounts, clientSoftwareStacks, clientChangeRequests } from "../db/schema";
import { getSessionPersonId } from "./session";
import { findPersonById, findClientById, countClients } from "./repo";
import { generateId } from "./mappers";
import { nextClientCode } from "../lib/documents";

async function requireCurrentUser() {
  const personId = await getSessionPersonId();
  if (!personId) return null;
  const person = await findPersonById(personId);
  return person && person.status === "active" ? person : null;
}

function canManageClientMaster(person: { departmentFunction: string }) {
  return person.departmentFunction === "Finance" || person.departmentFunction === "Admin" || person.departmentFunction === "Leadership";
}

function canApproveClientMaster(person: { isBusinessUnitHead: boolean; departmentFunction: string }) {
  return person.isBusinessUnitHead || person.departmentFunction === "Leadership" || person.departmentFunction === "Admin";
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
};

export const addClientFn = createServerFn({ method: "POST" })
  .validator(z.object(clientFields))
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };
    if (!canManageClientMaster(user)) {
      return { ok: false as const, error: "Only Finance, Admin, or Leadership can create client records." };
    }

    const name = data.name.trim();
    if (!name) return { ok: false as const, error: "Client name is required." };

    const [existing] = await db.select().from(clients).where(eq(clients.name, name)).limit(1);
    if (existing) return { ok: false as const, error: "A client with that name already exists." };

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
      numberOfAccounts: data.numberOfAccounts ?? 1,
      applicableServiceCodes: data.applicableServiceCodes?.trim() || null,
      contractCopyLink: data.contractCopyLink?.trim() || null,
      scopeSummary: data.scopeSummary?.trim() || null,
      commercialNotes: data.commercialNotes?.trim() || null,
      nonActiveReason: data.status === "Non Active" ? data.nonActiveReason || null : null,
      nonActiveOtherReasonText: data.status === "Non Active" ? data.nonActiveOtherReasonText || null : null,
      recordStatus: "Draft",
      createdBy: user.name,
      lastUpdatedBy: user.name,
    });

    return { ok: true as const, id, code };
  });

export const updateClientFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1), ...clientFields }))
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };
    if (!canManageClientMaster(user)) {
      return { ok: false as const, error: "Only Finance, Admin, or Leadership can edit client records." };
    }

    const target = await findClientById(data.id);
    if (!target) return { ok: false as const, error: "Client not found." };

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
        companyPhoneNumber: data.companyPhoneNumber !== undefined ? data.companyPhoneNumber.trim() || null : target.companyPhoneNumber,
        status: data.status ?? target.status,
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
        numberOfAccounts: data.numberOfAccounts ?? target.numberOfAccounts,
        applicableServiceCodes: data.applicableServiceCodes?.trim() || null,
        contractCopyLink: data.contractCopyLink?.trim() || null,
        scopeSummary: data.scopeSummary?.trim() || null,
        commercialNotes: data.commercialNotes?.trim() || null,
        nonActiveReason: data.status === "Non Active" ? data.nonActiveReason || null : null,
        nonActiveOtherReasonText: data.status === "Non Active" ? data.nonActiveOtherReasonText || null : null,
        recordStatus: target.recordStatus === "Approved" ? "Under Review" : target.recordStatus,
        lastUpdatedBy: user.name,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, data.id));

    return { ok: true as const };
  });

export const submitClientForReviewFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };
    if (!canManageClientMaster(user)) {
      return { ok: false as const, error: "Only Finance, Admin, or Leadership can submit client records for review." };
    }

    await db
      .update(clients)
      .set({ recordStatus: "Under Review", lastUpdatedBy: user.name, updatedAt: new Date() })
      .where(eq(clients.id, data.id));
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
    if (!canApproveClientMaster(user)) {
      return { ok: false as const, error: "Only the BU Head, Admin, or Leadership can approve, reject, or send back client records." };
    }
    if (data.decision !== "Approved" && !data.note?.trim()) {
      return {
        ok: false as const,
        error: "Rejection / Correction Notes are required when rejecting or sending back for correction.",
      };
    }

    const target = await findClientById(data.id);
    if (!target) return { ok: false as const, error: "Client not found." };

    await db
      .update(clients)
      .set({
        recordStatus: data.decision,
        approvedBy: data.decision === "Approved" ? user.name : target.approvedBy,
        approvedAt: data.decision === "Approved" ? new Date().toISOString().slice(0, 10) : target.approvedAt,
        rejectionCorrectionNotes: data.decision === "Approved" ? null : data.note?.trim() || null,
        lastUpdatedBy: user.name,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, data.id));

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
    if (!canManageClientMaster(user)) {
      return { ok: false as const, error: "Only Finance, Admin, or Leadership can manage client contacts." };
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
        isPrimary: c.isPrimary ?? (i === 0),
        sortOrder: i + 1,
      });
    }

    return { ok: true as const };
  });

// --- Section 5: Client Accounts (1 to 10 per client) ---

const accountItemSchema = z.object({
  accountName: z.string().min(1),
  isPrimaryAccount: z.boolean().optional(),
  isInScope: z.boolean().optional(),
  accountLegalStructure: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  country: z.string().optional(),
  stateOrRegion: z.string().optional(),
  city: z.string().optional(),
  zipOrPinCode: z.string().optional(),
  industryCode: z.string().optional(),
  revenueLast1Year: z.string().optional(),
  employeeSize: z.string().optional(),
  website: z.string().optional(),
  taxRegistrationNumber: z.string().optional(),
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

    await db.delete(clientAccounts).where(eq(clientAccounts.clientId, data.clientId));

    for (let i = 0; i < data.accounts.length; i++) {
      const acc = data.accounts[i];
      await db.insert(clientAccounts).values({
        id: generateId("acc"),
        clientId: data.clientId,
        accountName: acc.accountName.trim(),
        isPrimaryAccount: acc.isPrimaryAccount ?? (i === 0),
        isInScope: acc.isInScope ?? true,
        accountLegalStructure: acc.accountLegalStructure || null,
        addressLine1: acc.addressLine1?.trim() || null,
        addressLine2: acc.addressLine2?.trim() || null,
        country: acc.country?.trim() || null,
        stateOrRegion: acc.stateOrRegion?.trim() || null,
        city: acc.city?.trim() || null,
        zipOrPinCode: acc.zipOrPinCode?.trim() || null,
        industryCode: acc.industryCode || null,
        revenueLast1Year: acc.revenueLast1Year || null,
        employeeSize: acc.employeeSize || null,
        website: acc.website?.trim() || null,
        taxRegistrationNumber: acc.taxRegistrationNumber?.trim() || null,
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

    return { ok: true as const };
  });

export const applyClientChangeRequestFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    const [row] = await db
      .select()
      .from(clientChangeRequests)
      .where(eq(clientChangeRequests.id, data.id))
      .limit(1);
    if (!row) return { ok: false as const, error: "Change request not found." };

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

    return { ok: true as const };
  });

const employeeIdOrNa = z.string().optional().transform((v) => (v && v.trim() ? v.trim() : null));

export const assignClientTeamOwnershipFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      businessUnitManagerId: z.string().min(1),
      teamLeadId: z.string().min(1),
      assistantTeamLeadId: employeeIdOrNa,
      backupBusinessUnitManagerId: employeeIdOrNa,
      backupTeamLeadId: employeeIdOrNa,
      backupAssistantTeamLeadId: employeeIdOrNa,
      numberOfFinanceAnalysts: z.number().int().min(1).max(5),
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

    return { ok: true as const };
  });
