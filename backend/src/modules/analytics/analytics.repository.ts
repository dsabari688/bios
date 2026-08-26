import { pool } from "../../db/postgres.js";

export const analyticsRepository = {
  async findAllHabits() {
    const result = await pool.query(`
      SELECT *
      FROM "habit"
      ORDER BY "createdAt" DESC
    `);

    return result.rows;
  },

  async findTasksInPeriod(
    periodStart: Date,
    periodEnd: Date,
  ) {
    const result = await pool.query(
      `
      SELECT
        "id",
        "title",
        "date",
        "endTime",
        "status",
        "category",
        "rescheduledCount",
        "createdAt",
        "updatedAt"
      FROM "task"
      WHERE "date" >= $1
        AND "date" < $2
      ORDER BY "date" ASC
      `,
      [periodStart, periodEnd],
    );

    return result.rows;
  },

  async findFocusLogsInPeriod(
    startDateStr: string,
    endDateStr: string,
  ) {
    const result = await pool.query(
      `
      SELECT
        "id",
        "date",
        "minutes",
        "score",
        "hour_of_day"
      FROM piggy_focus_log
      WHERE "date" >= $1
        AND "date" <= $2
      ORDER BY "date" ASC
      `,
      [startDateStr, endDateStr],
    );

    return result.rows;
  },
};
