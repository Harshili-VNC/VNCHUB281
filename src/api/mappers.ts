import "@tanstack/react-start/server-only";
// Server-only. Converts Drizzle row shapes into the plain types the client expects.

import type {
  people,
  tasks,
  leaveRequests,
  documents,
  clients,
  clientContacts,
  clientAccounts,
  clientSoftwareStacks,
  clientChangeRequests,
  employeeHistory,
  importJobs,
  exportJobs,
  employeeLearningPaths,
  employeeCourses,
  employeeCareerPaths,
  employeeKraGoals,
  employeeAppraisals,
  employeeRecognitions,
  employeeAssets,
  employeePersonalAssets,
  employeePolicies,
  employeeAttendanceSummaries,
  employeeLeaveSummaries,
  employeeDocuments,
  employeeProjectHistory,
  employeeCompensationHistory,
  clientHistory,
} from "../db/schema";
import type { Person } from "../lib/hierarchy";
import type { Task, LeaveRequest } from "../lib/workspace";
import type {
  ClientRecord,
  ClientContact,
  ClientAccount,
  ClientSoftwareStack,
  DocumentRecord,
  ClientChangeRequest,
  EmployeeHistoryEntry,
  ImportJob,
  ExportJob,
  ImportRowError,
  EmployeeLearningPath,
  EmployeeCourse,
  EmployeeCareerPath,
  EmployeeKraGoal,
  EmployeeAppraisal,
  EmployeeRecognition,
  EmployeeAsset,
  EmployeePersonalAsset,
  EmployeePolicy,
  EmployeeAttendanceSummary,
  EmployeeLeaveSummary,
  EmployeeHrDocument,
  EmployeeProjectHistory,
  EmployeeCompensationHistory,
  ClientHistoryEntry,
} from "../lib/documents";

type PersonRow = typeof people.$inferSelect;
type TaskRow = typeof tasks.$inferSelect;
type LeaveRequestRow = typeof leaveRequests.$inferSelect;
type DocumentRow = typeof documents.$inferSelect;
type ClientRow = typeof clients.$inferSelect;
type ClientContactRow = typeof clientContacts.$inferSelect;
type ClientAccountRow = typeof clientAccounts.$inferSelect;
type ClientSoftwareStackRow = typeof clientSoftwareStacks.$inferSelect;
type ClientChangeRequestRow = typeof clientChangeRequests.$inferSelect;
type EmployeeHistoryRow = typeof employeeHistory.$inferSelect;
type ClientHistoryRow = typeof clientHistory.$inferSelect;

type ImportJobRow = typeof importJobs.$inferSelect;
type ExportJobRow = typeof exportJobs.$inferSelect;
type EmployeeLearningPathRow = typeof employeeLearningPaths.$inferSelect;
type EmployeeCourseRow = typeof employeeCourses.$inferSelect;
type EmployeeCareerPathRow = typeof employeeCareerPaths.$inferSelect;
type EmployeeKraGoalRow = typeof employeeKraGoals.$inferSelect;
type EmployeeAppraisalRow = typeof employeeAppraisals.$inferSelect;
type EmployeeRecognitionRow = typeof employeeRecognitions.$inferSelect;
type EmployeeAssetRow = typeof employeeAssets.$inferSelect;
type EmployeePersonalAssetRow = typeof employeePersonalAssets.$inferSelect;
type EmployeePolicyRow = typeof employeePolicies.$inferSelect;
type EmployeeAttendanceSummaryRow = typeof employeeAttendanceSummaries.$inferSelect;
type EmployeeLeaveSummaryRow = typeof employeeLeaveSummaries.$inferSelect;
type EmployeeDocumentRow = typeof employeeDocuments.$inferSelect;
type EmployeeProjectHistoryRow = typeof employeeProjectHistory.$inferSelect;
type EmployeeCompensationHistoryRow = typeof employeeCompensationHistory.$inferSelect;

function parseJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function toPerson(
  row: PersonRow,
  departmentName: string,
  designationName: string | null,
): Person {
  return {
    id: row.id,
    employeeCode: row.employeeCode,
    name: `${row.firstName} ${row.lastName}`.trim(),
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    officialWorkLocation: row.officialWorkLocation,
    legalEntity: row.legalEntity,
    primaryBusinessUnit: row.primaryBusinessUnit,
    secondaryBusinessUnit: row.secondaryBusinessUnit,
    departmentId: row.departmentId,
    department: departmentName,
    subDepartment: row.subDepartment,
    designationId: row.designationId,
    designation: designationName,
    managerId: row.managerId,
    hireDate: row.hireDate,
    // System & Technical Flags
    departmentFunction: row.departmentFunction,
    isTeamLead: row.isTeamLead,
    isBusinessUnitHead: row.isBusinessUnitHead,
    status: row.status,
    createdAt: row.createdAt.toISOString().slice(0, 10),
    updatedAt: row.updatedAt.toISOString().slice(0, 10),
  };
}

export function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    dueDate: row.dueDate,
    assignerId: row.assignerId,
    assigneeId: row.assigneeId,
    status: row.status,
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

export function toLeaveRequest(row: LeaveRequestRow): LeaveRequest {
  return {
    id: row.id,
    personId: row.personId,
    managerId: row.managerId,
    startDate: row.startDate,
    endDate: row.endDate,
    reason: row.reason,
    status: row.status,
    createdAt: row.createdAt.toISOString().slice(0, 10),
    decidedAt: row.decidedAt ? row.decidedAt.toISOString().slice(0, 10) : undefined,
  };
}

export function toClient(row: ClientRow): ClientRecord {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    legalName: row.legalName,
    shortName: row.shortName,
    businessUnit: row.businessUnit,
    billingEntity: row.billingEntity,
    currency: row.currency,
    clientSupportLevel: row.clientSupportLevel,
    companyPhoneNumber: row.companyPhoneNumber,
    clientPhoneCountryCode: row.clientPhoneCountryCode,
    status: row.status,
    clientAddressLine1: row.clientAddressLine1,
    clientAddressLine2: row.clientAddressLine2,
    clientCountry: row.clientCountry,
    clientCountryIso: row.clientCountryIso,
    clientStateOrRegion: row.clientStateOrRegion,
    clientCity: row.clientCity,
    clientZipOrPin: row.clientZipOrPin,
    contractType: row.contractType,
    contractStart: row.contractStart,
    billingStartDate: row.billingStartDate,
    contractEnd: row.contractEnd,
    contractRenewalDate: row.contractRenewalDate,
    billingFrequency: row.billingFrequency,
    billingType: row.billingType,
    oneOffDurationDays: row.oneOffDurationDays,
    billingNotes: row.billingNotes,
    paymentTerms: row.paymentTerms,
    numberOfAccounts: row.numberOfAccounts,
    applicableServiceCodes: row.applicableServiceCodes,
    contractCopyLink: row.contractCopyLink,
    scopeSummary: row.scopeSummary,
    commercialNotes: row.commercialNotes,
    recordStatus: row.recordStatus,
    createdBy: row.createdBy,
    lastUpdatedBy: row.lastUpdatedBy,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt,
    rejectionCorrectionNotes: row.rejectionCorrectionNotes,
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    deletedBy: row.deletedBy,
    businessUnitManagerId: row.businessUnitManagerId,
    teamLeadId: row.teamLeadId,
    assistantTeamLeadId: row.assistantTeamLeadId,
    backupBusinessUnitManagerId: row.backupBusinessUnitManagerId,
    backupTeamLeadId: row.backupTeamLeadId,
    backupAssistantTeamLeadId: row.backupAssistantTeamLeadId,
    numberOfFinanceAnalysts: row.numberOfFinanceAnalysts,
    financeAnalyst1Id: row.financeAnalyst1Id,
    backupFinanceAnalyst1Id: row.backupFinanceAnalyst1Id,
    financeAnalyst2Id: row.financeAnalyst2Id,
    backupFinanceAnalyst2Id: row.backupFinanceAnalyst2Id,
    financeAnalyst3Id: row.financeAnalyst3Id,
    backupFinanceAnalyst3Id: row.backupFinanceAnalyst3Id,
    financeAnalyst4Id: row.financeAnalyst4Id,
    backupFinanceAnalyst4Id: row.backupFinanceAnalyst4Id,
    financeAnalyst5Id: row.financeAnalyst5Id,
    backupFinanceAnalyst5Id: row.backupFinanceAnalyst5Id,
    nonActiveReason: row.nonActiveReason,
    nonActiveOtherReasonText: row.nonActiveOtherReasonText,
    createdAt: row.createdAt.toISOString().slice(0, 10),
    updatedAt: row.updatedAt.toISOString().slice(0, 10),
  };
}

