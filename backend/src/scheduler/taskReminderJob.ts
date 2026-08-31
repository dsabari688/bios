import { pool } from "../db/postgres.js";
import { notificationRepository } from "../modules/notifications/notification.repository.js";

export async function runTaskReminderCheck(now: Date = new Date()): Promise<{ created: number; checked: number }> {
  const todayStr = now.toISOString().split("T")[0];
  const lastRunKey = `task-reminder:${todayStr}:${now.getHours()}`;

  // Prevent spamming reminders more than once per hour
  const alreadyRan = await notificationRepository.findByDedupeKey(`${lastRunKey}:batch`);
  if (alreadyRan) {
    return { created: 0, checked: 0 };
  }

  let created = 0;

  // 1. Pending Task Reminders for Today
  try {
    const tasksRes = await pool.query(
      `SELECT id, title, status, date FROM "task" WHERE status = 'pending' AND date >= NOW() - INTERVAL '1 day' AND date <= NOW() + INTERVAL '1 day'`
    );

    for (const task of tasksRes.rows) {
      const dedupeKey = `task-remind:${todayStr}:${task.id}`;
      const existing = await notificationRepository.findByDedupeKey(dedupeKey);
      if (!existing) {
        await notificationRepository.create({
          type: "task_reminder",
          title: "Mission Reminder ⚡",
          message: `Pending task "${task.title}" is scheduled for today! Stay focused.`,
          dedupeKey,
        });
        created++;
      }
    }
  } catch (err: any) {
    console.error("[scheduler] task reminder check failed:", err.message);
  }

  // 2. Goal Milestone Reminders
  try {
    const goalsRes = await pool.query(
      `SELECT id, title, progress, status, "targetDate" FROM "goal" WHERE status = 'active'`
    );

    for (const goal of goalsRes.rows) {
      const dedupeKey = `goal-remind:${todayStr}:${goal.id}`;
      const existing = await notificationRepository.findByDedupeKey(dedupeKey);
      if (!existing) {
        await notificationRepository.create({
          type: "goal_milestone",
          title: "Strategic Goal Target 🎯",
          message: `Goal "${goal.title}" is at ${goal.progress}% progress. Keep advancing towards your milestone!`,
          dedupeKey,
        });
        created++;
      }
    }
  } catch (err: any) {
    console.error("[scheduler] goal reminder check failed:", err.message);
  }

  // 3. Budget Allowance & Spending Threshold Reminders
  try {
    const budgetRes = await pool.query(`SELECT category, "limitAmount" FROM "budget_allowance"`);
    for (const budget of budgetRes.rows) {
      const expRes = await pool.query(
        `SELECT SUM(amount)::numeric as total FROM "expense" WHERE category = $1`,
        [budget.category]
      );
      const totalSpent = Number(expRes.rows[0]?.total || 0);
      const limit = Number(budget.limitAmount || 0);

      if (limit > 0 && totalSpent >= limit * 0.85) {
        const dedupeKey = `budget-warn:${todayStr}:${budget.category}`;
        const existing = await notificationRepository.findByDedupeKey(dedupeKey);
        if (!existing) {
          await notificationRepository.create({
            type: "budget_alert",
            title: "Budget Threshold Warning ⚠️",
            message: `Spending for category "${budget.category}" (Rs. ${totalSpent}) has reached ${Math.round((totalSpent / limit) * 100)}% of your limit (Rs. ${limit}).`,
            dedupeKey,
          });
          created++;
        }
      }
    }
  } catch (err: any) {
    console.error("[scheduler] budget alert check failed:", err.message);
  }

  await notificationRepository.create({
    type: "system",
    title: "System Telemetry Scheduler",
    message: `All-module reminder cycle executed (${created} notifications sent).`,
    dedupeKey: `${lastRunKey}:batch`,
  });

  console.log(`[scheduler] all-module reminders: created=${created}`);
  return { created, checked: created };
}
