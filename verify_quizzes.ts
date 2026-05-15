
import { db } from "./lib/db";
import { quizzes, questions, options } from "./lib/db/schema";
import { eq, desc } from "drizzle-orm";

async function verifyQuizData() {
  console.log("--- VERIFICAÇÃO DE DADOS DE SIMULADO (SQL PURO) ---");
  
  const benchId = "25be655e-e293-4ce8-99a5-c5dce9b767e4";
  console.log(`Buscando simulados para a bancada: ${benchId}`);

  // Using raw SQL to avoid relational query issues for now
  const foundQuizzes = await db.select().from(quizzes).where(eq(quizzes.benchId, benchId)).orderBy(desc(quizzes.createdAt));

  console.log(`Total de simulados encontrados: ${foundQuizzes.length}`);

  if (foundQuizzes.length > 0) {
    for (let i = 0; i < foundQuizzes.length; i++) {
      const quiz = foundQuizzes[i];
      console.log(`\n[${i + 1}] SIMULADO: ${quiz.title}`);
      console.log(`    ID: ${quiz.id}`);
      console.log(`    Status: ${quiz.status}`);
      console.log(`    Data: ${quiz.createdAt}`);
      
      const quizQuestions = await db.select().from(questions).where(eq(questions.quizId, quiz.id));
      console.log(`    Questões: ${quizQuestions.length}`);
      
      if (quizQuestions.length > 0) {
        const q = quizQuestions[0];
        console.log(`    Exemplo de Questão: ${q.content.substring(0, 50)}...`);
        
        const qOptions = await db.select().from(options).where(eq(options.questionId, q.id));
        console.log(`    Opções: ${qOptions.length}`);
      }
    }
  } else {
    console.log("AVISO: Nenhum simulado encontrado no banco para este benchId.");
    
    // Check if there are ANY quizzes at all
    const anyQuizzes = await db.select().from(quizzes).limit(5);
    console.log(`\nExistem ${anyQuizzes.length} simulados totais no banco de dados (independente de benchId).`);
    if (anyQuizzes.length > 0) {
        console.log("Exemplo de benchId no banco:", anyQuizzes[0].benchId);
    }
  }

  process.exit(0);
}

verifyQuizData().catch(console.error);
