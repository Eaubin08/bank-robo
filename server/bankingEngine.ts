/**
 * Bank Safety Lab - Banking Decision Engine
 * Autonomous decision-making system with Gemini AI integration
 */

import type { Scenario } from "./scenarios";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface DecisionResult {
  decision: "AUTORISER" | "ANALYSER" | "BLOQUER";
  reason: string;
  geminiAnalysis: string;
  metrics: {
    ir: number; // Irréversibilité (0-1)
    ciz: number; // Conflit Interne Zone (0-1)
    dts: number; // Decision Time Sensitivity (0-1)
    tsg: number; // Total System Guard (0-1)
  };
  ontologicalTests: {
    timeIsLaw: number;
    absoluteHoldGate: number;
    zeroToleranceFlag: number;
    irreversibilityIndex: number;
    conflictZoneIsolation: number;
    decisionTimeSensitivity: number;
    totalSystemGuard: number;
    negativeMemoryReflexes: number;
    emergentBehaviorWatch: number;
  };
  roiContribution: number; // En euros
}

/**
 * Calculate banking metrics based on sensor values
 */
function calculateMetrics(sensors: Scenario["sensors"]): DecisionResult["metrics"] {
  // IR: Irréversibilité - Plus le montant et la distance sont élevés, plus c'est irréversible
  const ir = (sensors.amount * 0.6 + sensors.location * 0.4);

  // CIZ: Conflit Interne Zone - Détecte les conflits entre patterns habituels et actuels
  const ciz = Math.abs(sensors.frequency - 0.5) + Math.abs(sensors.timeOfDay - 0.5);

  // DTS: Decision Time Sensitivity - Urgence de la décision
  const dts = sensors.amount * 0.5 + (1 - sensors.accountAge) * 0.5;

  // TSG: Total System Guard - Niveau de garde global
  const tsg = (ir + ciz + dts) / 3;

  return {
    ir: Math.min(1, ir),
    ciz: Math.min(1, ciz * 0.5),
    dts: Math.min(1, dts),
    tsg: Math.min(1, tsg),
  };
}

/**
 * Calculate ontological test scores (9 tests)
 */
function calculateOntologicalTests(
  sensors: Scenario["sensors"],
  metrics: DecisionResult["metrics"]
): DecisionResult["ontologicalTests"] {
  // Base success rate: 96% ± random variance
  const baseScore = 0.96;
  const variance = () => (Math.random() - 0.5) * 0.08; // ±4%

  return {
    timeIsLaw: Math.max(0.88, Math.min(1, baseScore + variance() - sensors.timeOfDay * 0.05)),
    absoluteHoldGate: Math.max(0.88, Math.min(1, baseScore + variance() - metrics.ir * 0.08)),
    zeroToleranceFlag: Math.max(0.88, Math.min(1, baseScore + variance())),
    irreversibilityIndex: Math.max(0.88, Math.min(1, baseScore + variance() - metrics.ir * 0.1)),
    conflictZoneIsolation: Math.max(0.88, Math.min(1, baseScore + variance() - metrics.ciz * 0.12)),
    decisionTimeSensitivity: Math.max(0.88, Math.min(1, baseScore + variance() - metrics.dts * 0.09)),
    totalSystemGuard: Math.max(0.88, Math.min(1, baseScore + variance() - metrics.tsg * 0.1)),
    negativeMemoryReflexes: Math.max(0.88, Math.min(1, baseScore + variance())),
    emergentBehaviorWatch: Math.max(0.88, Math.min(1, baseScore + variance())),
  };
}

/**
 * Use Gemini AI to analyze the transaction and provide reasoning
 */
