/**
 * Bank Safety Lab - Main Dashboard
 * Autonomous Banking Decision Robot
 */

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useState, useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";
import { Play, Pause, Square, Download, Zap, Activity, Info } from "lucide-react";

// Register Chart.js components
ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Title, ChartTooltip, Legend);

// ===== METRIC DEFINITIONS =====
// Simple 1-line definitions for each ontological test metric
const ONTOLOGICAL_DEFINITIONS: Record<string, { label: string; abbrev: string; definition: string; color: string }> = {
  timeIsLaw: {
    label: "Time Is Law",
    abbrev: "TIL",
    definition: "Vérifie si la transaction respecte les contraintes temporelles (horaires, délais légaux).",
    color: "text-purple-400",
  },
  absoluteHoldGate: {
    label: "Absolute Hold Gate",
    abbrev: "AHG",
    definition: "Barrière de sécurité absolue : bloque toute transaction dépassant les seuils critiques.",
    color: "text-red-400",
  },
  zeroToleranceFlag: {
    label: "Zero Tolerance Flag",
    abbrev: "ZTF",
    definition: "Détecte les patterns de fraude connus avec tolérance zéro (liste noire, sanctions).",
    color: "text-orange-400",
  },
  irreversibilityIndex: {
    label: "Irreversibility Index",
    abbrev: "IR",
    definition: "Mesure le niveau d'irréversibilité : plus le montant et la distance sont élevés, plus le risque est grand.",
    color: "text-red-400",
  },
  conflictZoneIsolation: {
    label: "Conflict Zone Isolation",
    abbrev: "CIZ",
    definition: "Détecte les conflits entre le comportement habituel du client et la transaction actuelle.",
    color: "text-yellow-400",
  },
  decisionTimeSensitivity: {
    label: "Decision Time Sensitivity",
    abbrev: "DTS",
    definition: "Évalue l'urgence de la décision : comptes récents + gros montants = plus de vigilance.",
    color: "text-blue-400",
  },
  totalSystemGuard: {
    label: "Total System Guard",
    abbrev: "TSG",
    definition: "Score de protection globale du système : moyenne pondérée de tous les indicateurs de risque.",
    color: "text-green-400",
  },
  negativeMemoryReflexes: {
    label: "Negative Memory Reflexes",
    abbrev: "NMR",
    definition: "Vérifie si le client a un historique d'incidents passés (rejets, fraudes antérieures).",
    color: "text-pink-400",
  },
  emergentBehaviorWatch: {
    label: "Emergent Behavior Watch",
    abbrev: "EBW",
    definition: "Surveille l'apparition de nouveaux comportements inhabituels non encore catégorisés.",
    color: "text-cyan-400",
  },
};

// Metric definitions for the 4 main metrics (IR, CIZ, DTS, TSG)
const MAIN_METRIC_DEFINITIONS: Record<string, { label: string; definition: string }> = {
  ir: {
    label: "IR (Irréversibilité)",
    definition: "Niveau de risque lié à l'irréversibilité de la transaction. Plus c'est élevé, plus la transaction est difficile à annuler.",
  },
  ciz: {
    label: "CIZ (Conflit Interne)",
    definition: "Détecte les écarts entre le comportement habituel du client et la transaction en cours.",
  },
  dts: {
    label: "DTS (Sensibilité Temporelle)",
    definition: "Urgence de la décision : comptes récents avec gros montants nécessitent plus de vigilance.",
  },
  tsg: {
    label: "TSG (Garde Totale)",
    definition: "Score de protection globale : moyenne des indicateurs IR, CIZ et DTS combinés.",
  },
};

