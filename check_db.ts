
import { db } from "./lib/db";
import { quizzes } from "./lib/db/schema";
import { eq } from "drizzle-orm";

async function checkQuizzes() {
  const allQuizzes = await db.select().from(quizzes);
  console.log("Total quizzes in DB:", allQuizzes.length);
  console.log("Quizzes details:", JSON.stringify(allQuizzes, null, 2));
  process.exit(0);
}

checkQuizzes().catch(console.error);
