import { Schema, model, Document, models } from "mongoose";
import {
  APPRAISAL_STATUS,
  ACADEMIC_CADRES,
  EVALUATOR_ROLES,
  type AppraisalStatus,
  type EvaluatorRole,
} from "../constant/appraisal";
import { type UserRole, type UserDesignation } from "../constant/userInfo";


export interface IVerifiedMark {
  count: number; // raw count entered by faculty
  proof: string; // Google Drive / URL proof link
  claimed: number; // marks calculated on the frontend
  verified: number; // marks set by review team (0 = not yet verified)
}

export interface ICourseMetric {
  code: string;
  semester: string;
  // Section 1 – Result Analysis
  studentsAbove60: number;
  students50to59: number;
  students40to49: number;
  totalStudents: number;
  resultMarks: number;
  // Section 2 – Course Outcome
  coAttainment: number; // percentage
  timelySubmissionCO: boolean;
  coMarks: number;
  // Section 4 – Academic Engagement
  studentsPresent: number;
  totalEnrolledStudents: number;
  engagementMarks: number;
  // Section 7 – Student Feedback
  feedbackPercentage: number;
  feedbackMarks: number;
}

export interface IFacultyAppraisal extends Document {
  userId: string;
  status: AppraisalStatus;

  designation: UserDesignation;
  /**
   * System role of the faculty member.
   * Sourced from UserRole — faculty | hod | dean | associate_dean | director | admin.
   * Determines which evaluation path is active in Part D.
   */
  role: UserRole;
  appraisalYear: number;

  partA: {
    courses: ICourseMetric[];
    eLearningInstances: number;
    weeklyLoadSem1: number;
    weeklyLoadSem2: number;
    phdScholar:           boolean;
    projectsGuided: number;
    ptgMeetings: number;
    sectionMarks: {
      resultAnalysis: number;
      courseOutcome: number;
      eLearning: number;
      academicEngagement: number;
      teachingLoad: number;
      projectsGuided: number;
      studentFeedback: number;
      ptgMeetings: number;
    };
    totalClaimed: number;
    totalVerified: number;
  };

  partB: {
    papers: {
      sci: IVerifiedMark;
      esci: IVerifiedMark;
      scopus: IVerifiedMark;
      ugc: IVerifiedMark;
      other: IVerifiedMark;
    };
    conferences: {
      scopus: IVerifiedMark;
      other: IVerifiedMark;
    };
    bookChapters: {
      scopus: IVerifiedMark;
      other: IVerifiedMark;
    };
    books: {
      intlIndexed: IVerifiedMark;
      intlNational: IVerifiedMark;
      local: IVerifiedMark;
    };
    citations: {
      wos: IVerifiedMark;
      scopus: IVerifiedMark;
      googleScholar: IVerifiedMark;
    };
    copyrights: {
      individualRegistered: IVerifiedMark;
      individualGranted: IVerifiedMark;
      instituteRegistered: IVerifiedMark;
      instituteGranted: IVerifiedMark;
    };
    patents: {
      individualRegistered: IVerifiedMark;
      individualPublished: IVerifiedMark;
      individualGranted: IVerifiedMark;
      individualCommercialized: IVerifiedMark;
      instituteRegistered: IVerifiedMark;
      institutePublished: IVerifiedMark;
      instituteGranted: IVerifiedMark;
      instituteCommercialized: IVerifiedMark;
    };
    grants: {
      research: IVerifiedMark;
      nonResearch: IVerifiedMark;
    };
    revenueTraining: IVerifiedMark;
    products: {
      commercialized: IVerifiedMark;
      developed: IVerifiedMark;
      poc: IVerifiedMark;
    };
    startup: {
      revenue: IVerifiedMark;
      funding: IVerifiedMark;
      product: IVerifiedMark;
      poc: IVerifiedMark;
      registered: IVerifiedMark;
    };
    awards: {
      international: IVerifiedMark;
      government: IVerifiedMark;
      national: IVerifiedMark;
      intlFellowship: IVerifiedMark;
      nationalFellowship: IVerifiedMark;
    };
    industryInteraction: {
      activeMou: IVerifiedMark;
      collaboration: IVerifiedMark;
    };
    placement: IVerifiedMark;
    totalClaimed: number;
    totalVerified: number;
  };

  partC: {
    pdfCompleted: boolean;
    pdfOngoing: boolean;
    phdAwarded: boolean;
    trainingAttended: {
      twoWeek: number;
      oneWeek: number;
      twoToFiveDays: number;
      oneDay: number;
    };
    trainingOrganized: {
      twoWeek: number;
      oneWeek: number;
      twoToFiveDays: number;
      oneDay: number;
    };
    phdGuided: {
      awarded: number;
      submitted: number;
      ongoing: number;
    };
    totalClaimed: number;
    totalVerified: number;
  };

