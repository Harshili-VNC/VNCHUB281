// Server-only. Mutations for employee profile sub-modules (Learning, Goals,
// Appraisals, Recognitions/PIP, Assets, Policies, Documents, Projects, Compensation).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import {
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
} from "../db/schema";
import { getSessionPersonId } from "./session";
import { findPersonById } from "./repo";
import { generateId } from "./mappers";

async function requireCurrentUser() {
  const personId = await getSessionPersonId();
  if (!personId) return null;
  const person = await findPersonById(personId);
  return person && person.status === "active" ? person : null;
}

function canManageEmployeeProfile(user: { departmentFunction: string }) {
  return user.departmentFunction === "HR" || user.departmentFunction === "Admin" || user.departmentFunction === "Leadership";
}

// ---------------------------------------------------------------------------
// 1. Learning Path & Courses
// ---------------------------------------------------------------------------

export const saveEmployeeLearningPathFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      personId: z.string().min(1),
      assignedLearningPath: z.string().optional(),
      learningPathAssignedDate: z.string().optional(),
      learningPathStatus: z.enum(["Not Started", "In Progress", "Completed", "On Hold"]).optional(),
      learningCompletionPercent: z.number().int().min(0).max(100).optional(),
      learningNotes: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    const [existing] = await db
      .select()
      .from(employeeLearningPaths)
      .where(eq(employeeLearningPaths.personId, data.personId))
      .limit(1);

    if (existing) {
      await db
        .update(employeeLearningPaths)
        .set({
          assignedLearningPath: data.assignedLearningPath ?? existing.assignedLearningPath,
          learningPathAssignedDate: data.learningPathAssignedDate ?? existing.learningPathAssignedDate,
          learningPathStatus: data.learningPathStatus ?? existing.learningPathStatus,
          learningCompletionPercent: data.learningCompletionPercent ?? existing.learningCompletionPercent,
          learningNotes: data.learningNotes ?? existing.learningNotes,
          updatedAt: new Date(),
        })
        .where(eq(employeeLearningPaths.id, existing.id));
    } else {
      await db.insert(employeeLearningPaths).values({
        id: generateId("elp"),
        personId: data.personId,
        assignedLearningPath: data.assignedLearningPath || null,
        learningPathAssignedDate: data.learningPathAssignedDate || null,
        learningPathStatus: data.learningPathStatus ?? "Not Started",
        learningCompletionPercent: data.learningCompletionPercent ?? 0,
        learningNotes: data.learningNotes || null,
      });
    }

    return { ok: true as const };
  });

export const addEmployeeCourseFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      personId: z.string().min(1),
      learningCategory: z.enum(["Software Learning", "Soft Skills Learning", "Technical Skills Learning"]),
      courseName: z.string().min(1),
      courseStatus: z.enum(["Not Started", "In Progress", "Completed"]).optional(),
      assignedDate: z.string().optional(),
      completedDate: z.string().optional(),
      scoreOrAssessment: z.string().optional(),
      remarks: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    await db.insert(employeeCourses).values({
      id: generateId("crs"),
      personId: data.personId,
      learningCategory: data.learningCategory,
      courseName: data.courseName.trim(),
      courseStatus: data.courseStatus ?? "Not Started",
      assignedDate: data.assignedDate || null,
      completedDate: data.completedDate || null,
      scoreOrAssessment: data.scoreOrAssessment?.trim() || null,
      remarks: data.remarks?.trim() || null,
    });

    return { ok: true as const };
  });

// ---------------------------------------------------------------------------
// 2. KRA & Goals
// ---------------------------------------------------------------------------

export const addEmployeeKraGoalFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      personId: z.string().min(1),
      reviewPeriod: z.string().min(1), // e.g. "Q3 2026"
      goalTitle: z.string().min(1),
      goalDescription: z.string().optional(),
      assignedDate: z.string().optional(),
      targetValue: z.string().optional(),
      progressPercent: z.number().int().min(0).max(100).optional(),
      goalStatus: z.enum(["Not Started", "In Progress", "Achieved", "Delayed"]).optional(),
      managerComments: z.string().optional(),
      employeeComments: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    await db.insert(employeeKraGoals).values({
      id: generateId("kra"),
      personId: data.personId,
      reviewPeriod: data.reviewPeriod.trim(),
      goalTitle: data.goalTitle.trim(),
      goalDescription: data.goalDescription?.trim() || null,
      assignedBy: user.name,
      assignedDate: data.assignedDate || new Date().toISOString().slice(0, 10),
      targetValue: data.targetValue?.trim() || null,
      progressPercent: data.progressPercent ?? 0,
      goalStatus: data.goalStatus ?? "Not Started",
      managerComments: data.managerComments?.trim() || null,
      employeeComments: data.employeeComments?.trim() || null,
    });

    return { ok: true as const };
  });

