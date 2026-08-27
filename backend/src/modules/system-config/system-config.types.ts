export interface SystemConfigData {
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

export const DEFAULT_SYSTEM_CONFIG: SystemConfigData = {
  name: "Sabarinathan",
  email: "dsabari688@gmail.com",
  aiPersonality: "Logical",
  listeningMode: "push-to-talk",
  proactiveModeEnabled: true,
  maxProactiveNudges: 3,
  dailyReviewTime: "21:30",
  activationWord: "piggy",
  taskReminders: true,
  habitNudges: true,
  goalMilestones: true,
  missedAlerts: false,
  biometrics: true,
  faceUnlock: false,
  darkMode: false,
  highContrast: false,
  learnedPatterns: [],
};
