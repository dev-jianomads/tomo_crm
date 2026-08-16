import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatRelationshipGeography, relationshipsGenerated, type Relationship } from "./mockData";
import { applyFilters, parseFilterPromptHeuristic } from "./relationshipFilters";
import { parseRelationshipsCsv } from "./relationshipsCsv";

function baseRel(overrides: Partial<Relationship> = {}): Relationship {
  return {
    id: "lp-1",
    name: "Alex Morgan",
    firm: "Northwind Capital",
    daysSinceLastMeaningfulContact: 3,
    stage: "Active diligence",
    momentumDirection: "Heating up",
    tier: "Tier 1",
    relationshipOwner: "You",
    investorType: "Family office",
    strategyFit: "Active mandate",
    strategyType: "Long/short equity",
    lpLocation: "North America",
    investmentRemit: "Global",
    typicalCheckSize: "$25–50M",
    fundSizePreference: "No cap",
    source: "Direct",
    lastFundHistory: "Invested Fund II",
    decisionTimeline: "Q1",
    fiscalYearEnd: "Dec",
    consultantDependent: "Direct",
    esgRequired: "No",
    nextMove: "Share deck",
    openLoops: 1,
    band: "Heating Up",
    ...overrides,
  };
}

describe("formatRelationshipGeography", () => {
  it("prefers organization city / country / region", () => {
    const rel = baseRel({
      organization: { city: "Brisbane", country: "Australia", region: "APAC" },
    });
    assert.equal(formatRelationshipGeography(rel), "Brisbane, Australia, APAC");
  });

  it("skips empty org parts", () => {
    const rel = baseRel({
      organization: { city: "Brisbane", country: "Australia", region: null },
    });
    assert.equal(formatRelationshipGeography(rel), "Brisbane, Australia");
  });

  it("falls back to lpLocation · investmentRemit when org fields are empty", () => {
    const rel = baseRel({ organization: { city: "", country: null, region: "  " } });
    assert.equal(formatRelationshipGeography(rel), "North America · Global");
  });
});

describe("applyFilters query + enums", () => {
  const brisbane = baseRel({
    id: "au",
    name: "Priya Nair",
    firm: "Aurora Health AI",
    lpLocation: "APAC",
    organization: { city: "Brisbane", country: "Australia", region: "APAC" },
  });
  const sydney = baseRel({
    id: "syd",
    name: "Sarah Chen",
    firm: "Northstar Ventures",
    lpLocation: "APAC",
    organization: { city: "Sydney", country: "Australia", region: "APAC" },
  });
  const northwind = baseRel({
    id: "na",
    name: "Alex Morgan",
    firm: "Northwind Capital",
    tier: "Tier 1",
    lpLocation: "North America",
    organization: { city: "New York", country: "United States", region: "North America" },
  });
  const rows = [brisbane, sydney, northwind];

  it("query brisbane matches organization.city Brisbane and not other cities", () => {
    const hit = applyFilters(rows, { query: "brisbane" });
    assert.deepEqual(
      hit.map((r) => r.id),
      ["au"]
    );
  });

  it("query still matches name and firm", () => {
    assert.equal(applyFilters(rows, { query: "Priya" })[0]?.id, "au");
    assert.equal(applyFilters(rows, { query: "Northwind" })[0]?.id, "na");
  });

  it("query Australia matches country on multiple rows", () => {
    const hit = applyFilters(rows, { query: "Australia" });
    assert.deepEqual(
      hit.map((r) => r.id).sort(),
      ["au", "syd"]
    );
  });

  it("tier and lpLocation enum filters still work", () => {
    const tier1 = applyFilters(rows, { tier: "Tier 1" });
    assert.ok(tier1.every((r) => r.tier === "Tier 1"));
    assert.ok(tier1.some((r) => r.id === "na"));

    const na = applyFilters(rows, { lpLocation: "North America" });
    assert.deepEqual(
      na.map((r) => r.id),
      ["na"]
    );
  });

  it("generated fallback includes a Brisbane APAC row searchable by query", () => {
    const hit = applyFilters(relationshipsGenerated, { query: "brisbane" });
    assert.ok(hit.some((r) => r.organization?.city === "Brisbane" && r.lpLocation === "APAC"));
  });
});

describe("parseRelationshipsCsv geography", () => {
  it("reads city / country / region into organization", () => {
    const csv = [
      "id,name,firm,lpLocation,city,country,region",
      "r1,Priya Nair,Aurora Health AI,APAC,Brisbane,Australia,APAC",
      "r2,Alex Morgan,Northwind Capital,North America,,,",
    ].join("\n");
    const rows = parseRelationshipsCsv(csv);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0]?.organization, {
      city: "Brisbane",
      country: "Australia",
      region: "APAC",
    });
    assert.equal(rows[1]?.organization, undefined);
    assert.equal(rows[1]?.lpLocation, "North America");
  });

  it("accepts Affinity Location and name/firm aliases", () => {
    const csv = [
      "Affinity Row ID,Full Name,Organization Name,Location",
      'aff_pr_0003,Priya Nair,Aurora Health AI,"Brisbane, Australia"',
    ].join("\n");
    const rows = parseRelationshipsCsv(csv);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.id, "aff_pr_0003");
    assert.equal(rows[0]?.name, "Priya Nair");
    assert.equal(rows[0]?.firm, "Aurora Health AI");
    assert.deepEqual(rows[0]?.organization, {
      city: "Brisbane",
      country: "Australia",
      region: null,
    });
    assert.equal(formatRelationshipGeography(rows[0]!), "Brisbane, Australia");
  });

  it("accepts displayName / firmName aliases", () => {
    const csv = "id,displayName,firmName\nr9,Jamie Chen,Peakline Partners\n";
    const rows = parseRelationshipsCsv(csv);
    assert.equal(rows[0]?.name, "Jamie Chen");
    assert.equal(rows[0]?.firm, "Peakline Partners");
  });

  it("maps SRS region codes to lpLocation when lpLocation is absent", () => {
    const csv = "id,name,firm,region\nr1,A,B,EU\n";
    const rows = parseRelationshipsCsv(csv);
    assert.equal(rows[0]?.lpLocation, "EMEA");
    assert.equal(rows[0]?.organization?.region, "EU");
  });
});

describe("parseFilterPromptHeuristic leftover query", () => {
  it("puts brisbane into query so geography search works without OpenAI", () => {
    const parsed = parseFilterPromptHeuristic("brisbane");
    assert.equal(parsed.query, "brisbane");
    assert.equal(parsed.lpLocation, undefined);
  });

  it("keeps known regions on lpLocation", () => {
    const parsed = parseFilterPromptHeuristic("family office in North America");
    assert.equal(parsed.lpLocation, "North America");
    assert.equal(parsed.investorType, "Family office");
  });
});