  partD: {
    portfolioType: "institute" | "department" | "both";
    instituteLevelPortfolio: string;
    departmentLevelPortfolio: string;
    // Regular faculty self-assessment
    selfAwardedMarks: number;
    // Evaluator marks — written by Dean / HOD, not the faculty
    deanMarks: number;
    hodMarks: number;
    isMarkDean: boolean;
    isMarkHOD: boolean;
    // Admin-role path — active when role is one of the EVALUATOR_ROLES
    isAdministrativeRole: boolean;
    /**
     * Stores the faculty member's own role when on the admin path
     * (e.g. "associate_dean" | "dean" | "director" | "hod").
     * Typed as EvaluatorRole to prevent storing "faculty" or "admin" here.
     */
    administrativeRole: EvaluatorRole | "";
    adminSelfAwardedMarks: number;
    directorMarks: number;
    adminDeanMarks: number;
    totalClaimed: number;
    totalVerified: number;
  };

  partE: {
    bulletPoints: string;
    totalClaimed: number;
    totalVerified: number;
  };

  summary: {
    grandTotalClaimed: number;
    grandTotalVerified: number;
  };

  declaration: {
    isAgreed: boolean;
    signatureDate?: Date;
  };
}


const verifiedMark = {
  count: { type: Number, default: 0, min: 0 },
  proof: { type: String, default: "" },
  claimed: { type: Number, default: 0, min: 0 },
  verified: { type: Number, default: 0, min: 0 },
};


