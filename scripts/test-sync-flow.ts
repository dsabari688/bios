import fetch from "node-fetch";

async function testBackend(baseUrl: string, name: string) {
  console.log(`\n=================================================`);
  console.log(` Testing Backend: ${name} (${baseUrl})`);
  console.log(`=================================================`);

  try {
    // 1. Health check
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData: any = await healthRes.json();
    console.log(`[HEALTH] Status ${healthRes.status}:`, healthData?.message || healthData);

    // 2. Push test task
    const taskId = `test-task-${Date.now()}`;
    const pushPayload = {
      deviceId: "test-device-script",
      operations: [
        {
          id: `op-${Date.now()}`,
          entity: "task",
          entityId: taskId,
          operation: "create",
          payload: {
            id: taskId,
            title: `Sync Verification Task ${Date.now()}`,
            description: "Pushed via automated test script",
            date: new Date().toISOString().split("T")[0],
            time: "10:30",
            category: "urgent-important",
            status: "pending"
          },
          clientUpdatedAt: new Date().toISOString(),
          version: 1
        }
      ]
    };

    console.log(`\n[PUSH] Sending 1 task push to ${baseUrl}/sync/push...`);
    const pushRes = await fetch(`${baseUrl}/sync/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pushPayload)
    });
    const pushData: any = await pushRes.json();
    console.log(`[PUSH] Response Status ${pushRes.status}:`, JSON.stringify(pushData));

    // 3. Pull tasks
    console.log(`\n[PULL] Requesting pull from ${baseUrl}/sync/pull...`);
    const pullRes = await fetch(`${baseUrl}/sync/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: "test-device-script-2", lastSyncCursor: undefined })
    });
    const pullData: any = await pullRes.json();
    console.log(`[PULL] Response Status ${pullRes.status}. Total Changes: ${pullData?.changes?.length ?? 0}`);
    const foundPushedTask = pullData?.changes?.find((c: any) => c.entityId === taskId);
    if (foundPushedTask) {
      console.log(`✅ [PULL SUCCESS] Pushed task ${taskId} successfully returned in pull!`);
    } else {
      console.error(`❌ [PULL FAILURE] Pushed task ${taskId} WAS NOT FOUND in pull response!`);
    }

    // 4. GET /api/tasks
    console.log(`\n[GET /api/tasks] Querying task list...`);
    const getRes = await fetch(`${baseUrl}/tasks`);
    const getTasks: any = await getRes.json();
    const tasksArray = Array.isArray(getTasks) ? getTasks : getTasks?.data;
    console.log(`[GET /api/tasks] Returned ${tasksArray?.length ?? 0} tasks.`);
    const foundInGet = Array.isArray(tasksArray) && tasksArray.some((t: any) => t.id === taskId);
    if (foundInGet) {
      console.log(`✅ [GET SUCCESS] Pushed task ${taskId} present in GET /api/tasks!`);
    } else {
      console.error(`❌ [GET FAILURE] Pushed task ${taskId} missing from GET /api/tasks!`);
    }

  } catch (err: any) {
    console.error(`❌ Exception testing ${name}:`, err.message);
  }
}

async function run() {
  await testBackend("http://localhost:5000/api", "Local PC Backend");
  await testBackend("https://bios-backend-93q3.onrender.com/api", "Render Live Cloud Backend");
}

run();
