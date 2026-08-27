import { apiRequest } from "./client";

export interface SystemConfig {
  name: string;
  email: string;
  aiPersonality: string;
  listeningMode: string;
  proactiveModeEnabled: boolean;
  maxProactiveNudges: number;
  dailyReviewTime: string;
  activationWord: string;
  taskReminders: boolean;
  habitNudges: boolean;
  goalMilestones: boolean;
  missedAlerts: boolean;
  biometrics: boolean;
  faceUnlock: boolean;
  darkMode: boolean;
  highContrast: boolean;
  learnedPatterns: string[];
}

export const systemConfigApi = {
  async get(): Promise<SystemConfig> {
    return apiRequest<SystemConfig>("/system-config");
  },

  async update(partial: Partial<SystemConfig>): Promise<SystemConfig> {
    return apiRequest<SystemConfig>("/system-config", {
      method: "PATCH",
      body: JSON.stringify(partial),
    });
  },
};