const facultyAppraisalSchema = new Schema<IFacultyAppraisal>(
  {
    userId: { type: String, required: true, index: true },

    status: {
      type:    String,
      enum:    APPRAISAL_STATUS,
      default: APPRAISAL_STATUS.PEDING,
    },

    /** Academic rank — validated against ACADEMIC_CADRES derived from DESIGNATION. */
    designation: {
      type: String,
      enum: ACADEMIC_CADRES,          // "Professor" | "Associate Professor" | "Assistant Professor"
      required: true,
    },

    /** System role — validated against ROLE values from user constants. */
    role: {
      type: String,
      enum: ["associate_dean", "director", "hod", "dean", "admin", "faculty"] as const,
      required: true,
    },

    appraisalYear: { type: Number, required: true },

    // ── PART A ──────────────────────────────────────────────────────────────
    partA: {
      courses: [
        {
          _id: false,
          code: { type: String, default: "" },
          semester: { type: String, default: "" },
          studentsAbove60: { type: Number, default: 0 },
          students50to59: { type: Number, default: 0 },
          students40to49: { type: Number, default: 0 },
          totalStudents: { type: Number, default: 0 },
          resultMarks: { type: Number, default: 0 },
          coAttainment: { type: Number, default: 0 },
          timelySubmissionCO: { type: Boolean, default: false },
          coMarks: { type: Number, default: 0 },
          studentsPresent: { type: Number, default: 0 },
          totalEnrolledStudents: { type: Number, default: 0 },
          engagementMarks: { type: Number, default: 0 },
          feedbackPercentage: { type: Number, default: 0 },
          feedbackMarks: { type: Number, default: 0 },
        },
      ],
      eLearningInstances: { type: Number, default: 0 },
      weeklyLoadSem1: { type: Number, default: 0 },
      weeklyLoadSem2: { type: Number, default: 0 },
      phdScholar:           { type: Boolean, default: false },
      projectsGuided: { type: Number, default: 0 },
      ptgMeetings: { type: Number, default: 0 },
      sectionMarks: {
        resultAnalysis: { type: Number, default: 0 },
        courseOutcome: { type: Number, default: 0 },
        eLearning: { type: Number, default: 0 },
        academicEngagement: { type: Number, default: 0 },
        teachingLoad: { type: Number, default: 0 },
        projectsGuided: { type: Number, default: 0 },
        studentFeedback: { type: Number, default: 0 },
        ptgMeetings: { type: Number, default: 0 },
      },
      totalClaimed: { type: Number, default: 0 },
      totalVerified: { type: Number, default: 0 },
    },

    // ── PART B ──────────────────────────────────────────────────────────────
    partB: {
      papers: {
        sci: verifiedMark,
        esci: verifiedMark,
        scopus: verifiedMark,
        ugc: verifiedMark,
        other: verifiedMark,
      },
      conferences: { scopus: verifiedMark, other: verifiedMark },
      bookChapters: { scopus: verifiedMark, other: verifiedMark },
      books: {
        intlIndexed: verifiedMark,
        intlNational: verifiedMark,
        local: verifiedMark,
      },
      citations: {
        wos: verifiedMark,
        scopus: verifiedMark,
        googleScholar: verifiedMark,
      },
      copyrights: {
        individualRegistered: verifiedMark,
        individualGranted: verifiedMark,
        instituteRegistered: verifiedMark,
        instituteGranted: verifiedMark,
      },
      patents: {
        individualRegistered: verifiedMark,
        individualPublished: verifiedMark,
        individualGranted: verifiedMark,
        individualCommercialized: verifiedMark,
        instituteRegistered: verifiedMark,
        institutePublished: verifiedMark,
        instituteGranted: verifiedMark,
        instituteCommercialized: verifiedMark,
      },
      grants: { research: verifiedMark, nonResearch: verifiedMark },
      revenueTraining: verifiedMark,
      products: {
        commercialized: verifiedMark,
        developed: verifiedMark,
        poc: verifiedMark,
      },
      startup: {
        revenue: verifiedMark,
        funding: verifiedMark,
        product: verifiedMark,
        poc: verifiedMark,
        registered: verifiedMark,
      },
      awards: {
        international: verifiedMark,
        government: verifiedMark,
        national: verifiedMark,
        intlFellowship: verifiedMark,
        nationalFellowship: verifiedMark,
      },
      industryInteraction: { activeMou: verifiedMark, collaboration: verifiedMark },
      placement: verifiedMark,
      totalClaimed: { type: Number, default: 0 },
      totalVerified: { type: Number, default: 0 },
    },

    // ── PART C ──────────────────────────────────────────────────────────────
    partC: {
      pdfCompleted: { type: Boolean, default: false },
      pdfOngoing: { type: Boolean, default: false },
      phdAwarded: { type: Boolean, default: false },
      trainingAttended: {
        twoWeek: { type: Number, default: 0 },
        oneWeek: { type: Number, default: 0 },
        twoToFiveDays: { type: Number, default: 0 },
        oneDay: { type: Number, default: 0 },
      },
      trainingOrganized: {
        twoWeek: { type: Number, default: 0 },
        oneWeek: { type: Number, default: 0 },
        twoToFiveDays: { type: Number, default: 0 },
        oneDay: { type: Number, default: 0 },
      },
      phdGuided: {
        awarded: { type: Number, default: 0 },
        submitted: { type: Number, default: 0 },
        ongoing: { type: Number, default: 0 },
      },
      totalClaimed: { type: Number, default: 0 },
      totalVerified: { type: Number, default: 0 },
    },

    // ── PART D ──────────────────────────────────────────────────────────────
    partD: {
      portfolioType: {
        type: String,
        enum: ["institute", "department", "both"],
        default: "both",
      },
      instituteLevelPortfolio: { type: String, default: "" },
      departmentLevelPortfolio: { type: String, default: "" },
      selfAwardedMarks: { type: Number, default: 0 },
      deanMarks: { type: Number, default: 0 },
      hodMarks: { type: Number, default: 0 },
      isMarkDean: { type: Boolean, default: false },
      isMarkHOD: { type: Boolean, default: false },
      isAdministrativeRole: { type: Boolean, default: false },
      /**
       * Only populated when isAdministrativeRole is true.
       * Constrained to EVALUATOR_ROLES — "faculty" and "admin" are never valid here.
       */
      administrativeRole: {
        type: String,
        enum: [...EVALUATOR_ROLES, ""],  // "associate_dean" | "director" | "hod" | "dean" | ""
        default: "",
      },
      adminSelfAwardedMarks: { type: Number, default: 0 },
      directorMarks: { type: Number, default: 0 },
      adminDeanMarks: { type: Number, default: 0 },
      totalClaimed: { type: Number, default: 0 },
      totalVerified: { type: Number, default: 0 },
    },

    // ── PART E ──────────────────────────────────────────────────────────────
    partE: {
      bulletPoints: { type: String, default: "", },
      totalClaimed: { type: Number, default: 0, max: 50 },
      totalVerified: { type: Number, default: 0 },
    },

    // ── SUMMARY ─────────────────────────────────────────────────────────────
    summary: {
      grandTotalClaimed: { type: Number, default: 0 },
      grandTotalVerified: { type: Number, default: 0 },
    },

    // ── DECLARATION (triggered by Part F freeze action) ──────────────────────
    declaration: {
      isAgreed: { type: Boolean, default: false },
      signatureDate: { type: Date },
    },
  },
  { timestamps: true }
);

// One appraisal per faculty per year
facultyAppraisalSchema.index(
  { userId: 1, appraisalYear: 1 },
  { unique: true, name: "unique_appraisal_per_user_year" }
);

export const FacultyAppraisal =
  models.FacultyAppraisal ||
  model<IFacultyAppraisal>("FacultyAppraisal", facultyAppraisalSchema);
