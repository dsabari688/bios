import { systemConfigRepository } from "./system-config.repository.js";
import { DEFAULT_SYSTEM_CONFIG } from "./system-config.types.js";
import type { SystemConfigData } from "./system-config.types.js";

export const systemConfigService = {
  async getConfig(): Promise<SystemConfigData> {
    const stored = await systemConfigRepository.getConfig();
    if (!stored) return { ...DEFAULT_SYSTEM_CONFIG };
    return { ...DEFAULT_SYSTEM_CONFIG, ...stored };
  },

  async updateConfig(
    partial: Partial<SystemConfigData>,
  ): Promise<SystemConfigData> {
    const current = await systemConfigRepository.getConfig();
    const merged = {
      ...DEFAULT_SYSTEM_CONFIG,
      ...(current ?? {}),
      ...partial,
    };
    await systemConfigRepository.upsertConfig(merged);
    return merged;
  },
};
