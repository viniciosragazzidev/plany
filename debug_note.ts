import { db } from "./lib/db";
import { materials } from "./lib/db/schema";
import { eq } from "drizzle-orm";

async function checkNote() {
  const id = "e8922aa9-648e-4094-ab80-83b4a74601f9";
  const note = await db.query.materials.findFirst({
    where: eq(materials.id, id)
  });
  
  console.log("Note ID:", id);
  if (!note) {
    console.log("Note not found");
    return;
  }
  console.log("Title:", note.title);
  console.log("Type:", note.type);
  console.log("Content length:", note.content?.length);
  console.log("Content start:", note.content?.substring(0, 100));
  console.log("Content type:", typeof note.content);
}

checkNote().catch(console.error);