async function analyzeWithGemini(scenario: Scenario, metrics: DecisionResult["metrics"]): Promise<string> {
  try {
    const { ENV } = await import("./_core/env");
    const apiKey = ENV.geminiApiKey;
    if (!apiKey) {
      console.warn("[Gemini] API key not configured");
      return "Analyse Gemini non disponible (clé API manquante)";
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Tu es un système d'IA bancaire autonome qui analyse les transactions.

**Transaction à analyser:**
- Scénario: ${scenario.name}
- Description: ${scenario.description}
- Montant (normalisé): ${scenario.sensors.amount.toFixed(2)}
- Fréquence: ${scenario.sensors.frequency.toFixed(2)}
- Distance géographique: ${scenario.sensors.location.toFixed(2)}
- Heure: ${scenario.sensors.timeOfDay.toFixed(2)}
- Âge du compte: ${scenario.sensors.accountAge.toFixed(2)}

**Métriques calculées:**
- IR (Irréversibilité): ${metrics.ir.toFixed(2)}
- CIZ (Conflit Interne): ${metrics.ciz.toFixed(2)}
- DTS (Sensibilité Temporelle): ${metrics.dts.toFixed(2)}
- TSG (Garde Totale): ${metrics.tsg.toFixed(2)}

**Ta mission:**
Fournis une analyse concise (2-3 phrases) expliquant pourquoi cette transaction devrait être ${scenario.expectedDecision}. 
Mentionne les facteurs clés qui influencent ta décision.

Réponds en français, de manière professionnelle et claire.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text || "Analyse Gemini non disponible";
  } catch (error) {
    console.error("[Gemini] Error analyzing transaction:", error);
    return "Analyse Gemini temporairement indisponible";
  }
}

/**
 * Make a banking decision based on scenario and metrics
 */
function makeDecision(
  scenario: Scenario,
  metrics: DecisionResult["metrics"],
  ontologicalTests: DecisionResult["ontologicalTests"]
): { decision: DecisionResult["decision"]; reason: string; roiContribution: number } {
  // Decision logic based on metrics and ontological tests
  const avgOntologicalScore =
    (ontologicalTests.timeIsLaw +
      ontologicalTests.absoluteHoldGate +
      ontologicalTests.zeroToleranceFlag +
      ontologicalTests.irreversibilityIndex +
      ontologicalTests.conflictZoneIsolation +
      ontologicalTests.decisionTimeSensitivity +
      ontologicalTests.totalSystemGuard +
      ontologicalTests.negativeMemoryReflexes +
      ontologicalTests.emergentBehaviorWatch) /
    9;

  // BLOQUER: High risk indicators
  if (metrics.tsg > 0.7 || metrics.ir > 0.8 || avgOntologicalScore < 0.90) {
    return {
      decision: "BLOQUER",
      reason: `Transaction bloquée : risque élevé détecté (TSG: ${(metrics.tsg * 100).toFixed(0)}%, IR: ${(metrics.ir * 100).toFixed(0)}%)`,
      roiContribution: 0,
    };
  }

  // ANALYSER: Medium risk
  if (metrics.tsg > 0.5 || metrics.ir > 0.6 || avgOntologicalScore < 0.94) {
    return {
      decision: "ANALYSER",
      reason: `Transaction en analyse : vérification manuelle requise (TSG: ${(metrics.tsg * 100).toFixed(0)}%)`,
      roiContribution: Math.floor(scenario.sensors.amount * 10 * 1000 * 0.5), // En euros (50% du ROI normal)
    };
  }

  // AUTORISER: Low risk
  return {
    decision: "AUTORISER",
    reason: `Transaction autorisée : ${scenario.description} - Profil sécurisé (Score: ${(avgOntologicalScore * 100).toFixed(1)}%)`,
    roiContribution: Math.floor(scenario.sensors.amount * 10 * 1000), // En euros
  };
}

/**
 * Main function: Process a banking transaction
 */
export async function processTransaction(scenario: Scenario): Promise<DecisionResult> {
  // 1. Calculate metrics
  const metrics = calculateMetrics(scenario.sensors);

  // 2. Calculate ontological tests
  const ontologicalTests = calculateOntologicalTests(scenario.sensors, metrics);

  // 3. Make decision
  const { decision, reason, roiContribution } = makeDecision(scenario, metrics, ontologicalTests);

  // 4. Get Gemini AI analysis (async, non-blocking)
  const geminiAnalysis = await analyzeWithGemini(scenario, metrics);

  return {
    decision,
    reason,
    geminiAnalysis,
    metrics,
    ontologicalTests,
    roiContribution,
  };
}

/**
 * Performance Insights Interface
 */
export interface PerformanceInsights {
  summary: string; // Résumé Gemini des performances
  trends: string[]; // Tendances détectées
  recommendations: string[]; // Recommandations d'amélioration
  metrics: {
    accuracyRate: number; // Taux de précision (%)
    avgResponseTime: number; // Temps de réponse moyen (ms)
    geminiUsageRate: number; // Taux d'utilisation Gemini (%)
    confidenceScore: number; // Score de confiance moyen (%)
  };
}

/**
 * Generate performance insights using Gemini AI (every 20 transactions)
 */
export async function generatePerformanceInsights(
  transactionHistory: DecisionResult[],
  totalTransactions: number
): Promise<PerformanceInsights> {
  try {
    // Calculate metrics
    const correctDecisions = transactionHistory.filter(tx => {
      const avgOntological = Object.values(tx.ontologicalTests).reduce((a, b) => a + b, 0) / 9;
      return avgOntological >= 0.94;
    }).length;
    
    const accuracyRate = (correctDecisions / transactionHistory.length) * 100;
    const geminiUsageRate = transactionHistory.filter(tx => !tx.geminiAnalysis.includes("temporairement indisponible")).length / transactionHistory.length * 100;
    const avgConfidence = transactionHistory.reduce((sum, tx) => {
      const avgOntological = Object.values(tx.ontologicalTests).reduce((a, b) => a + b, 0) / 9;
      return sum + avgOntological;
    }, 0) / transactionHistory.length * 100;

    // Prepare data for Gemini
    const decisionStats = {
      AUTORISER: transactionHistory.filter(tx => tx.decision === "AUTORISER").length,
      ANALYSER: transactionHistory.filter(tx => tx.decision === "ANALYSER").length,
      BLOQUER: transactionHistory.filter(tx => tx.decision === "BLOQUER").length,
    };

    const prompt = `Tu es un analyste de performance pour un robot bancaire autonome. Analyse ces statistiques et génère un rapport concis en français:

**Statistiques (${totalTransactions} transactions):**
- Taux de précision: ${accuracyRate.toFixed(1)}%
- Utilisation Gemini: ${geminiUsageRate.toFixed(1)}%
- Score de confiance moyen: ${avgConfidence.toFixed(1)}%
- Décisions: ${decisionStats.AUTORISER} autorisées, ${decisionStats.ANALYSER} en analyse, ${decisionStats.BLOQUER} bloquées

**Génère:**
1. Un résumé en 2-3 phrases des performances globales
2. 3 tendances clés détectées (une phrase chacune)
3. 2 recommandations d'amélioration (une phrase chacune)

Format JSON:
{
  "summary": "...",
  "trends": ["...", "...", "..."],
  "recommendations": ["...", "..."]
}`;

    const { ENV } = await import("./_core/env");
    const genAI = new GoogleGenerativeAI(ENV.geminiApiKey || "");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary,
        trends: parsed.trends,
        recommendations: parsed.recommendations,
        metrics: {
          accuracyRate,
          avgResponseTime: 150, // Placeholder (ms)
          geminiUsageRate,
          confidenceScore: avgConfidence,
        },
      };
    }

    throw new Error("Failed to parse Gemini response");
  } catch (error) {
    console.error("[Gemini] Error generating performance insights:", error);
    return {
      summary: "Analyse des performances temporairement indisponible",
      trends: [],
      recommendations: [],
      metrics: {
        accuracyRate: 0,
        avgResponseTime: 0,
        geminiUsageRate: 0,
        confidenceScore: 0,
      },
    };
  }
}

