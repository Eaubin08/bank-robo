import { describe, it, expect, vi } from "vitest";

// Mock the env module
vi.mock("./_core/env", () => ({
  ENV: {
    geminiApiKey: "test-key-for-testing",
  },
}));

// Mock the Google Generative AI to avoid real API calls in tests
vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => "Analyse de test Gemini - transaction validée avec confiance élevée.",
        },
      }),
    }),
  })),
}));

describe("Banking Engine - Metrics Calculation", () => {
  it("should calculate metrics within valid range (0-1)", async () => {
    const { processTransaction } = await import("./bankingEngine");
    const { SCENARIOS } = await import("./scenarios");

    const scenario = SCENARIOS[0]!;
    const result = await processTransaction(scenario);

    expect(result.metrics.ir).toBeGreaterThanOrEqual(0);
    expect(result.metrics.ir).toBeLessThanOrEqual(1);
    expect(result.metrics.ciz).toBeGreaterThanOrEqual(0);
    expect(result.metrics.ciz).toBeLessThanOrEqual(1);
    expect(result.metrics.dts).toBeGreaterThanOrEqual(0);
    expect(result.metrics.dts).toBeLessThanOrEqual(1);
    expect(result.metrics.tsg).toBeGreaterThanOrEqual(0);
    expect(result.metrics.tsg).toBeLessThanOrEqual(1);
  });

  it("should calculate ontological tests within valid range (0.88-1.0)", async () => {
    const { processTransaction } = await import("./bankingEngine");
    const { SCENARIOS } = await import("./scenarios");

    const scenario = SCENARIOS[0]!;
    const result = await processTransaction(scenario);

    const tests = result.ontologicalTests;
    for (const [key, value] of Object.entries(tests)) {
      expect(value, `${key} should be >= 0.88`).toBeGreaterThanOrEqual(0.88);
      expect(value, `${key} should be <= 1.0`).toBeLessThanOrEqual(1.0);
    }
  });

  it("should return 9 ontological tests", async () => {
    const { processTransaction } = await import("./bankingEngine");
    const { SCENARIOS } = await import("./scenarios");

    const scenario = SCENARIOS[0]!;
    const result = await processTransaction(scenario);

    const testKeys = Object.keys(result.ontologicalTests);
    expect(testKeys).toHaveLength(9);
    expect(testKeys).toContain("timeIsLaw");
    expect(testKeys).toContain("absoluteHoldGate");
    expect(testKeys).toContain("zeroToleranceFlag");
    expect(testKeys).toContain("irreversibilityIndex");
    expect(testKeys).toContain("conflictZoneIsolation");
    expect(testKeys).toContain("decisionTimeSensitivity");
    expect(testKeys).toContain("totalSystemGuard");
    expect(testKeys).toContain("negativeMemoryReflexes");
    expect(testKeys).toContain("emergentBehaviorWatch");
  });

  it("should return a valid decision (AUTORISER, ANALYSER, or BLOQUER)", async () => {
    const { processTransaction } = await import("./bankingEngine");
    const { SCENARIOS } = await import("./scenarios");

    const scenario = SCENARIOS[0]!;
    const result = await processTransaction(scenario);

    expect(["AUTORISER", "ANALYSER", "BLOQUER"]).toContain(result.decision);
    expect(result.reason).toBeTruthy();
    expect(typeof result.roiContribution).toBe("number");
  });

  it("should block high-risk transactions", async () => {
    const { processTransaction } = await import("./bankingEngine");
    const { SCENARIOS } = await import("./scenarios");

    const suspectScenario = SCENARIOS.find(s => s.name === "Transaction-Suspecte");
    expect(suspectScenario).toBeDefined();

    const result = await processTransaction(suspectScenario!);
    expect(["BLOQUER", "ANALYSER"]).toContain(result.decision);
  });

  it("should authorize low-risk transactions (most of the time)", async () => {
    const { processTransaction } = await import("./bankingEngine");
    const { SCENARIOS } = await import("./scenarios");

    const premiumScenario = SCENARIOS.find(s => s.name === "Client-Premium");
    expect(premiumScenario).toBeDefined();

    // Run multiple times since ontological tests have random variance
    let authorizeCount = 0;
    const runs = 10;
    for (let i = 0; i < runs; i++) {
      const result = await processTransaction(premiumScenario!);
      if (result.decision === "AUTORISER") authorizeCount++;
    }
    // Low-risk should be authorized at least 50% of the time
    expect(authorizeCount).toBeGreaterThanOrEqual(runs * 0.5);
  });

  it("should include gemini analysis in result", async () => {
    const { processTransaction } = await import("./bankingEngine");
    const { SCENARIOS } = await import("./scenarios");

    const scenario = SCENARIOS[0]!;
    const result = await processTransaction(scenario);

    expect(result.geminiAnalysis).toBeTruthy();
    expect(typeof result.geminiAnalysis).toBe("string");
  });
});

describe("Banking Engine - Scenarios", () => {
  it("should have 23 scenarios", async () => {
    const { SCENARIOS } = await import("./scenarios");
    expect(SCENARIOS).toHaveLength(23);
  });

  it("should have correct distribution (19 AUTORISER, 3 ANALYSER, 1 BLOQUER)", async () => {
    const { SCENARIOS } = await import("./scenarios");
    
    const autoriser = SCENARIOS.filter(s => s.expectedDecision === "AUTORISER");
    const analyser = SCENARIOS.filter(s => s.expectedDecision === "ANALYSER");
    const bloquer = SCENARIOS.filter(s => s.expectedDecision === "BLOQUER");

    expect(autoriser).toHaveLength(19);
    expect(analyser).toHaveLength(3);
    expect(bloquer).toHaveLength(1);
  });

  it("should return random scenarios", async () => {
    const { getRandomScenario } = await import("./scenarios");
    
    const scenarios = new Set<string>();
    for (let i = 0; i < 50; i++) {
      scenarios.add(getRandomScenario().name);
    }
    expect(scenarios.size).toBeGreaterThan(3);
  });

  it("should find scenario by name", async () => {
    const { getScenarioByName } = await import("./scenarios");
    
    const scenario = getScenarioByName("Client-Premium");
    expect(scenario).toBeDefined();
    expect(scenario!.name).toBe("Client-Premium");
    expect(scenario!.expectedDecision).toBe("AUTORISER");
  });
});

describe("Ontological Test Definitions Coverage", () => {
  it("should have definitions for all 9 tests matching engine output", async () => {
    const { processTransaction } = await import("./bankingEngine");
    const { SCENARIOS } = await import("./scenarios");

    const result = await processTransaction(SCENARIOS[0]!);
    const testKeys = Object.keys(result.ontologicalTests);

    // All 9 tests must be present
    const expectedTests = [
      "timeIsLaw",
      "absoluteHoldGate",
      "zeroToleranceFlag",
      "irreversibilityIndex",
      "conflictZoneIsolation",
      "decisionTimeSensitivity",
      "totalSystemGuard",
      "negativeMemoryReflexes",
      "emergentBehaviorWatch",
    ];

    expect(testKeys.sort()).toEqual(expectedTests.sort());
  });
});
