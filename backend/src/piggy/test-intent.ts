import "dotenv/config";
import { piggyIntelligence } from "./PiggyIntelligence.js";

async function testChat() {
  try {
    const res = await piggyIntelligence.handleChat({
      message: "What do I like to do in the morning?",
    });
    console.log("CHAT RESULT:", res);
  } catch (err) {
    console.error("CHAT EXCEPTION:", err);
  }
}

testChat();