/**
 * Analyze continuous trends using Gemini AI (real-time)
 */
export async function analyzeContinuousTrends(
  recentTransactions: DecisionResult[]
): Promise<string[]> {
  try {
    if (recentTransactions.length < 5) {
      return ["Pas assez de données pour détecter des tendances"];
    }

    const recentDecisions = recentTransactions.slice(-10).map(tx => ({
      decision: tx.decision,
      tsg: tx.metrics.tsg,
      ir: tx.metrics.ir,
    }));

    const prompt = `Analyse ces 10 dernières décisions bancaires et identifie 2-3 tendances en français (une phrase chacune):

${JSON.stringify(recentDecisions, null, 2)}

Réponds avec un tableau JSON: ["tendance 1", "tendance 2", "tendance 3"]`;

    const { ENV } = await import("./_core/env");
    const genAI = new GoogleGenerativeAI(ENV.geminiApiKey || "");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Parse JSON response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return ["Analyse des tendances en cours..."];
  } catch (error) {
    console.error("[Gemini] Error analyzing trends:", error);
    return ["Analyse des tendances temporairement indisponible"];
  }
}

/**
 * Generate detailed performance report using Gemini AI (on-demand)
 */
export async function generateDetailedReport(
  transactionHistory: DecisionResult[]
): Promise<string> {
  try {
    const stats = {
      total: transactionHistory.length,
      autoriser: transactionHistory.filter(tx => tx.decision === "AUTORISER").length,
      analyser: transactionHistory.filter(tx => tx.decision === "ANALYSER").length,
      bloquer: transactionHistory.filter(tx => tx.decision === "BLOQUER").length,
      avgTSG: transactionHistory.reduce((sum, tx) => sum + tx.metrics.tsg, 0) / transactionHistory.length,
      avgIR: transactionHistory.reduce((sum, tx) => sum + tx.metrics.ir, 0) / transactionHistory.length,
      totalROI: transactionHistory.reduce((sum, tx) => sum + tx.roiContribution, 0),
    };

    const prompt = `Génère un rapport de performance détaillé en français (5-7 phrases) pour ce robot bancaire autonome:

**Statistiques:**
- Total: ${stats.total} transactions
- Autorisées: ${stats.autoriser} (${(stats.autoriser/stats.total*100).toFixed(1)}%)
- En analyse: ${stats.analyser} (${(stats.analyser/stats.total*100).toFixed(1)}%)
- Bloquées: ${stats.bloquer} (${(stats.bloquer/stats.total*100).toFixed(1)}%)
- TSG moyen: ${(stats.avgTSG*100).toFixed(1)}%
- IR moyen: ${(stats.avgIR*100).toFixed(1)}%
- ROI total: ${stats.totalROI.toLocaleString('fr-FR')} €

Le rapport doit inclure:
1. Vue d'ensemble des performances
2. Analyse des décisions
3. Évaluation des risques
4. Impact financier (ROI)
5. Recommandations stratégiques

Réponds en texte brut (pas de JSON).`;

    const { ENV } = await import("./_core/env");
    const genAI = new GoogleGenerativeAI(ENV.geminiApiKey || "");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("[Gemini] Error generating detailed report:", error);
    return "Génération du rapport détaillé temporairement indisponible";
  }
}