export function toClientContact(row: ClientContactRow): ClientContact {
  return {
    id: row.id,
    clientId: row.clientId,
    fullName: row.fullName,
    designation: row.designation,
    phoneNumber: row.phoneNumber,
    emailId: row.emailId,
    isPrimary: row.isPrimary,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

export function toClientAccount(row: ClientAccountRow): ClientAccount {
  return {
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
  };
}

export function toClientSoftwareStack(row: ClientSoftwareStackRow): ClientSoftwareStack {
  return {
    id: row.id,
    clientId: row.clientId,
    category: row.category,
    selectedSoftware: parseJsonArray(row.selectedSoftware),
    loginUrls: parseJsonArray(row.loginUrls),
    otherDetails: row.otherDetails,
    createdAt: row.createdAt.toISOString().slice(0, 10),
    updatedAt: row.updatedAt.toISOString().slice(0, 10),
  };
}

export function toClientHistory(row: ClientHistoryRow): ClientHistoryEntry {
  return {
    id: row.id,
    clientId: row.clientId,
    action: row.action,
    previousValue: row.previousValue ?? null,
    newValue: row.newValue ?? null,
    remarks: row.remarks ?? null,
    changedBy: row.changedBy,
    changedAt: row.changedAt.toISOString(),
  };
}

export function toClientChangeRequest(row: ClientChangeRequestRow): ClientChangeRequest {
  return {
    id: row.id,
    clientId: row.clientId,
    field: row.field as ClientChangeRequest["field"],
    previousValue: row.previousValue,
    newValue: row.newValue,
    effectiveFrom: row.effectiveFrom,
    reason: row.reason,
    status: row.status,
    requestedBy: row.requestedBy,
    requestedAt: row.requestedAt.toISOString().slice(0, 10),
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString().slice(0, 10) : null,
  };
}

export function toEmployeeHistory(row: EmployeeHistoryRow): EmployeeHistoryEntry {
  return {
    id: row.id,
    personId: row.personId,
    field: row.field,
    previousValue: row.previousValue,
    newValue: row.newValue,
    reason: row.reason,
    changedBy: row.changedBy,
    changedAt: row.changedAt.toISOString().slice(0, 10),
  };
}

export function toImportJob(row: ImportJobRow): ImportJob {
  let errors: ImportRowError[] = [];
  if (row.errorLog) {
    try {
      errors = JSON.parse(row.errorLog);
    } catch {
      errors = [];
    }
  }
  return {
    id: row.id,
    module: row.module,
    fileName: row.fileName,
    totalRows: row.totalRows,
    successRows: row.successRows,
    failedRows: row.failedRows,
    status: row.status,
    errors,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

export function toExportJob(row: ExportJobRow): ExportJob {
  return {
    id: row.id,
    module: row.module,
    format: row.format,
    status: row.status,
    rowCount: row.rowCount,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

export function toDocument(row: DocumentRow): DocumentRecord {
  return {
    id: row.id,
    fileName: row.fileName,
    mimeType: row.mimeType,
    fileSize: row.fileSize,
    category: row.category,
    clientId: row.clientId,
    uploadedBy: row.uploadedBy,
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

// --- Employee sub-entity mappers ---

export function toEmployeeLearningPath(row: EmployeeLearningPathRow): EmployeeLearningPath {
  return {
    id: row.id,
    personId: row.personId,
    assignedLearningPath: row.assignedLearningPath,
    learningPathAssignedDate: row.learningPathAssignedDate,
    learningPathStatus: row.learningPathStatus,
    learningCompletionPercent: row.learningCompletionPercent,
    learningNotes: row.learningNotes,
    createdAt: row.createdAt.toISOString().slice(0, 10),
    updatedAt: row.updatedAt.toISOString().slice(0, 10),
  };
}

export function toEmployeeCourse(row: EmployeeCourseRow): EmployeeCourse {
  return {
    id: row.id,
    personId: row.personId,
    learningCategory: row.learningCategory,
    courseName: row.courseName,
    courseStatus: row.courseStatus,
    assignedDate: row.assignedDate,
    completedDate: row.completedDate,
    scoreOrAssessment: row.scoreOrAssessment,
    remarks: row.remarks,
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

export function toEmployeeCareerPath(row: EmployeeCareerPathRow): EmployeeCareerPath {
  return {
    id: row.id,
    personId: row.personId,
    currentCareerPathLevel: row.currentCareerPathLevel,
    nextTargetCareerLevel: row.nextTargetCareerLevel,
    targetTimeline: row.targetTimeline,
    requiredLearningCompletion: row.requiredLearningCompletion,
    hrAssessmentStatus: row.hrAssessmentStatus,
    reportingManagerAssessmentStatus: row.reportingManagerAssessmentStatus,
    promotionReadinessStatus: row.promotionReadinessStatus,
    careerPathNotes: row.careerPathNotes,
    createdAt: row.createdAt.toISOString().slice(0, 10),
    updatedAt: row.updatedAt.toISOString().slice(0, 10),
  };
}

export function toEmployeeKraGoal(row: EmployeeKraGoalRow): EmployeeKraGoal {
  return {
    id: row.id,
    personId: row.personId,
    reviewPeriod: row.reviewPeriod,
    goalTitle: row.goalTitle,
    goalDescription: row.goalDescription,
    assignedBy: row.assignedBy,
    assignedDate: row.assignedDate,
    targetValue: row.targetValue,
    progressPercent: row.progressPercent,
    goalStatus: row.goalStatus,
    managerComments: row.managerComments,
    employeeComments: row.employeeComments,
    createdAt: row.createdAt.toISOString().slice(0, 10),
    updatedAt: row.updatedAt.toISOString().slice(0, 10),
  };
}

export function toEmployeeAppraisal(row: EmployeeAppraisalRow): EmployeeAppraisal {
  return {
    id: row.id,
    personId: row.personId,
    appraisalYear: row.appraisalYear,
    appraisalRating: row.appraisalRating,
    appraisalSummary: row.appraisalSummary,
    strengths: row.strengths,
    improvementAreas: row.improvementAreas,
    reviewedByManager: row.reviewedByManager,
    reviewedByHr: row.reviewedByHr,
    reviewDate: row.reviewDate,
    createdAt: row.createdAt.toISOString().slice(0, 10),
    updatedAt: row.updatedAt.toISOString().slice(0, 10),
  };
}

export function toEmployeeRecognition(row: EmployeeRecognitionRow): EmployeeRecognition {
  return {
    id: row.id,
    personId: row.personId,
    recordKind: row.recordKind as EmployeeRecognition["recordKind"],
    recognitionType: row.recognitionType,
    title: row.title,
    description: row.description,
    awardedDate: row.awardedDate,
    issuedBy: row.issuedBy,
    feedbackDate: row.feedbackDate,
    feedbackType: row.feedbackType,
    feedbackSummary: row.feedbackSummary,
    sharedBy: row.sharedBy,
    actionRequired: row.actionRequired,
    followUpDate: row.followUpDate,
    pipStatus: row.pipStatus,
    pipStartDate: row.pipStartDate,
    pipEndDate: row.pipEndDate,
    pipReason: row.pipReason,
    pipGoals: row.pipGoals,
    pipReviewNotes: row.pipReviewNotes,
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

export function toEmployeeAsset(row: EmployeeAssetRow): EmployeeAsset {
  return {
    id: row.id,
    personId: row.personId,
    assetType: row.assetType,
    assetName: row.assetName,
    assetSerialNumber: row.assetSerialNumber,
    dateAllocated: row.dateAllocated,
    allocationStatus: row.allocationStatus,
    returnDate: row.returnDate,
    remarks: row.remarks,
    createdAt: row.createdAt.toISOString().slice(0, 10),
    updatedAt: row.updatedAt.toISOString().slice(0, 10),
  };
}

export function toEmployeePersonalAsset(row: EmployeePersonalAssetRow): EmployeePersonalAsset {
  return {
    id: row.id,
    personId: row.personId,
    personalAssetType: row.personalAssetType,
    personalAssetAvailable: row.personalAssetAvailable,
    assetDescription: row.assetDescription,
    assetCondition: row.assetCondition,
    internetAvailable: row.internetAvailable,
    backupPowerAvailable: row.backupPowerAvailable,
    remarks: row.remarks,
    createdAt: row.createdAt.toISOString().slice(0, 10),
    updatedAt: row.updatedAt.toISOString().slice(0, 10),
  };
}

export function toEmployeePolicy(row: EmployeePolicyRow): EmployeePolicy {
  return {
    id: row.id,
    personId: row.personId,
    attendancePolicy: row.attendancePolicy,
    shiftTime: row.shiftTime,
    gracePeriodMinutes: row.gracePeriodMinutes,
    leavePolicy: row.leavePolicy,
    workFromHomePolicy: row.workFromHomePolicy,
    travelPolicy: row.travelPolicy,
    policyEffectiveFrom: row.policyEffectiveFrom,
    policyNotes: row.policyNotes,
    updatedAt: row.updatedAt.toISOString().slice(0, 10),
  };
}

export function toEmployeeAttendanceSummary(
  row: EmployeeAttendanceSummaryRow,
): EmployeeAttendanceSummary {
  return {
    id: row.id,
    personId: row.personId,
    month: row.month,
    attendanceDaysPresent: row.attendanceDaysPresent,
    workingDays: row.workingDays,
    lateReportingCount: row.lateReportingCount,
    lateReportingNotes: row.lateReportingNotes,
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

export function toEmployeeLeaveSummary(row: EmployeeLeaveSummaryRow): EmployeeLeaveSummary {
  return {
    id: row.id,
    personId: row.personId,
    leaveYear: row.leaveYear,
    leaveType: row.leaveType,
    leaveAppliedDays: row.leaveAppliedDays,
    leaveApprovedDays: row.leaveApprovedDays,
    leaveBalance: row.leaveBalance,
    leaveNotes: row.leaveNotes,
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

export function toEmployeeDocument(row: EmployeeDocumentRow): EmployeeHrDocument {
  return {
    id: row.id,
    personId: row.personId,
    documentType: row.documentType,
    documentName: row.documentName,
    documentNumber: row.documentNumber,
    fileLink: row.fileLink,
    issueDate: row.issueDate,
    expiryDate: row.expiryDate,
    remarks: row.remarks,
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

export function toEmployeeProjectHistory(row: EmployeeProjectHistoryRow): EmployeeProjectHistory {
  return {
    id: row.id,
    personId: row.personId,
    clientCode: row.clientCode,
    clientName: row.clientName,
    projectOrAssignmentName: row.projectOrAssignmentName,
    projectRole: row.projectRole,
    assignmentStartDate: row.assignmentStartDate,
    assignmentEndDate: row.assignmentEndDate,
    currentAssignment: row.currentAssignment ?? false,
    remarks: row.remarks,
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

export function toEmployeeCompensationHistory(
  row: EmployeeCompensationHistoryRow,
): EmployeeCompensationHistory {
  return {
    id: row.id,
    personId: row.personId,
    effectiveDate: row.effectiveDate,
    compensationType: row.compensationType,
    previousCtc: row.previousCtc,
    revisedCtc: row.revisedCtc,
    incrementAmount: row.incrementAmount,
    incrementPercent: row.incrementPercent,
    reason: row.reason,
    approvedBy: row.approvedBy,
    remarks: row.remarks,
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
