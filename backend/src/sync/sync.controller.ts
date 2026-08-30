import type { Request, Response, NextFunction } from "express";
import { syncService } from "./sync.service.js";

export const syncController = {
  async push(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body;
      const deviceId = body?.deviceId || "UNKNOWN";
      const opCount = body?.operations?.length || 0;
      const entities = (body?.operations || []).map((o: any) => `${o.entity}:${o.operation}:${o.payload?.title || o.entityId}`);
      console.log(`[SYNC-PUSH] Device: ${deviceId} | Ops: ${opCount} | Entities: ${JSON.stringify(entities)}`);
      const result = await syncService.processPush(body);
      console.log(`[SYNC-PUSH] Result: ${JSON.stringify(result.results?.map((r: any) => ({ entity: r.entity, status: r.status, id: r.entityId })))}`);
      res.json(result);
    } catch (error) {
      console.error("[SYNC-PUSH] ERROR:", error);
      next(error);
    }
  },

  async pull(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body;
      const deviceId = body?.deviceId || "UNKNOWN";
      const cursor = body?.lastSyncCursor || "NONE";
      const result = await syncService.processPull(body);
      if (result.changes && result.changes.length > 0) {
        const taskChanges = result.changes.filter((c: any) => c.entity === "task");
        console.log(`[SYNC-PULL] Device: ${deviceId} | Cursor: ${cursor} | Total: ${result.changes.length} | Tasks: ${taskChanges.length} (${taskChanges.map((t: any) => t.data?.title).join(", ")})`);
      }
      res.json(result);
    } catch (error) {
      console.error("[SYNC-PULL] ERROR:", error);
      next(error);
    }
  },

  async syncHabits(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await syncService.syncHabits(req.body?.habits);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async status(_req: Request, res: Response, next: NextFunction) {
    try {
      const status = await syncService.getStatus();
      res.json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  },
};
