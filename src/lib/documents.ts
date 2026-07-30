// Pure types + selectors for clients, documents, and all Employee Module sub-entities.
// Shared between client and server code.

// ---------------------------------------------------------------------------
// Document types
// ---------------------------------------------------------------------------

export type DocumentCategory = "Contracts" | "MOMs" | "Invoices" | "Reports";

// ---------------------------------------------------------------------------
// Client Master types
// ---------------------------------------------------------------------------

export type ClientStatus = "Active" | "On Hold" | "Non Active";
export type ClientSupportLevel = "Level 1 - Priority Client" | "Level 2 - Standard Client";
export type ClientRecordStatus =
  "Draft" | "Under Review" | "Approved" | "Rejected" | "Sent Back for Correction";

export type ClientContact = {
  id: string;
  clientId: string;
  fullName: string;
  designation: string | null;
  phoneNumber: string | null;
  emailId: string | null;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: string;
};

export type ClientAccount = {
  id: string;
  clientId: string;
  // Core identity
  accountName: string;
  accountCode: string | null;
  isPrimaryAccount: boolean;
  isInScope: boolean;
  accountStatus: string | null; // "Active" | "Inactive"
  // Legal & billing
  accountLegalStructure: string | null;
  billingEntity: string | null;
  currency: string | null;
  taxRegistrationNumber: string | null; // GST / Tax Number
  // Address
  addressLine1: string | null;
  addressLine2: string | null;
  country: string | null;
  stateOrRegion: string | null;
  city: string | null;
  zipOrPinCode: string | null;
  deliveryLocation: string | null;
  // Industry
  industryCode: string | null;
  subIndustry: string | null;
  businessUnitMapping: string | null;
  // Financial metadata
  revenueLast1Year: string | null;
  employeeSize: string | null;
  website: string | null;
  // Account contact
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  // Notes
  notes: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ClientSoftwareStack = {
  id: string;
  clientId: string;
  category: string;
  selectedSoftware: string[];
  loginUrls: string[];
  otherDetails: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClientRecord = {
  id: string;
  name: string;
  createdAt: string;
  // Section 1: Client Identity
  code: string | null;
  legalName: string | null;
  shortName: string | null;
  businessUnit: string | null;
  billingEntity: string | null;
  currency: string | null;
  clientSupportLevel: ClientSupportLevel | null;
  companyPhoneNumber: string | null;
  clientPhoneCountryCode?: string | null;
  status: ClientStatus;
  // Section 2: Client Address
  clientAddressLine1: string | null;
  clientAddressLine2: string | null;
  clientCountry: string | null;
  clientCountryIso?: string | null;
  clientStateOrRegion: string | null;
  clientCity: string | null;
  clientZipOrPin: string | null;
  // Section 4: Contract and Billing
  contractType: string | null;
  contractStart: string | null;
  billingStartDate: string | null;
  contractEnd: string | null;
  contractRenewalDate: string | null;
  billingFrequency: string | null;
  billingType: string | null;
  oneOffDurationDays: number | null;
  billingNotes: string | null;
  paymentTerms: string | null;
  // Section 5: Accounts
  numberOfAccounts: number | null;
  // Section 7: Commercial References
  applicableServiceCodes: string | null;
  contractCopyLink: string | null;
  scopeSummary: string | null;
  commercialNotes: string | null;
  // Section 8: Approval Workflow
  recordStatus: ClientRecordStatus;
  createdBy: string | null;
  lastUpdatedBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionCorrectionNotes: string | null;
  deletedAt: string | null;
  deletedBy: string | null;
  // Section 9: Team Ownership Structure
  businessUnitManagerId: string | null;
  teamLeadId: string | null;
  assistantTeamLeadId: string | null;
  backupBusinessUnitManagerId: string | null;
  backupTeamLeadId: string | null;
  backupAssistantTeamLeadId: string | null;
  numberOfFinanceAnalysts: number | null;
  financeAnalyst1Id: string | null;
  backupFinanceAnalyst1Id: string | null;
  financeAnalyst2Id: string | null;
  backupFinanceAnalyst2Id: string | null;
  financeAnalyst3Id: string | null;
  backupFinanceAnalyst3Id: string | null;
  financeAnalyst4Id: string | null;
  backupFinanceAnalyst4Id: string | null;
  financeAnalyst5Id: string | null;
  backupFinanceAnalyst5Id: string | null;
  // Section 11: Non-Active Logic
  nonActiveReason: string | null;
  nonActiveOtherReasonText: string | null;
  updatedAt: string;
};

export type ClientChangeRequest = {
  id: string;
  clientId: string;
  field: "Business Unit" | "Billing Entity" | "Client Status";
  previousValue: string;
  newValue: string;
  effectiveFrom: string;
  reason: string;
  status: "Pending" | "Applied" | "Rejected";
  requestedBy: string;
  requestedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
};

export type ClientHistoryEntry = {
  id: string;
  clientId: string;
  action: string;
  previousValue: string | null;
  newValue: string | null;
  remarks: string | null;
  changedBy: string;
  changedAt: string;
};

// ---------------------------------------------------------------------------
// Employee Module sub-entity types
// ---------------------------------------------------------------------------

export type LearningPathStatus = "Not Started" | "In Progress" | "Completed" | "On Hold";
export type CourseStatus = "Not Started" | "In Progress" | "Completed";
export type LearningCategory =
  "Software Learning" | "Soft Skills Learning" | "Technical Skills Learning";
export type AssessmentStatus = "Pending" | "Completed" | "Passed" | "Not Passed";
export type PromotionReadiness = "Not Ready" | "In Progress" | "Ready";
export type GoalStatus = "Not Started" | "In Progress" | "Achieved" | "Delayed";
export type RecognitionType = "Certificate" | "Appreciation" | "Award" | "Other";
export type FeedbackType = "Positive" | "Improvement" | "Coaching";
export type PipStatus = "Active" | "Completed" | "Closed";
export type AssetAllocationStatus = "Allocated" | "Returned" | "Lost" | "Damaged";
export type AssetCondition = "Good" | "Usable" | "Needs Support";
export type CompensationType = "Joining" | "Increment" | "Revision" | "Promotion";
export type EmployeeLeaveType = "Casual" | "Sick" | "Annual" | "Unpaid" | "Other";
export type HrDocumentType =
  | "Aadhar Card"
  | "PAN Card"
  | "Address Proof"
  | "Blood Group Record"
  | "Appointment Letter"
  | "Increment Letter"
  | "Promotion Letter"
  | "HR Letter"
  | "Other";

export type EmployeeLearningPath = {
  id: string;
  personId: string;
  assignedLearningPath: string | null;
  learningPathAssignedDate: string | null;
  learningPathStatus: LearningPathStatus | null;
  learningCompletionPercent: number | null;
  learningNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeCourse = {
  id: string;
  personId: string;
  learningCategory: LearningCategory;
  courseName: string;
  courseStatus: CourseStatus;
  assignedDate: string | null;
  completedDate: string | null;
  scoreOrAssessment: string | null;
  remarks: string | null;
  createdAt: string;
};

export type EmployeeCareerPath = {
  id: string;
  personId: string;
  currentCareerPathLevel: string | null;
  nextTargetCareerLevel: string | null;
  targetTimeline: string | null;
  requiredLearningCompletion: number | null;
  hrAssessmentStatus: AssessmentStatus | null;
  reportingManagerAssessmentStatus: AssessmentStatus | null;
  promotionReadinessStatus: PromotionReadiness | null;
  careerPathNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeKraGoal = {
  id: string;
  personId: string;
  reviewPeriod: string;
  goalTitle: string;
  goalDescription: string | null;
  assignedBy: string | null;
  assignedDate: string | null;
  targetValue: string | null;
  progressPercent: number | null;
  goalStatus: GoalStatus | null;
  managerComments: string | null;
  employeeComments: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeAppraisal = {
  id: string;
  personId: string;
  appraisalYear: string;
  appraisalRating: string | null;
  appraisalSummary: string | null;
  strengths: string | null;
  improvementAreas: string | null;
  reviewedByManager: string | null;
  reviewedByHr: string | null;
  reviewDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeRecognition = {
  id: string;
  personId: string;
  recordKind: "recognition" | "feedback" | "pip";
  recognitionType: RecognitionType | null;
  title: string | null;
  description: string | null;
  awardedDate: string | null;
  issuedBy: string | null;
  feedbackDate: string | null;
  feedbackType: FeedbackType | null;
  feedbackSummary: string | null;
  sharedBy: string | null;
  actionRequired: boolean | null;
  followUpDate: string | null;
  pipStatus: PipStatus | null;
  pipStartDate: string | null;
  pipEndDate: string | null;
  pipReason: string | null;
  pipGoals: string | null;
  pipReviewNotes: string | null;
  createdAt: string;
};

export type EmployeeAsset = {
  id: string;
  personId: string;
  assetType: string;
  assetName: string;
  assetSerialNumber: string | null;
  dateAllocated: string | null;
  allocationStatus: AssetAllocationStatus;
  returnDate: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmployeePersonalAsset = {
  id: string;
  personId: string;
  personalAssetType: string;
  personalAssetAvailable: boolean;
  assetDescription: string | null;
  assetCondition: AssetCondition | null;
  internetAvailable: boolean | null;
  backupPowerAvailable: boolean | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmployeePolicy = {
  id: string;
  personId: string;
  attendancePolicy: string | null;
  shiftTime: string | null;
  gracePeriodMinutes: number | null;
  leavePolicy: string | null;
  workFromHomePolicy: string | null;
  travelPolicy: string | null;
  policyEffectiveFrom: string | null;
  policyNotes: string | null;
  updatedAt: string;
};

export type EmployeeAttendanceSummary = {
  id: string;
  personId: string;
  month: string;
  attendanceDaysPresent: number | null;
  workingDays: number | null;
  lateReportingCount: number | null;
  lateReportingNotes: string | null;
  createdAt: string;
};

export type EmployeeLeaveSummary = {
  id: string;
  personId: string;
  leaveYear: string;
  leaveType: EmployeeLeaveType;
  leaveAppliedDays: number | null;
  leaveApprovedDays: number | null;
  leaveBalance: number | null;
  leaveNotes: string | null;
  createdAt: string;
};

export type EmployeeHrDocument = {
  id: string;
  personId: string;
  documentType: HrDocumentType;
  documentName: string;
  documentNumber: string | null;
  fileLink: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  remarks: string | null;
  createdAt: string;
};

export type EmployeeProjectHistory = {
  id: string;
  personId: string;
  clientCode: string | null;
  clientName: string;
  projectOrAssignmentName: string | null;
  projectRole: string | null;
  assignmentStartDate: string | null;
  assignmentEndDate: string | null;
  currentAssignment: boolean;
  remarks: string | null;
  createdAt: string;
};

export type EmployeeCompensationHistory = {
  id: string;
  personId: string;
  effectiveDate: string;
  compensationType: CompensationType;
  previousCtc: number | null;
  revisedCtc: number;
  incrementAmount: number | null;
  incrementPercent: string | null;
  reason: string | null;
  approvedBy: string | null;
  remarks: string | null;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Import / Export types
// ---------------------------------------------------------------------------

export type EmployeeHistoryEntry = {
  id: string;
  personId: string;
  field: string;
  previousValue: string;
  newValue: string;
  reason: string | null;
  changedBy: string;
  changedAt: string;
};

export type ImportExportModule = "Client Master" | "Employee Master";
export type ImportJobStatus = "Processing" | "Completed" | "Completed with errors" | "Failed";
export type ImportRowError = { row: number; field: string; message: string };

export type ImportJob = {
  id: string;
  module: ImportExportModule;
  fileName: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  status: ImportJobStatus;
  errors: ImportRowError[];
  createdBy: string;
  createdAt: string;
};

export type ExportJob = {
  id: string;
  module: string;
  format: string;
  status: "Processing" | "Completed" | "Failed";
  rowCount: number;
  createdBy: string;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Document types
// ---------------------------------------------------------------------------

export type DocumentRecord = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  category: DocumentCategory;
  clientId: string | null;
  uploadedBy: string;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Static reference lists
// ---------------------------------------------------------------------------

export const businessUnits = ["EFA", "SCA", "ANZA", "MBS"];
export const billingEntities = ["VNC-GL", "VNC-AU", "VNC-IN"];
export const clientCurrencies = ["USD", "AUD", "GBP", "INR"];
export const contractTypes = ["Recurring", "One-off"];
export const billingFrequencies = ["Weekly", "Fortnightly", "Monthly", "Quarterly", "Annual"];
export const billingTypes = ["Fixed Fees", "Hourly", "Fixed + Hourly"];
export const clientSupportLevels: ClientSupportLevel[] = [
  "Level 1 - Priority Client",
  "Level 2 - Standard Client",
];
export const clientStatuses: ClientStatus[] = ["Active", "On Hold", "Non Active"];
export const clientRecordStatuses: ClientRecordStatus[] = [
  "Draft",
  "Under Review",
  "Approved",
  "Rejected",
  "Sent Back for Correction",
];
export const nonActiveClientReasons = [
  "Contract / Scope of work completed",
  "Client terminated because of quality issue",
  "VNC Discontinued service for change in strategic vision",
  "VNC Discontinued service for not a right fit client",
  "Payment issue",
  "No response received from client",
  "Other",
];
export const legalStructures = [
  "LLC",
  "C Corp",
  "Pty Ltd",
  "Individual",
  "Other",
  "LLP",
  "Private Limited",
  "Partnership",
  "Sole Proprietor",
];
export const industryCodes = [
  "Retail",
  "eCommerce",
  "Manufacturing",
  "Technology",
  "Healthcare",
  "Finance & Banking",
  "Real Estate",
  "Food & Beverage",
  "Professional Services",
  "Logistics",
  "Education",
  "Other",
];
export const revenueBands = [
  "< $500K",
  "$500K – $1M",
  "$1M – $5M",
  "$5M – $10M",
  "$10M – $50M",
  "$50M+",
];
export const employeeSizeBands = ["1–10", "11–50", "51–200", "201–500", "501–1000", "1000+"];
export const softwareCategories = [
  {
    name: "Accounting Software",
    multiSelect: false,
    options: ["Xero", "QBO", "Business Central", "MYOB", "Other"],
  },
  {
    name: "Inventory Software",
    multiSelect: false,
    options: ["Cin7 Core", "Business Central", "Other", "NA"],
  },
  {
    name: "Payroll Software",
    multiSelect: false,
    options: [
      "Xero",
      "QBO",
      "Employment Hero",
      "Gusto",
      "Rippling",
      "ADP",
      "KeyPay",
      "Other",
      "NA",
    ],
  },
  {
    name: "Reporting Software",
    multiSelect: false,
    options: ["Fathom", "Syft", "Power BI", "Other", "NA"],
  },
  { name: "AP Automation Software", multiSelect: false, options: ["Dext", "Other", "NA"] },
  {
    name: "Order Management Software",
    multiSelect: true,
    options: [
      "Shopify",
      "Amazon",
      "WooCommerce",
      "BigCommerce",
      "Magento",
      "eBay",
      "Walmart",
      "Faire",
      "Other",
      "NA",
    ],
  },
  { name: "CRM", multiSelect: false, options: ["PipeDrive", "HubSpot", "Other", "NA"] },
  {
    name: "Retail / POS",
    multiSelect: false,
    options: ["Shopify", "Square", "Lightspeed", "Cin7 POS", "Vend", "Other", "NA"],
  },
  { name: "Automation Tools", multiSelect: false, options: ["n8n", "Zapier", "Other", "NA"] },
  {
    name: "Banking and Payments",
    multiSelect: true,
    options: ["PayPal", "Stripe", "Airwallex", "Wise", "Square", "Authorize.net", "Other", "NA"],
  },
  {
    name: "Warehouse and Shipping",
    multiSelect: true,
    options: [
      "ShipStation",
      "ShipBob",
      "Shippit",
      "Starshipit",
      "EasyPost",
      "CartonCloud",
      "Amazon",
      "Other",
      "NA",
    ],
  },
  // CHANGE 8: Additional software categories added
  {
    name: "Practice Management",
    multiSelect: false,
    options: ["Karbon", "XPM (Xero Practice Manager)", "Jetpack Workflow", "Financial Cents", "Other", "NA"],
  },
  {
    name: "Document Management",
    multiSelect: false,
    options: ["Google Drive", "SharePoint", "Dropbox", "OneDrive", "DocuSign", "Other", "NA"],
  },
];

export const officialWorkLocations = [
  "India Office",
  "Remote",
  "Client Location",
  "Hybrid",
  "Australia Office",
  "Other",
];
export const employeeCategories = ["Billable", "Non-Billable", "Shared"];
export const roleTags = ["Analyst", "Team Lead", "Manager", "HR", "Finance", "Admin", "Marketing"];
export const nonActiveEmployeeReasons = [
  "Resigned",
  "Terminated",
  "Long Leave",
  "Retired",
  "Contract Ended",
  "Other",
];
export const companyAssetTypes = [
  "Computer Screen",
  "Mouse",
  "Keyboard",
  "Camera",
  "Headphone",
  "NUC",
  "CPU",
  "Laptop",
  "Other",
];
export const personalAssetTypes = [
  "Personal Laptop",
  "Personal Desktop",
  "Extra Screen",
  "Keyboard",
  "Mouse",
  "Headset",
  "Webcam",
  "Internet Setup",
  "Backup Power",
  "Other",
];
export const importExportModules: ImportExportModule[] = ["Client Master", "Employee Master"];
export const documentCategories: DocumentCategory[] = ["Contracts", "MOMs", "Invoices", "Reports"];
export const hrDocumentTypes: HrDocumentType[] = [
  "Aadhar Card",
  "PAN Card",
  "Address Proof",
  "Blood Group Record",
  "Appointment Letter",
  "Increment Letter",
  "Promotion Letter",
  "HR Letter",
  "Other",
];

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/** Human-friendly next code, e.g. clients with codes C-001, C-002 -> "C-003". */
export function nextClientCode(existingCodes: (string | null)[]): string {
  const max = existingCodes.reduce((acc, code) => {
    const match = code?.match(/^C-(\d+)$/);
    const n = match ? Number(match[1]) : 0;
    return Math.max(acc, n);
  }, 0);
  return `C-${String(max + 1).padStart(3, "0")}`;
}

export function clientsPendingApproval(clients: ClientRecord[]): ClientRecord[] {
  return clients.filter((c) => c.recordStatus === "Under Review");
}

export function documentsForClient(
  documents: DocumentRecord[],
  clientId: string,
): DocumentRecord[] {
  return documents.filter((d) => d.clientId === clientId);
}

export function documentsInCategory(
  documents: DocumentRecord[],
  category: DocumentCategory,
): DocumentRecord[] {
  return documents.filter((d) => d.category === category);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function buildRuleBasedReport(clientName: string, clientDocs: DocumentRecord[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const totalBytes = clientDocs.reduce((sum, d) => sum + d.fileSize, 0);
  const countsByCategory = documentCategories.map((category) => ({
    category,
    count: clientDocs.filter((d) => d.category === category).length,
  }));
  const missing = countsByCategory.filter((c) => c.count === 0).map((c) => c.category);
  const recent = [...clientDocs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 5);

  const lines: string[] = [];
  lines.push(`# Document Analysis — ${clientName}`);
  lines.push(`Generated ${today}`);
  lines.push("");
  lines.push("## Overview");
  lines.push(`- Total documents: ${clientDocs.length}`);
  lines.push(`- Total storage: ${formatFileSize(totalBytes)}`);
  lines.push(
    `- By category: ${countsByCategory.map((c) => `${c.category} (${c.count})`).join(", ")}`,
  );
  lines.push("");
  lines.push("## Missing document types");
  lines.push(
    missing.length
      ? `- ${missing.join(", ")} — no documents on file yet.`
      : "- None — every category has at least one document.",
  );
  lines.push("");
  lines.push("## Most recent uploads");
  if (recent.length === 0) {
    lines.push("- No documents uploaded yet.");
  } else {
    for (const doc of recent) {
      lines.push(`- ${doc.fileName} (${doc.category}) — uploaded ${doc.createdAt}`);
    }
  }
  lines.push("");
  lines.push("---");
  lines.push(
    "_This is a metadata-based summary. Add ANTHROPIC_API_KEY to .env and update src/api/analysis.mutations.ts to enable AI-powered content analysis._",
  );

  return lines.join("\n");
}