interface TransactionResult {
  scenario: {
    name: string;
    description: string;
    expectedDecision: string;
  };
  decision: "AUTORISER" | "ANALYSER" | "BLOQUER";
  reason: string;
  geminiAnalysis: string;
  metrics: {
    ir: number;
    ciz: number;
    dts: number;
    tsg: number;
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
  roiContribution: number;
}

export default function BankingDashboard() {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(1000); // ms between transactions
  const [totalROI, setTotalROI] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);
  const [currentTransaction, setCurrentTransaction] = useState<TransactionResult | null>(null);
  const [decisionCounts, setDecisionCounts] = useState({ AUTORISER: 0, ANALYSER: 0, BLOQUER: 0 });
  const [metricsHistory, setMetricsHistory] = useState<TransactionResult["metrics"][]>([]);
  const [transactionHistory, setTransactionHistory] = useState<TransactionResult[]>([]);
  const [ontologicalScores, setOntologicalScores] = useState<TransactionResult["ontologicalTests"]>({
    timeIsLaw: 0,
    absoluteHoldGate: 0,
    zeroToleranceFlag: 0,
    irreversibilityIndex: 0,
    conflictZoneIsolation: 0,
    decisionTimeSensitivity: 0,
    totalSystemGuard: 0,
    negativeMemoryReflexes: 0,
    emergentBehaviorWatch: 0,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track real response times
  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0;

  const processTransactionMutation = trpc.banking.processTransaction.useMutation();
  
  // Gemini Performance Insights (session-based, on-demand via mutation)
  const insightsMutation = trpc.banking.getPerformanceInsights.useMutation();
  const [performanceInsights, setPerformanceInsights] = useState<{
    summary: string;
    trends: string[];
    recommendations: string[];
    metrics: { accuracyRate: number; avgResponseTime: number; geminiUsageRate: number; confidenceScore: number };
  } | null>(null);
  const insightsTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Gemini Continuous Trends (session-based, on-demand via mutation)
  const trendsMutation = trpc.banking.analyzeTrends.useMutation();
  const [continuousTrends, setContinuousTrends] = useState<string[] | null>(null);
  const trendsTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Gemini Detailed Report (on-demand)
  const generateReportMutation = trpc.banking.generateReport.useMutation();
  const [detailedReport, setDetailedReport] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  const handleGenerateReport = async () => {
    if (transactionHistory.length === 0) return;
    setIsGeneratingReport(true);
    try {
      const report = await generateReportMutation.mutateAsync({
        sessionTransactions: transactionHistory.map(tx => ({
          decision: tx.decision,
          reason: tx.reason,
          geminiAnalysis: tx.geminiAnalysis,
          metrics: tx.metrics,
          ontologicalTests: tx.ontologicalTests,
          roiContribution: tx.roiContribution,
        })),
        avgResponseTimeMs: avgResponseTime,
      });
      setDetailedReport(report);
    } catch (error) {
      console.error("Error generating report:", error);
      setDetailedReport("Erreur lors de la génération du rapport");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Auto-refresh insights every 30s when running
  useEffect(() => {
    if (!isRunning && !isPaused) return;
    if (transactionHistory.length < 10) return;
    
    const fetchInsights = async () => {
      try {
        const result = await insightsMutation.mutateAsync({
          sessionTransactions: transactionHistory.map(tx => ({
            decision: tx.decision,
            reason: tx.reason,
            geminiAnalysis: tx.geminiAnalysis,
            metrics: tx.metrics,
            ontologicalTests: tx.ontologicalTests,
            roiContribution: tx.roiContribution,
          })),
          totalSessionCount: transactionCount,
          avgResponseTimeMs: avgResponseTime,
        });
        setPerformanceInsights(result);
      } catch (e) { console.error("Insights error:", e); }
    };
    
    fetchInsights(); // fetch immediately
    insightsTimerRef.current = setInterval(fetchInsights, 30000);
    return () => { if (insightsTimerRef.current) clearInterval(insightsTimerRef.current); };
  }, [isRunning, isPaused, transactionCount >= 10 ? Math.floor(transactionCount / 10) : 0]);

  // Auto-refresh trends every 15s when running
  useEffect(() => {
    if (!isRunning && !isPaused) return;
    if (transactionHistory.length < 5) return;
    
    const fetchTrends = async () => {
      try {
        const result = await trendsMutation.mutateAsync({
          recentTransactions: transactionHistory.slice(-10).map(tx => ({
            decision: tx.decision,
            reason: tx.reason,
            geminiAnalysis: tx.geminiAnalysis,
            metrics: tx.metrics,
            ontologicalTests: tx.ontologicalTests,
            roiContribution: tx.roiContribution,
          })),
        });
        setContinuousTrends(result);
      } catch (e) { console.error("Trends error:", e); }
    };
    
    fetchTrends(); // fetch immediately
    trendsTimerRef.current = setInterval(fetchTrends, 15000);
    return () => { if (trendsTimerRef.current) clearInterval(trendsTimerRef.current); };
  }, [isRunning, isPaused, transactionCount >= 5 ? Math.floor(transactionCount / 5) : 0]);

  // Process a single transaction
  const processTransaction = async () => {
    try {
      const startTime = performance.now();
      const result = await processTransactionMutation.mutateAsync({});
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      setResponseTimes(prev => [...prev.slice(-99), responseTime]);

      setCurrentTransaction(result);
      setTotalROI((prev) => prev + result.roiContribution);
      setTransactionCount((prev) => prev + 1);
      setDecisionCounts((prev) => ({
        ...prev,
        [result.decision]: prev[result.decision] + 1,
      }));
      setMetricsHistory((prev) => [...prev.slice(-49), result.metrics]);
      setTransactionHistory((prev) => [...prev.slice(-99), result]);

      // Update ontological scores with running average
      setOntologicalScores((prev) => {
        const count = transactionCount + 1;
        const newScores = { ...prev };
        for (const key of Object.keys(result.ontologicalTests) as Array<keyof typeof result.ontologicalTests>) {
          // Running average: (old_avg * (n-1) + new_value) / n
          newScores[key] = count === 1
            ? result.ontologicalTests[key]
            : (prev[key] * (count - 1) + result.ontologicalTests[key]) / count;
        }
        return newScores;
      });
    } catch (error) {
      console.error("Error processing transaction:", error);
    }
  };

  // Start simulation
  const startSimulation = () => {
    if (intervalRef.current) return;

    setIsRunning(true);
    setIsPaused(false);

    intervalRef.current = setInterval(() => {
      processTransaction();
    }, speed);
  };

  // Pause simulation
  const pauseSimulation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPaused(true);
    setIsRunning(false);
  };

  // Stop simulation with full reset
  const stopSimulation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setIsPaused(false);
    
    // Reset all state
    setTotalROI(0);
    setTransactionCount(0);
    setCurrentTransaction(null);
    setDecisionCounts({ AUTORISER: 0, ANALYSER: 0, BLOQUER: 0 });
    setMetricsHistory([]);
    setTransactionHistory([]);
    setResponseTimes([]);
    setOntologicalScores({
      timeIsLaw: 0,
      absoluteHoldGate: 0,
      zeroToleranceFlag: 0,
      irreversibilityIndex: 0,
      conflictZoneIsolation: 0,
      decisionTimeSensitivity: 0,
      totalSystemGuard: 0,
      negativeMemoryReflexes: 0,
      emergentBehaviorWatch: 0,
    });
    setDetailedReport(null);
    setPerformanceInsights(null);
    setContinuousTrends(null);
    if (insightsTimerRef.current) clearInterval(insightsTimerRef.current);
    if (trendsTimerRef.current) clearInterval(trendsTimerRef.current);
  };

  // Export CSV
  const exportCSV = () => {
    if (transactionHistory.length === 0) {
      alert("Aucune transaction à exporter. Lancez d'abord une simulation.");
      return;
    }

    const headers = ["#", "Scenario", "Decision", "IR", "CIZ", "DTS", "TSG", "ROI", "Raison"];
    const rows = transactionHistory.map((tx, index) => [
      index + 1,
      tx.scenario.name,
      tx.decision,
      tx.metrics.ir.toFixed(2),
      tx.metrics.ciz.toFixed(2),
      tx.metrics.dts.toFixed(2),
      tx.metrics.tsg.toFixed(2),
      tx.roiContribution.toFixed(0),
      `"${tx.reason.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bank-safety-data-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (insightsTimerRef.current) clearInterval(insightsTimerRef.current);
      if (trendsTimerRef.current) clearInterval(trendsTimerRef.current);
    };
  }, []);

  // Calculate real session metrics for the 4 cards
  const sessionAccuracy = transactionHistory.length > 0
    ? (transactionHistory.filter(tx => {
        const avg = Object.values(tx.ontologicalTests).reduce((a, b) => a + b, 0) / 9;
        return avg >= 0.94;
      }).length / transactionHistory.length * 100)
    : 0;
  const sessionGeminiUsage = transactionHistory.length > 0
    ? (transactionHistory.filter(tx =>
        tx.geminiAnalysis && 
        !tx.geminiAnalysis.includes("indisponible") && 
        !tx.geminiAnalysis.includes("manquante") &&
        !tx.geminiAnalysis.includes("non disponible") &&
        !tx.geminiAnalysis.includes("Erreur")
      ).length / transactionHistory.length * 100)
    : 0;
  const sessionConfidence = transactionHistory.length > 0
    ? (transactionHistory.reduce((sum, tx) => {
        const avg = Object.values(tx.ontologicalTests).reduce((a, b) => a + b, 0) / 9;
        return sum + avg;
      }, 0) / transactionHistory.length * 100)
    : 0;

  // Calculate average ontological precision
  const avgOntologicalPrecision = transactionCount > 0
    ? (Object.values(ontologicalScores).reduce((a, b) => a + b, 0) / 9 * 100).toFixed(1)
    : "—";

  // Chart data
  const doughnutData = {
    labels: ["AUTORISER", "ANALYSER", "BLOQUER"],
    datasets: [
      {
        data: [decisionCounts.AUTORISER, decisionCounts.ANALYSER, decisionCounts.BLOQUER],
        backgroundColor: ["rgba(34, 197, 94, 0.8)", "rgba(251, 191, 36, 0.8)", "rgba(239, 68, 68, 0.8)"],
        borderColor: ["rgba(34, 197, 94, 1)", "rgba(251, 191, 36, 1)", "rgba(239, 68, 68, 1)"],
        borderWidth: 2,
      },
    ],
  };

  const lineData = {
    labels: metricsHistory.map((_, i) => `T${i + 1}`),
    datasets: [
      {
        label: "IR",
        data: metricsHistory.map((m) => m.ir),
        borderColor: "rgba(239, 68, 68, 1)",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        tension: 0.4,
      },
      {
        label: "CIZ",
        data: metricsHistory.map((m) => m.ciz),
        borderColor: "rgba(251, 191, 36, 1)",
        backgroundColor: "rgba(251, 191, 36, 0.1)",
        tension: 0.4,
      },
      {
        label: "DTS",
        data: metricsHistory.map((m) => m.dts),
        borderColor: "rgba(59, 130, 246, 1)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
      },
      {
        label: "TSG",
        data: metricsHistory.map((m) => m.tsg),
        borderColor: "rgba(34, 197, 94, 1)",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        tension: 0.4,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4 md:p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Bank Safety Lab ULTRA
            </h1>
            <p className="text-base md:text-lg text-gray-300 mt-2">Autonomous Banking Decision Robot | Track 3: Robotic Interaction</p>
          </div>
          <div className="text-right">
            <div className="text-4xl md:text-5xl font-bold text-yellow-400">
              ROI: {totalROI.toLocaleString('fr-FR')} €
            </div>
            <div className="text-sm text-gray-400 mt-1">
              {transactionCount} transactions traitées
            </div>
          </div>
        </div>
      </header>

      {/* 9 Ontological Tests with Tooltips */}
      <Card className="mb-6 bg-slate-800/50 border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            9 Tests Ontologiques | Précision moyenne: {avgOntologicalPrecision}% {transactionCount > 0 ? "✅" : "⏳"}
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-gray-400 hover:text-white cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-slate-800 text-white border border-purple-500/50 p-3">
                <p>Chaque test mesure un aspect différent de la sécurité bancaire. Survolez chaque barre pour voir sa définition.</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(ontologicalScores).map(([key, value]) => {
              const def = ONTOLOGICAL_DEFINITIONS[key];
              if (!def) return null;
              const displayValue = transactionCount > 0 ? (value * 100).toFixed(1) : "—";
              const progressValue = transactionCount > 0 ? value * 100 : 0;
              
              return (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <div className="space-y-2 cursor-help hover:bg-slate-700/30 p-2 rounded-lg transition-colors">
                      <div className="flex justify-between text-sm">
                        <span className={`font-semibold ${def.color}`}>
                          {def.abbrev} — {def.label}
                        </span>
                        <span className="text-green-400 font-bold">{displayValue}%</span>
                      </div>
                      <Progress value={progressValue} className="h-2" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm bg-slate-800 text-white border border-purple-500/50 p-3">
                    <p className="font-semibold text-yellow-400 mb-1">{def.abbrev} — {def.label}</p>
                    <p className="text-sm text-gray-200">{def.definition}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card className="mb-6 bg-slate-800/50 border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-white">Contrôles de Simulation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={startSimulation}
              disabled={isRunning}
              variant="default"
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="mr-2 h-4 w-4" />
              Démarrer
            </Button>
            <Button
              onClick={pauseSimulation}
              disabled={!isRunning}
              variant="default"
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </Button>
            <Button onClick={stopSimulation} disabled={!isRunning && !isPaused} variant="destructive">
              <Square className="mr-2 h-4 w-4" />
              Arrêter
            </Button>

            <div className="border-l border-gray-600 mx-2" />

            <Button onClick={() => setSpeed(2000)} variant={speed === 2000 ? "default" : "outline"}>
              Lent
            </Button>
            <Button onClick={() => setSpeed(1000)} variant={speed === 1000 ? "default" : "outline"}>
              Normal
            </Button>
            <Button onClick={() => setSpeed(500)} variant={speed === 500 ? "default" : "outline"}>
              Rapide
            </Button>
            <Button onClick={() => setSpeed(100)} variant={speed === 100 ? "default" : "outline"}>
              <Zap className="mr-2 h-4 w-4" />
              Ultra
            </Button>

            <div className="border-l border-gray-600 mx-2" />

            <Button onClick={exportCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Decision */}
      {currentTransaction && (
        <Card className="mb-6 bg-slate-800/50 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Décision Actuelle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Badge
                  variant={
                    currentTransaction.decision === "AUTORISER"
                      ? "default"
                      : currentTransaction.decision === "ANALYSER"
                        ? "secondary"
                        : "destructive"
                  }
                  className="text-lg px-4 py-2"
                >
                  {currentTransaction.decision}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-400">Scénario</p>
                <p className="text-lg font-semibold">{currentTransaction.scenario.name}</p>
                <p className="text-sm text-gray-300">{currentTransaction.scenario.description}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Raison</p>
                <p className="text-sm text-gray-200">{currentTransaction.reason}</p>
              </div>
              {currentTransaction.geminiAnalysis && (
                <div>
                  <p className="text-sm text-gray-400">Analyse Gemini AI</p>
                  <p className={`text-sm italic p-3 rounded-lg border ${
                    currentTransaction.geminiAnalysis.includes("indisponible") || 
                    currentTransaction.geminiAnalysis.includes("manquante") ||
                    currentTransaction.geminiAnalysis.includes("non disponible")
                      ? "text-gray-400 bg-slate-900/30 border-slate-700"
                      : "text-gray-200 bg-indigo-900/30 border-indigo-500/30"
                  }`}>
                    {currentTransaction.geminiAnalysis}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(currentTransaction.metrics).map(([key, value]) => {
                  const def = MAIN_METRIC_DEFINITIONS[key];
                  if (!def) return null;
                  const colorClass = key === "ir" ? "text-red-400" : key === "ciz" ? "text-yellow-400" : key === "dts" ? "text-blue-400" : "text-green-400";
                  return (
                    <Tooltip key={key}>
                      <TooltipTrigger asChild>
                        <div className="cursor-help hover:bg-slate-700/30 p-2 rounded-lg transition-colors">
                          <p className="text-xs text-gray-400">{def.label}</p>
                          <p className={`text-2xl font-bold ${colorClass}`}>{value.toFixed(2)}</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs bg-slate-800 text-white border border-purple-500/50 p-3">
                        <p className="font-semibold text-yellow-400 mb-1">{def.label}</p>
                        <p className="text-sm text-gray-200">{def.definition}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Decision Statistics */}
      <Card className="bg-slate-800/50 border-purple-500/30 mb-6">
        <CardHeader>
          <CardTitle className="text-white">Statistiques Décisionnelles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-900/30 p-4 rounded-lg border border-green-500/50">
              <div className="text-green-400 text-sm font-semibold mb-1">AUTORISER</div>
              <div className="text-white text-3xl font-bold">{decisionCounts.AUTORISER}</div>
              <div className="text-green-300 text-sm mt-1">
                {transactionCount > 0 ? ((decisionCounts.AUTORISER / transactionCount) * 100).toFixed(1) : 0}%
              </div>
            </div>
            <div className="bg-yellow-900/30 p-4 rounded-lg border border-yellow-500/50">
              <div className="text-yellow-400 text-sm font-semibold mb-1">ANALYSER</div>
              <div className="text-white text-3xl font-bold">{decisionCounts.ANALYSER}</div>
              <div className="text-yellow-300 text-sm mt-1">
                {transactionCount > 0 ? ((decisionCounts.ANALYSER / transactionCount) * 100).toFixed(1) : 0}%
              </div>
            </div>
            <div className="bg-red-900/30 p-4 rounded-lg border border-red-500/50">
              <div className="text-red-400 text-sm font-semibold mb-1">BLOQUER</div>
              <div className="text-white text-3xl font-bold">{decisionCounts.BLOQUER}</div>
              <div className="text-red-300 text-sm mt-1">
                {transactionCount > 0 ? ((decisionCounts.BLOQUER / transactionCount) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="bg-slate-800/50 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white">Distribution des Décisions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Doughnut data={doughnutData} options={{ maintainAspectRatio: false }} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              Évolution des Métriques
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-gray-400 hover:text-white cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-slate-800 text-white border border-purple-500/50 p-3">
                  <p>Graphique en temps réel des 4 métriques principales (IR, CIZ, DTS, TSG) pour chaque transaction.</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Line
                data={lineData}
                options={{
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 1,
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gemini Performance Insights */}
      {transactionCount >= 10 && performanceInsights && performanceInsights.summary && !performanceInsights.summary.startsWith("En attente") && (
        <Card className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border-indigo-500/50 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Performance Insights (Gemini AI)
            </CardTitle>
            <CardDescription className="text-gray-300">
              Résumé automatique basé sur les {transactionCount} transactions de cette session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-900/50 p-4 rounded-lg border border-indigo-500/30">
              <h3 className="text-indigo-400 font-semibold mb-2">Résumé</h3>
              <p className="text-gray-200">{performanceInsights.summary}</p>
            </div>
            
            {performanceInsights.trends.length > 0 && (
              <div className="bg-slate-900/50 p-4 rounded-lg border border-indigo-500/30">
                <h3 className="text-indigo-400 font-semibold mb-2">Tendances Détectées</h3>
                <ul className="space-y-1 text-gray-200">
                  {performanceInsights.trends.map((trend: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-1">•</span>
                      <span>{trend}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {performanceInsights.recommendations.length > 0 && (
              <div className="bg-slate-900/50 p-4 rounded-lg border border-indigo-500/30">
                <h3 className="text-indigo-400 font-semibold mb-2">Recommandations</h3>
                <ul className="space-y-1 text-gray-200">
                  {performanceInsights.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-green-900/30 p-3 rounded-lg border border-green-500/50 cursor-help">
                    <div className="text-green-400 text-xs font-semibold mb-1">Précision</div>
                    <div className="text-white text-2xl font-bold">{sessionAccuracy.toFixed(1)}%</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-800 text-white border border-green-500/50 p-2 max-w-xs">
                  <p className="text-xs">% de transactions avec un score ontologique moyen ≥ 94% (seuil de fiabilité). Calculé sur les {transactionCount} transactions de cette session.</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-blue-900/30 p-3 rounded-lg border border-blue-500/50 cursor-help">
                    <div className="text-blue-400 text-xs font-semibold mb-1">Temps Moyen</div>
                    <div className="text-white text-2xl font-bold">{Math.round(avgResponseTime)}ms</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-800 text-white border border-blue-500/50 p-2 max-w-xs">
                  <p className="text-xs">Temps de réponse réel moyen du backend (mesuré sur {responseTimes.length} appels). Inclut le traitement + analyse Gemini.</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-purple-900/30 p-3 rounded-lg border border-purple-500/50 cursor-help">
                    <div className="text-purple-400 text-xs font-semibold mb-1">Utilisation Gemini</div>
                    <div className="text-white text-2xl font-bold">{sessionGeminiUsage.toFixed(1)}%</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-800 text-white border border-purple-500/50 p-2 max-w-xs">
                  <p className="text-xs">% de transactions où l'analyse Gemini AI a répondu avec succès (hors erreurs/rate-limit).</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-yellow-900/30 p-3 rounded-lg border border-yellow-500/50 cursor-help">
                    <div className="text-yellow-400 text-xs font-semibold mb-1">Confiance</div>
                    <div className="text-white text-2xl font-bold">{sessionConfidence.toFixed(1)}%</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-800 text-white border border-yellow-500/50 p-2 max-w-xs">
                  <p className="text-xs">Score de confiance moyen des 9 tests ontologiques sur cette session. Plus c'est élevé, plus le robot est fiable.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gemini Continuous Trends */}
      {transactionCount >= 5 && continuousTrends && continuousTrends.length > 0 && continuousTrends[0] !== "Pas assez de données pour détecter des tendances" && (
        <Card className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 border-cyan-500/50 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Analyse Continue (Gemini AI)
            </CardTitle>
            <CardDescription className="text-gray-300">
              Insights en temps réel sur les {Math.min(10, transactionCount)} dernières transactions de cette session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {continuousTrends.map((trend: string, i: number) => (
                <div key={i} className="bg-slate-900/50 p-3 rounded-lg border border-cyan-500/30 flex items-start gap-3">
                  <span className="text-cyan-400 font-bold text-lg">{i + 1}</span>
                  <span className="text-gray-200">{trend}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gemini Detailed Report */}
      <Card className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 border-emerald-500/50 mb-6">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-400" />
            Rapport Détaillé (Gemini AI)
          </CardTitle>
          <CardDescription className="text-gray-300">
            Générez un rapport basé sur les {transactionCount} transactions de cette session
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleGenerateReport}
            disabled={isGeneratingReport || transactionCount === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isGeneratingReport ? "Génération en cours..." : "Générer Rapport Gemini"}
          </Button>
          
          {detailedReport && (
            <div className="bg-slate-900/50 p-4 rounded-lg border border-emerald-500/30 space-y-4">
              <h3 className="text-emerald-400 font-semibold mb-3">Rapport de Performance</h3>
              {detailedReport.split(/\n\n+/).map((section, i) => {
                // Detect section headers (all caps lines)
                const lines = section.trim().split('\n');
                const firstLine = lines[0]?.trim() || '';
                const isHeader = firstLine === firstLine.toUpperCase() && firstLine.length > 3 && !firstLine.startsWith('-') && !firstLine.startsWith('•');
                
                if (isHeader) {
                  return (
                    <div key={i}>
                      <h4 className="text-yellow-400 font-bold text-sm uppercase tracking-wider mb-2 border-b border-yellow-500/30 pb-1">
                        {firstLine}
                      </h4>
                      <p className="text-gray-200 text-sm leading-relaxed">
                        {lines.slice(1).join(' ').trim()}
                      </p>
                    </div>
                  );
                }
                return (
                  <p key={i} className="text-gray-200 text-sm leading-relaxed">
                    {section.trim()}
                  </p>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card className="bg-slate-800/50 border-purple-500/30 mb-6">
        <CardHeader>
          <CardTitle className="text-white">Journal des Événements</CardTitle>
          <CardDescription className="text-gray-400">Dernières {Math.min(transactionHistory.length, 10)} transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {transactionHistory.length === 0 ? (
            <div className="text-gray-400 text-center py-8">Aucune transaction pour le moment. Lancez la simulation !</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {transactionHistory.slice(-10).reverse().map((tx, index) => (
                <div
                  key={transactionHistory.length - index}
                  className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 hover:border-purple-500/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          tx.decision === "AUTORISER"
                            ? "bg-green-900/30 text-green-400 border-green-500/50"
                            : tx.decision === "ANALYSER"
                            ? "bg-yellow-900/30 text-yellow-400 border-yellow-500/50"
                            : "bg-red-900/30 text-red-400 border-red-500/50"
                        }
                      >
                        {tx.decision}
                      </Badge>
                      <span className="text-white font-semibold text-sm">{tx.scenario.name}</span>
                    </div>
                    <span className="text-gray-400 text-xs">
                      #{transactionHistory.length - index} • ROI: +{tx.roiContribution.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                  <div className="text-gray-300 text-xs">{tx.reason}</div>
                  <div className="flex gap-4 mt-2 text-xs">
                    <Tooltip>
                      <TooltipTrigger><span className="text-red-400 cursor-help">IR: {tx.metrics.ir.toFixed(2)}</span></TooltipTrigger>
                      <TooltipContent className="bg-slate-800 text-white border border-purple-500/50 p-2">
                        <p className="text-xs">{MAIN_METRIC_DEFINITIONS.ir.definition}</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger><span className="text-yellow-400 cursor-help">CIZ: {tx.metrics.ciz.toFixed(2)}</span></TooltipTrigger>
                      <TooltipContent className="bg-slate-800 text-white border border-purple-500/50 p-2">
                        <p className="text-xs">{MAIN_METRIC_DEFINITIONS.ciz.definition}</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger><span className="text-blue-400 cursor-help">DTS: {tx.metrics.dts.toFixed(2)}</span></TooltipTrigger>
                      <TooltipContent className="bg-slate-800 text-white border border-purple-500/50 p-2">
                        <p className="text-xs">{MAIN_METRIC_DEFINITIONS.dts.definition}</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger><span className="text-green-400 cursor-help">TSG: {tx.metrics.tsg.toFixed(2)}</span></TooltipTrigger>
                      <TooltipContent className="bg-slate-800 text-white border border-purple-500/50 p-2">
                        <p className="text-xs">{MAIN_METRIC_DEFINITIONS.tsg.definition}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Jury Explanation */}
      <Card className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-purple-500/50">
        <CardHeader>
          <CardTitle className="text-white text-2xl">Autonomous Banking Decision Robot</CardTitle>
          <CardDescription className="text-gray-300 text-lg">
            Future of Work | Track 3: Robotic Interaction and Task Execution
          </CardDescription>
        </CardHeader>
        <CardContent className="text-gray-200 space-y-4">
          <p>
            Ce système est un <strong>robot décisionnel autonome</strong> qui opère dans un environnement simulé de
            transactions bancaires. Il démontre comment l'IA peut remplacer ou assister les analystes humains dans la
            détection de fraude et la validation de transactions.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 p-4 rounded-lg">
              <h3 className="font-bold text-yellow-400 mb-2">Ce qu'il VOIT</h3>
              <p className="text-sm">
                Capteurs de métriques (IR, CIZ, DTS, TSG), patterns de transactions, données de compte
              </p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-lg">
              <h3 className="font-bold text-blue-400 mb-2">Ce qu'il PENSE</h3>
              <p className="text-sm">
                Analyse Gemini AI, 9 tests ontologiques, calcul de risque, raisonnement transparent
              </p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-lg">
              <h3 className="font-bold text-green-400 mb-2">Ce qu'il CHOISIT</h3>
              <p className="text-sm">
                AUTORISER, ANALYSER ou BLOQUER avec justification complète et score de confiance
              </p>
            </div>
          </div>

          {/* Metric Legend */}
          <div className="bg-slate-800/50 p-4 rounded-lg border border-purple-500/30">
            <h3 className="font-bold text-purple-400 mb-3">Légende des Métriques</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div><span className="text-red-400 font-bold">IR</span> — Irréversibilité : risque lié à la difficulté d'annuler la transaction</div>
              <div><span className="text-yellow-400 font-bold">CIZ</span> — Conflit Interne : écart entre comportement habituel et actuel</div>
              <div><span className="text-blue-400 font-bold">DTS</span> — Sensibilité Temporelle : urgence de la décision selon le profil</div>
              <div><span className="text-green-400 font-bold">TSG</span> — Garde Totale : score de protection globale du système</div>
              <div><span className="text-purple-400 font-bold">TIL</span> — Time Is Law : respect des contraintes temporelles</div>
              <div><span className="text-red-400 font-bold">AHG</span> — Absolute Hold Gate : barrière de sécurité absolue</div>
              <div><span className="text-orange-400 font-bold">ZTF</span> — Zero Tolerance Flag : détection de fraude connue</div>
              <div><span className="text-pink-400 font-bold">NMR</span> — Negative Memory : historique d'incidents passés</div>
              <div><span className="text-cyan-400 font-bold">EBW</span> — Emergent Behavior : surveillance de comportements nouveaux</div>
            </div>
          </div>

          <p className="text-sm text-gray-400 italic">
            Valeur Business: Temps de réponse réel de {Math.round(avgResponseTime)}ms, précision de {sessionAccuracy.toFixed(1)}%, ROI mesurable en temps réel
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