// ---------------------------------------------------------------------------
// 3. Performance Appraisals
// ---------------------------------------------------------------------------

export const addEmployeeAppraisalFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      personId: z.string().min(1),
      appraisalYear: z.string().min(1), // e.g. "2025-2026"
      appraisalRating: z.string().optional(),
      appraisalSummary: z.string().optional(),
      strengths: z.string().optional(),
      improvementAreas: z.string().optional(),
      reviewDate: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };
    if (!canManageEmployeeProfile(user)) {
      return { ok: false as const, error: "Only HR/Admin/Leadership can record appraisals." };
    }

    await db.insert(employeeAppraisals).values({
      id: generateId("appr"),
      personId: data.personId,
      appraisalYear: data.appraisalYear.trim(),
      appraisalRating: data.appraisalRating?.trim() || null,
      appraisalSummary: data.appraisalSummary?.trim() || null,
      strengths: data.strengths?.trim() || null,
      improvementAreas: data.improvementAreas?.trim() || null,
      reviewedByManager: user.name,
      reviewedByHr: user.departmentFunction === "HR" ? user.name : null,
      reviewDate: data.reviewDate || new Date().toISOString().slice(0, 10),
    });

    return { ok: true as const };
  });

// ---------------------------------------------------------------------------
// 4. Recognitions / Feedback / PIP
// ---------------------------------------------------------------------------

export const addEmployeeRecognitionFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      personId: z.string().min(1),
      recordKind: z.enum(["recognition", "feedback", "pip"]),
      // Recognition
      recognitionType: z.enum(["Certificate", "Appreciation", "Award", "Other"]).optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      awardedDate: z.string().optional(),
      // Feedback
      feedbackDate: z.string().optional(),
      feedbackType: z.enum(["Positive", "Improvement", "Coaching"]).optional(),
      feedbackSummary: z.string().optional(),
      actionRequired: z.boolean().optional(),
      followUpDate: z.string().optional(),
      // PIP
      pipStatus: z.enum(["Active", "Completed", "Closed"]).optional(),
      pipStartDate: z.string().optional(),
      pipEndDate: z.string().optional(),
      pipReason: z.string().optional(),
      pipGoals: z.string().optional(),
      pipReviewNotes: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    await db.insert(employeeRecognitions).values({
      id: generateId("rec"),
      personId: data.personId,
      recordKind: data.recordKind,
      recognitionType: data.recognitionType || null,
      title: data.title?.trim() || null,
      description: data.description?.trim() || null,
      awardedDate: data.awardedDate || null,
      issuedBy: user.name,
      feedbackDate: data.feedbackDate || null,
      feedbackType: data.feedbackType || null,
      feedbackSummary: data.feedbackSummary?.trim() || null,
      sharedBy: user.name,
      actionRequired: data.actionRequired ?? false,
      followUpDate: data.followUpDate || null,
      pipStatus: data.pipStatus || null,
      pipStartDate: data.pipStartDate || null,
      pipEndDate: data.pipEndDate || null,
      pipReason: data.pipReason?.trim() || null,
      pipGoals: data.pipGoals?.trim() || null,
      pipReviewNotes: data.pipReviewNotes?.trim() || null,
    });

    return { ok: true as const };
  });

// ---------------------------------------------------------------------------
// 5. Assets
// ---------------------------------------------------------------------------

export const addEmployeeAssetFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      personId: z.string().min(1),
      assetType: z.string().min(1),
      assetName: z.string().min(1),
      assetSerialNumber: z.string().optional(),
      dateAllocated: z.string().optional(),
      remarks: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    await db.insert(employeeAssets).values({
      id: generateId("ast"),
      personId: data.personId,
      assetType: data.assetType.trim(),
      assetName: data.assetName.trim(),
      assetSerialNumber: data.assetSerialNumber?.trim() || null,
      dateAllocated: data.dateAllocated || new Date().toISOString().slice(0, 10),
      allocationStatus: "Allocated",
      remarks: data.remarks?.trim() || null,
    });

    return { ok: true as const };
  });

export const addEmployeePersonalAssetFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      personId: z.string().min(1),
      personalAssetType: z.string().min(1),
      personalAssetAvailable: z.boolean().optional(),
      assetDescription: z.string().optional(),
      assetCondition: z.enum(["Good", "Usable", "Needs Support"]).optional(),
      internetAvailable: z.boolean().optional(),
      backupPowerAvailable: z.boolean().optional(),
      remarks: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    await db.insert(employeePersonalAssets).values({
      id: generateId("past"),
      personId: data.personId,
      personalAssetType: data.personalAssetType.trim(),
      personalAssetAvailable: data.personalAssetAvailable ?? true,
      assetDescription: data.assetDescription?.trim() || null,
      assetCondition: data.assetCondition || null,
      internetAvailable: data.internetAvailable ?? null,
      backupPowerAvailable: data.backupPowerAvailable ?? null,
      remarks: data.remarks?.trim() || null,
    });

    return { ok: true as const };
  });

// ---------------------------------------------------------------------------
// 6. Policy Assignment
// ---------------------------------------------------------------------------

export const saveEmployeePolicyFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      personId: z.string().min(1),
      attendancePolicy: z.string().optional(),
      shiftTime: z.string().optional(),
      gracePeriodMinutes: z.number().int().min(0).optional(),
      leavePolicy: z.string().optional(),
      workFromHomePolicy: z.string().optional(),
      travelPolicy: z.string().optional(),
      policyEffectiveFrom: z.string().optional(),
      policyNotes: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    const [existing] = await db
      .select()
      .from(employeePolicies)
      .where(eq(employeePolicies.personId, data.personId))
      .limit(1);

    if (existing) {
      await db
        .update(employeePolicies)
        .set({
          attendancePolicy: data.attendancePolicy ?? existing.attendancePolicy,
          shiftTime: data.shiftTime ?? existing.shiftTime,
          gracePeriodMinutes: data.gracePeriodMinutes ?? existing.gracePeriodMinutes,
          leavePolicy: data.leavePolicy ?? existing.leavePolicy,
          workFromHomePolicy: data.workFromHomePolicy ?? existing.workFromHomePolicy,
          travelPolicy: data.travelPolicy ?? existing.travelPolicy,
          policyEffectiveFrom: data.policyEffectiveFrom ?? existing.policyEffectiveFrom,
          policyNotes: data.policyNotes ?? existing.policyNotes,
          updatedAt: new Date(),
        })
        .where(eq(employeePolicies.id, existing.id));
    } else {
      await db.insert(employeePolicies).values({
        id: generateId("pol"),
        personId: data.personId,
        attendancePolicy: data.attendancePolicy || null,
        shiftTime: data.shiftTime || null,
        gracePeriodMinutes: data.gracePeriodMinutes ?? 15,
        leavePolicy: data.leavePolicy || null,
        workFromHomePolicy: data.workFromHomePolicy || null,
        travelPolicy: data.travelPolicy || null,
        policyEffectiveFrom: data.policyEffectiveFrom || null,
        policyNotes: data.policyNotes || null,
      });
    }

    return { ok: true as const };
  });

// ---------------------------------------------------------------------------
// 7. Compensation History
// ---------------------------------------------------------------------------

export const addEmployeeCompensationHistoryFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      personId: z.string().min(1),
      effectiveDate: z.string().min(1),
      compensationType: z.enum(["Joining", "Increment", "Revision", "Promotion"]),
      previousCtc: z.number().int().optional(),
      revisedCtc: z.number().int().min(1),
      incrementAmount: z.number().int().optional(),
      incrementPercent: z.string().optional(),
      reason: z.string().optional(),
      remarks: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };
    if (!canManageEmployeeProfile(user)) {
      return { ok: false as const, error: "Only HR/Admin/Leadership can record compensation changes." };
    }

    await db.insert(employeeCompensationHistory).values({
      id: generateId("comp"),
      personId: data.personId,
      effectiveDate: data.effectiveDate,
      compensationType: data.compensationType,
      previousCtc: data.previousCtc || null,
      revisedCtc: data.revisedCtc,
      incrementAmount: data.incrementAmount || null,
      incrementPercent: data.incrementPercent?.trim() || null,
      reason: data.reason?.trim() || null,
      approvedBy: user.name,
      remarks: data.remarks?.trim() || null,
    });

    return { ok: true as const };
  });
