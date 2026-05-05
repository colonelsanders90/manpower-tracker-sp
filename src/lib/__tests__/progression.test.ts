import { describe, it, expect } from "vitest";
import {
  getRequiredCourses,
  getRelevantCourses,
  STATUS_FILL,
  STATUS_LABEL,
  SHOWS_MASC,
  SHOWS_TRACK,
  SHOWS_RLEVEL,
  PROFILES,
  TRACKS,
  R_LEVELS,
  ROA_STATUSES,
  type Profile,
} from "../progression";
import type { RoaCourseListItem } from "@/types/roaCourses";

// ─── Factory ─────────────────────────────────────────────────────────────────

function makeCourse(
  overrides: Pick<RoaCourseListItem, "Id" | "Title"> & Partial<RoaCourseListItem>,
): RoaCourseListItem {
  return {
    Created: "2026-01-01",
    Modified: "2026-01-01",
    Author: { Title: "T" },
    Editor: { Title: "T" },
    Label: overrides.Title,
    Profiles: [],
    DisplayOrder: 100,
    IsActive: true,
    ...overrides,
  };
}

// ─── Domain enums sanity ─────────────────────────────────────────────────────

describe("domain enums", () => {
  it("has exactly 3 profiles in canonical order", () => {
    expect(PROFILES).toEqual(["MDES", "EOS", "DXO"]);
  });

  it("has 5 tracks matching the Excel", () => {
    expect(TRACKS).toEqual(["Software", "Data", "Cyber", "PM", "Cloud"]);
  });

  it("has R1 through R5", () => {
    expect(R_LEVELS).toEqual(["R1", "R2", "R3", "R4", "R5"]);
  });

  it("has 4 ROA statuses including NotApplicable", () => {
    expect(ROA_STATUSES).toContain("NotApplicable");
    expect(ROA_STATUSES).toHaveLength(4);
  });
});

// ─── Status visuals ──────────────────────────────────────────────────────────

describe("status visuals", () => {
  it("has a fill colour for every status", () => {
    for (const s of ROA_STATUSES) {
      expect(STATUS_FILL[s]).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it("has a label for every status", () => {
    for (const s of ROA_STATUSES) {
      expect(STATUS_LABEL[s]).toBeTruthy();
    }
  });

  it("uses the Excel's existing fills for ATT and Planned", () => {
    // these must match so HR's existing colour mental model carries over
    expect(STATUS_FILL.Completed).toBe("#92D050");
    expect(STATUS_FILL.Planned).toBe("#FFC000");
  });
});

// ─── Profile-conditional fields ──────────────────────────────────────────────

describe("profile-conditional fields", () => {
  it("only MDES sees MASC", () => {
    expect(SHOWS_MASC.MDES).toBe(true);
    expect(SHOWS_MASC.EOS).toBe(false);
    expect(SHOWS_MASC.DXO).toBe(false);
  });

  it("Track applies to DXO and EOS, not MDES (per the source Excel)", () => {
    expect(SHOWS_TRACK.DXO).toBe(true);
    expect(SHOWS_TRACK.EOS).toBe(true);
    expect(SHOWS_TRACK.MDES).toBe(false);
  });

  it("R-Level applies to everyone", () => {
    for (const p of PROFILES) {
      expect(SHOWS_RLEVEL[p]).toBe(true);
    }
  });
});

// ─── getRequiredCourses ──────────────────────────────────────────────────────

describe("getRequiredCourses", () => {
  const courses: RoaCourseListItem[] = [
    makeCourse({ Id: 1, Title: "MDEC", Profiles: ["MDES"], DisplayOrder: 1 }),
    makeCourse({ Id: 2, Title: "JFC", Profiles: ["MDES", "EOS"], DisplayOrder: 2 }),
    makeCourse({ Id: 3, Title: "IDSC", Profiles: ["MDES"], DisplayOrder: 3 }),
    makeCourse({ Id: 4, Title: "AFAC", Profiles: ["MDES", "EOS", "DXO"], DisplayOrder: 4 }),
    makeCourse({ Id: 5, Title: "INACTIVE", Profiles: ["MDES"], DisplayOrder: 5, IsActive: false }),
  ];

  it("returns [] for a null profile", () => {
    expect(getRequiredCourses(null, courses)).toEqual([]);
  });

  it("filters courses by profile membership", () => {
    const mdesIds = getRequiredCourses("MDES", courses).map((c) => c.Title);
    expect(mdesIds).toEqual(["MDEC", "JFC", "IDSC", "AFAC"]);

    const eosIds = getRequiredCourses("EOS", courses).map((c) => c.Title);
    expect(eosIds).toEqual(["JFC", "AFAC"]);

    const dxoIds = getRequiredCourses("DXO", courses).map((c) => c.Title);
    expect(dxoIds).toEqual(["AFAC"]);
  });

  it("excludes inactive courses regardless of profile", () => {
    const result = getRequiredCourses("MDES", courses);
    expect(result.find((c) => c.Title === "INACTIVE")).toBeUndefined();
  });

  it("sorts by DisplayOrder ascending", () => {
    const shuffled: RoaCourseListItem[] = [
      makeCourse({ Id: 1, Title: "Z", Profiles: ["DXO"], DisplayOrder: 30 }),
      makeCourse({ Id: 2, Title: "A", Profiles: ["DXO"], DisplayOrder: 10 }),
      makeCourse({ Id: 3, Title: "M", Profiles: ["DXO"], DisplayOrder: 20 }),
    ];
    const titles = getRequiredCourses("DXO", shuffled).map((c) => c.Title);
    expect(titles).toEqual(["A", "M", "Z"]);
  });

  it("returns [] when no active courses target the profile", () => {
    expect(getRequiredCourses("DXO", [courses[0]!])).toEqual([]);
  });
});

// ─── getRelevantCourses ──────────────────────────────────────────────────────

describe("getRelevantCourses", () => {
  const courses: RoaCourseListItem[] = [
    makeCourse({ Id: 1, Title: "MDEC", Profiles: ["MDES"], DisplayOrder: 1 }),
    makeCourse({ Id: 2, Title: "JFC", Profiles: ["MDES"], DisplayOrder: 2 }),
    makeCourse({ Id: 3, Title: "IDSC", Profiles: ["DXO"], DisplayOrder: 3 }),
  ];

  it("returns just required courses when no extras", () => {
    const result = getRelevantCourses("MDES", courses, new Set());
    expect(result.map((c) => c.Title)).toEqual(["MDEC", "JFC"]);
  });

  it("appends extras the person has attendance for, even if outside their profile", () => {
    // MDES person who has somehow got an IDSC attendance row (admin override)
    const result = getRelevantCourses("MDES", courses, new Set([3]));
    const titles = result.map((c) => c.Title);
    expect(titles).toEqual(["MDEC", "JFC", "IDSC"]);
  });

  it("doesn't double-count extras that are already required", () => {
    const result = getRelevantCourses("MDES", courses, new Set([1, 2]));
    expect(result.map((c) => c.Title)).toEqual(["MDEC", "JFC"]);
  });

  it("returns [] for null profile (even with extras)", () => {
    expect(getRelevantCourses(null, courses, new Set([1, 2, 3]))).toEqual([]);
  });
});

// ─── Type sanity (compile-time) ──────────────────────────────────────────────
// These don't add runtime asserts but they fail the build if Profile changes.

const _profileTypeCheck: Profile = "MDES";
void _profileTypeCheck;
