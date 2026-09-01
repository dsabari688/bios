import fetch from "node-fetch";

async function runTwoClientsTest() {
  const baseUrl = "http://localhost:5000/api";
  console.log("=================================================");
  console.log(" Testing 2-Client Cross-Device Sync Simulation");
  console.log("=================================================");

  const timestamp = Date.now();
  const phoneTaskId1 = `phone-task-A-${timestamp}`;
  const phoneTaskId2 = `phone-task-B-${timestamp}`;

  // Step 1: Phone creates and pushes 2 tasks to server
  console.log("\n📱 [PHONE] Creating 2 tasks on Phone app...");
  const phonePushPayload = {
    deviceId: "phone-device-emulator-01",
    operations: [
      {
        id: `op-phone-1-${timestamp}`,
        entity: "task",
        entityId: phoneTaskId1,
        operation: "create",
        payload: {
          id: phoneTaskId1,
          title: `Study Android Development (${timestamp})`,
          description: "Created on Mobile Phone",
          date: new Date().toISOString().split("T")[0],
          time: "08:00",
          category: "urgent-important",
          status: "pending"
        },
        clientUpdatedAt: new Date().toISOString(),
        version: 1
      },
      {
        id: `op-phone-2-${timestamp}`,
        entity: "task",
        entityId: phoneTaskId2,
        operation: "create",
        payload: {
          id: phoneTaskId2,
          title: `Buy Groceries for Home (${timestamp})`,
          description: "Created on Mobile Phone",
          date: new Date().toISOString().split("T")[0],
          time: "17:00",
          category: "important-not-urgent",
          status: "pending"
        },
        clientUpdatedAt: new Date().toISOString(),
        version: 1
      }
    ]
  };

  const pushRes = await fetch(`${baseUrl}/sync/push`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(phonePushPayload)
  });
  const pushData: any = await pushRes.json();
  console.log("📱 [PHONE PUSH RESPONSE]:", JSON.stringify(pushData));

  // Step 2: Laptop pulls changes from server
  console.log("\n💻 [LAPTOP] Laptop app pulls changes via /sync/pull...");
  const laptopPullRes = await fetch(`${baseUrl}/sync/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceId: "laptop-device-emulator-02",
      lastSyncCursor: undefined
    })
  });
  const laptopPullData: any = await laptopPullRes.json();
  console.log(`💻 [LAPTOP PULL RESULT]: Received ${laptopPullData?.changes?.length ?? 0} total changes.`);

  const foundTask1 = laptopPullData?.changes?.find((c: any) => c.entityId === phoneTaskId1);
  const foundTask2 = laptopPullData?.changes?.find((c: any) => c.entityId === phoneTaskId2);

  if (foundTask1 && foundTask2) {
    console.log("\n🎉 ✅ [CROSS-DEVICE SYNC VERIFIED SUCCESSFUL!]");
    console.log(`- Task 1: "${foundTask1.data?.title}" successfully pulled on Laptop!`);
    console.log(`- Task 2: "${foundTask2.data?.title}" successfully pulled on Laptop!`);
  } else {
    console.error("\n❌ [CROSS-DEVICE SYNC FAILED!]");
    if (!foundTask1) console.error(`Missing Task 1: ${phoneTaskId1}`);
    if (!foundTask2) console.error(`Missing Task 2: ${phoneTaskId2}`);
  }

  // Step 3: Laptop creates a task and pushes it
  const laptopTaskId = `laptop-task-${timestamp}`;
  console.log("\n💻 [LAPTOP] Laptop creates task 'Code System Architecture'...");
  const laptopPushPayload = {
    deviceId: "laptop-device-emulator-02",
    operations: [
      {
        id: `op-laptop-${timestamp}`,
        entity: "task",
        entityId: laptopTaskId,
        operation: "create",
        payload: {
          id: laptopTaskId,
          title: `Code System Architecture (${timestamp})`,
          description: "Created on Laptop EXE",
          date: new Date().toISOString().split("T")[0],
          time: "14:00",
          category: "urgent-important",
          status: "pending"
        },
        clientUpdatedAt: new Date().toISOString(),
        version: 1
      }
    ]
  };

  await fetch(`${baseUrl}/sync/push`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(laptopPushPayload)
  });

  // Step 4: Phone pulls changes from server
  console.log("📱 [PHONE] Phone pulls changes via /sync/pull...");
  const phonePullRes = await fetch(`${baseUrl}/sync/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceId: "phone-device-emulator-01",
      lastSyncCursor: undefined
    })
  });
  const phonePullData: any = await phonePullRes.json();
  const foundLaptopTask = phonePullData?.changes?.find((c: any) => c.entityId === laptopTaskId);

  if (foundLaptopTask) {
    console.log(`🎉 ✅ [REVERSE SYNC VERIFIED SUCCESSFUL!]`);
    console.log(`- Laptop Task "${foundLaptopTask.data?.title}" successfully pulled on Phone!\n`);
  } else {
    console.error(`❌ [REVERSE SYNC FAILED!] Laptop task missing on Phone!\n`);
  }
}

runTwoClientsTest();
