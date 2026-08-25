// Client-side Mock API Interceptor for Life OS
// Seamlessly routes /api/* requests to robust, dynamic client-side mock data and MCP AI Tool Bridge
import {
  handleMCPJsonRpcRequest,
  MCP_TOOLS_REGISTRY,
  MCP_RESOURCES,
  MCP_PROMPTS,
  executeMCPTool
} from "./lib/mcpBridge";

interface StoredMemory {
  id: string;
  fact: string;
  category: string;
  timestamp: number;
}

const getStoredData = (): any => {
  try {
    const d = localStorage.getItem("lifeos_data");
    return d ? JSON.parse(d) : null;
  } catch {
    return null;
  }
};

// Internal active memories in session to prevent resetting on component mount
let sessionMemories: StoredMemory[] = [
  { id: "mem_1", fact: "Sustained high cognitive performance logged between 19:00 - 22:00 hours.", category: "preference", timestamp: 1783300000000 },
  { id: "mem_2", fact: "Prioritizes high-variance task categories before midday.", category: "constraint", timestamp: 1783310000000 }
];

async function mockFetchHandler(
  url: RequestInfo | URL,
  options: RequestInit | undefined,
  originalFetch: typeof fetch
): Promise<Response> {
  const urlString = url.toString();

  // Only intercept /api/ requests
  if (urlString.startsWith("/api/")) {
    const path = urlString.split("?")[0];
    const method = options?.method?.toUpperCase() || "GET";
    const storedData = getStoredData();
    const userName = storedData?.profile?.name || "Sabarinathan";

    let responseData: any = null;
    let status = 200;

    // 0. MCP Protocol & AI Tool Bridge Endpoints
    if (path === "/api/mcp" && method === "POST") {
      try {
        const rpcPayload = options?.body ? JSON.parse(options.body.toString()) : {};
        const saveDataFn = (updated: any) => {
          localStorage.setItem("lifeos_data", JSON.stringify(updated));
        };
        responseData = handleMCPJsonRpcRequest(rpcPayload, storedData || {}, saveDataFn);
      } catch (err: any) {
        status = 400;
        responseData = {
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: `Parse error: ${err?.message || "Invalid JSON payload"}` }
        };
      }
    } else if (path === "/api/mcp/manifest" || path === "/api/tools/list") {
      responseData = {
        name: "life-os-mcp-server",
        protocolVersion: "2024-11-05",
        version: "4.3.0",
        description: "Official Life OS MCP Server & AI Tool Bridge connecting all modules.",
        tools: MCP_TOOLS_REGISTRY,
        resources: MCP_RESOURCES,
        prompts: MCP_PROMPTS
      };
    } else if (path === "/api/mcp/config") {
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      responseData = {
        claudeDesktop: {
          mcpServers: {
            "life-os": {
              command: "npx",
              args: ["-y", "mcp-remote-client", `${origin}/api/mcp`]
            }
          }
        },
        cursor: {
          mcpServers: {
            "life-os": {
              url: `${origin}/api/mcp`
            }
          }
        },
        directHttp: {
          endpoint: `${origin}/api/mcp`,
          toolsExecuteEndpoint: `${origin}/api/tools/execute`,
          authHeader: "Authorization: Bearer <token>"
        }
      };
    } else if (path === "/api/tools/execute" && method === "POST") {
      try {
        const body = options?.body ? JSON.parse(options.body.toString()) : {};
        const toolName = body.tool || body.name;
        const toolArgs = body.args || body.arguments || {};
        const saveDataFn = (updated: any) => {
          localStorage.setItem("lifeos_data", JSON.stringify(updated));
        };
        responseData = executeMCPTool(toolName, toolArgs, storedData || {}, saveDataFn);
      } catch (err: any) {
        status = 400;
        responseData = { success: false, error: err?.message || "Tool execution failed" };
      }
    }

    // 1. Jarvis Briefs & Nudges
    else if (path === "/api/jarvis/daily-brief") {
      responseData = {
        insights: [
          `Sir, your current task completion rate is high today at ${
            storedData?.tasks ? Math.round((storedData.tasks.filter((t: any) => t.status === "completed").length / (storedData.tasks.length || 1)) * 100) : 75
          }%.`,
          "Warning: Food category is close to 85% of weekly budget parameter limit.",
          "Your best habit 'Morning Code Run' is on a surging 5-day streak. Keep pushing!"
        ]
      };
    } else if (path === "/api/jarvis/morning-brief") {
      responseData = {
        briefText: `Good morning, ${userName}. Welcome to Node ID: L_OS_01. Your circadian rhythm recovery parameters are stable (7.5h sleep log). Today is rated a High-Performance window. Optimal focus studies are routed between 7:00 PM - 10:00 PM. Strategic Vault milestones are ready for execution.`
      };
    } else if (path === "/api/jarvis/trigger-nudge") {
      responseData = { success: true };
    }

    // 2. Piggy Dashboard
    else if (path === "/api/piggy/dashboard") {
      responseData = {
        success: true,
        cockpit: {
          healthScore: 88,
          consistency: 92,
          momentum: 81,
          goalProgress: 65,
          burnoutRisk: 14,
          energyData: {
            peakWindow: "7:00 PM - 10:00 PM",
            leastProductiveWindow: "1:00 PM - 3:00 PM",
            deepWorkWindow: "8:00 PM - 11:00 PM",
            bestStudyDuration: 90
          }
        },
        habitsData: [
          {
            id: "1",
            name: "Morning Code Run",
            streak: 5,
            risk: {
              riskPercent: 12,
              confidencePercent: 88,
              reasons: [
                "Laser precision execution in early morning slots.",
                "High correlation with optimal sleep duration index."
              ]
            },
            patterns: {
              overallCompletion: 94,
              bestWeekday: "Tuesday",
              worstWeekday: "Saturday",
              morningPercent: 85,
              afternoonPercent: 10,
              nightPercent: 5
            }
          },
          {
            id: "2",
            name: "Gym Cardio Block",
            streak: 3,
            risk: {
              riskPercent: 58,
              confidencePercent: 75,
              reasons: [
                "Highly susceptible to skip patterns on weekends.",
                "Often deferred during high-stress exam prep schedules."
              ]
            },
            patterns: {
              overallCompletion: 68,
              bestWeekday: "Monday",
              worstWeekday: "Sunday",
              morningPercent: 20,
              afternoonPercent: 40,
              nightPercent: 40
            }
          }
        ],
        correlations: [
          { cause: "Early sleeping (>7.5h)", effect: "Gym cardio consistency surfs up", change: 42 },
          { cause: "Late-night snacking", effect: "Focus timer efficiency reductions", change: -18 },
          { cause: "Direct focus routines", effect: "Strategic vault milestones unlocked", change: 31 }
        ],
        achievements: [
          { id: "30_day_reader", unlocked: true, title: "Protocol Sage", desc: "Maintain 30 consecutive days of focus logs." },
          { id: "consistency_master", unlocked: true, title: "Momentum Architect", desc: "Reach a habit consistency index exceeding 90%." },
          { id: "deep_work_50", unlocked: false, title: "Chronos Voyager", desc: "Log 50 cumulative hours of deep focus." },
          { id: "expense_saver", unlocked: true, title: "Vault Guardian", desc: "Stay strictly within all weekly budget allocation limits." }
        ],
        deadlines: [
          { title: "Distributed Systems Exam", dueDate: "2026-07-10", type: "exam", daysLeft: 5 },
          { title: "Cloud Architecture Lab Submission", dueDate: "2026-07-15", type: "assignment", daysLeft: 10 }
        ],
        aiMemory: sessionMemories
      };
    }

    // 3. Piggy Coaching
    else if (path === "/api/piggy/coaching") {
      responseData = {
        success: true,
        weeklyCoach: {
          completionRate: 88,
          bestHabit: "Morning Code Run",
          weakestHabit: "Gym Cardio Block",
          mostImproved: "Strategic Planning",
          wins: "Superb progression on 'Morning Code Run'! 5 consecutive days logged with high compliance.",
          watchOut: "Watch out for late-evening task deferrals. Exhaustion index patterns show rising risk.",
          recommendedFocus: "Optimize focus intervals for Cloud Architecture Lab. Aim for 45-minute sprint blocks."
        },
        monthlyTrends: [
          { month: "March", completion: 72 },
          { month: "April", completion: 78 },
          { month: "May", completion: 81 },
          { month: "June", completion: 85 },
          { month: "Current (July)", completion: 88 }
        ]
      };
    }

    // 4. Piggy Reflections
    else if (path === "/api/piggy/reflections") {
      responseData = {
        success: true,
        reflections: [
          {
            date: "2026-07-04",
            timestamp: 1783300000000,
            completedHabitsCount: 5,
            totalHabitsCount: 6,
            mood: "focused",
            focusMinutes: 120,
            reflectionText: "Highly structured cognitive day. Executed code run and strategic planning modules flawlessly. Budget metrics within optimal control boundaries."
          },
          {
            date: "2026-07-03",
            timestamp: 1783210000000,
            completedHabitsCount: 3,
            totalHabitsCount: 6,
            mood: "calm",
            focusMinutes: 90,
            reflectionText: "Decent progress on primary goals, but skipped cardio session due to weather constraint variables. Corrective focus adjusted for tomorrow."
          }
        ]
      };
    }

    // 5. Generate Reflection
    else if (path === "/api/piggy/reflection/generate") {
      responseData = {
        success: true,
        reflection: {
          date: new Date().toISOString().split("T")[0],
          timestamp: Date.now(),
          completedHabitsCount: 4,
          totalHabitsCount: 5,
          mood: "energetic",
          focusMinutes: 150,
          reflectionText: "Outstanding execution capacity today, Sir. System telemetry registers high consistency with optimal metabolic recovery cycles."
        }
      };
    }

    // 6. Memory Interactions
    else if (path === "/api/piggy/memory") {
      if (method === "POST" && options?.body) {
        try {
          const body = JSON.parse(options.body.toString());
          const newMem: StoredMemory = {
            id: `mem_${Date.now()}`,
            fact: body.fact,
            category: body.category || "preference",
            timestamp: Date.now()
          };
          sessionMemories = [...sessionMemories, newMem];
          responseData = { success: true, fact: newMem };
        } catch {
          status = 400;
          responseData = { error: "Invalid JSON body" };
        }
      } else {
        responseData = { success: true, aiMemory: sessionMemories };
      }
    } else if (path.startsWith("/api/piggy/memory/") && method === "DELETE") {
      const id = path.split("/").pop();
      sessionMemories = sessionMemories.filter(m => m.id !== id);
      responseData = { success: true };
    }

    // 7. Receipts scanning
    else if (path === "/api/expenses/scan-receipt") {
      responseData = {
        amount: 250,
        category: "shopping",
        note: "Reference books & materials",
        date: new Date().toISOString().split("T")[0]
      };
    }

    // 8. Focus Score saving
    else if (path === "/api/focus-score") {
      responseData = { score: 92 };
    }

    // 9. Goals Predictive outcome
    else if (path === "/api/predictive-outcomes") {
      responseData = {
        success: true,
        probabilityPercent: 85,
        timelineForecast: "Progress is expected to complete within parameters.",
        proactiveAdvice: "Maintain daily conformance to key task variables."
      };
    }

    // 10. Mood saving
    else if (path === "/api/mood") {
      responseData = { success: true };
    }

    // 11. Data Exports & Imports
    else if (path === "/api/data") {
      responseData = storedData || { success: true };
    } else if (path === "/api/data/import") {
      if (options?.body) {
        try {
          const body = JSON.parse(options.body.toString());
          localStorage.setItem("lifeos_data", JSON.stringify(body));
          responseData = { success: true };
        } catch {
          status = 400;
          responseData = { error: "Invalid backup package payload" };
        }
      } else {
        status = 400;
        responseData = { error: "No package body supplied" };
      }
    }

    // 12. Sleep Log Interactions
    else if (path === "/api/sleep/today") {
      responseData = {
        sleepTime: "23:30",
        wakeTime: "07:00",
        duration: 7.5,
        date: new Date().toISOString().split("T")[0]
      };
    } else if (path === "/api/sleep") {
      responseData = { success: true };
    }

    // 13. Weekly review statistics
    else if (path === "/api/analytics/weekly-review") {
      responseData = {
        tasksCompleted: 18,
        tasksSkipped: 2,
        habitConsistency: 92,
        bestHabit: "Morning Code Run",
        moneySpent: 2450.00,
        budgetStatus: "Within weekly parameters",
        goalProgress: [
          { title: "Launch Life OS V4", progress: 85 },
          { title: "Aces Distributed Systems Exam", progress: 60 }
        ],
        piggyInsight: "An outstanding week of conformance, Sir. Keep parameters dialed in!"
      };
    }

    // Fallback for any unmatched /api/*
    else {
      responseData = { success: true };
    }

    // Return custom Mock API Response
    return new Response(JSON.stringify(responseData), {
      status,
      headers: { "Content-Type": "application/json" }
    });
  }

  return originalFetch(url, options);
}

export function initMockApi() {
  if (typeof window === "undefined") return;

  const originalFetch = window.fetch;

  try {
    Object.defineProperty(window, "fetch", {
      value: function (url: RequestInfo | URL, options?: RequestInit): Promise<Response> {
        return mockFetchHandler(url, options, originalFetch);
      },
      writable: true,
      configurable: true,
      enumerable: true
    });
  } catch (e) {
    // Safe fallback to direct assignment if defineProperty fails due to environment restrictions
    try {
      (window as any).fetch = function (url: RequestInfo | URL, options?: RequestInit): Promise<Response> {
        return mockFetchHandler(url, options, originalFetch);
      };
    } catch (err) {
      console.error("Critical: Failed to intercept fetch", err);
    }
  }
}
