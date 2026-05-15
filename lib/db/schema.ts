import { pgTable, text, integer, timestamp, boolean, uuid, pgEnum, date, index, vector } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").notNull(),
	image: text("image"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.notNull()
		.references(() => user.id),
});

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at"),
	updatedAt: timestamp("updated_at"),
});

// --- BrainBench AI Tables ---

export const studentLevelEnum = pgEnum("student_level", [
  "concurseiro",
  "universitario",
  "vestibulando",
  "profissional",
]);

export const materialTypeEnum = pgEnum("material_type", ["pdf", "link", "text", "anotacao", "simulado", "flashcard"]);

export const webSourceStatusEnum = pgEnum("web_source_status", ["pending", "converted", "imported", "rejected"]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id),
  name: text("name").notNull(),
  studentLevel: studentLevelEnum("student_level").notNull(),
  mainPainPoint: text("main_pain_point"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const studyBenches = pgTable("study_benches", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id),
  goalName: text("goal_name").notNull(),
  targetDate: date("target_date").notNull(),
  weeklyHours: integer("weekly_hours").notNull(),
  examNotice: text("exam_notice"), // Markdown content
  examNoticeRaw: text("exam_notice_raw"), // Raw PDF text
  examNoticeUrl: text("exam_notice_url"), // URL for the PDF
  examBoard: text("exam_board"), // Banca examinadora
  isActive: boolean("is_active").default(true).notNull(),
  researchStatus: text("research_status").default("idle").notNull(), // idle, researching, completed, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const editalItems = pgTable("edital_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  benchId: uuid("bench_id")
    .notNull()
    .references(() => studyBenches.id),
  category: text("category").notNull(), // e.g., "Direito Administrativo"
  topic: text("topic").notNull(), // e.g., "Atos Administrativos"
  description: text("description"),
  isCovered: boolean("is_covered").default(false).notNull(),
  weight: integer("weight").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subjects = pgTable("subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  benchId: uuid("bench_id")
    .notNull()
    .references(() => studyBenches.id),
  title: text("title").notNull(),
  priority: integer("priority").notNull(), // 1-5
  colorTag: text("color_tag").notNull(), // hex code
  icon: text("icon"), // hugeicons icon name or lucide icon name
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const materials = pgTable("materials", {
  id: uuid("id").primaryKey().defaultRandom(),
  benchId: uuid("bench_id")
    .notNull()
    .references(() => studyBenches.id),
  subjectId: uuid("subject_id")
    .references(() => subjects.id), // Optional, can belong to a bench but not a specific subject
  editalItemId: uuid("edital_item_id")
    .references(() => editalItems.id), // Vínculo opcional com o Assunto (Visão Estruturada)
  title: text("title").notNull(),
  type: materialTypeEnum("type").notNull(),
  storageUrl: text("storage_url"),
  content: text("content"), // Markdown or plain text
  isPinned: boolean("is_pinned").default(false).notNull(),
  contentVectorRef: text("content_vector_ref"), // Placeholder for future vector DB integration
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const webSources = pgTable("web_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  benchId: uuid("bench_id")
    .notNull()
    .references(() => studyBenches.id),
  title: text("title").notNull(),
  sourceUrl: text("source_url").notNull(),
  htmlContent: text("html_content"), // Raw HTML for traceability
  markdownContent: text("markdown_content"), // Clean markdown
  category: text("category").notNull(), // Subject/Matéria
  topic: text("topic").notNull(), // Specific topic
  authorityScore: integer("authority_score").default(50).notNull(), // 1-100
  status: webSourceStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").default("info").notNull(), // info, success, warning, error
  isRead: boolean("is_read").default(false).notNull(),
  link: text("link"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quizStatusEnum = pgEnum("quiz_status", ["generating", "ready", "failed"]);
export const confidenceLevelEnum = pgEnum("confidence_level", ["certo", "duvidoso", "chutando"]);

export const quizzes = pgTable("quizzes", {
  id: uuid("id").primaryKey().defaultRandom(),
  benchId: uuid("bench_id")
    .notNull()
    .references(() => studyBenches.id),
  subjectId: uuid("subject_id")
    .notNull()
    .references(() => subjects.id),
  title: text("title").notNull(),
  status: quizStatusEnum("status").default("generating").notNull(),
  score: integer("score"), // % de acerto final
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  quizId: uuid("quiz_id")
    .notNull()
    .references(() => quizzes.id, { onDelete: "cascade" }),
  editalItemId: uuid("edital_item_id")
    .references(() => editalItems.id), // Referência granular ao tópico
  content: text("content").notNull(), // Pergunta em Markdown
  explanation: text("explanation").notNull(), // Explicação da resposta correta
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const options = pgTable("options", {
  id: uuid("id").primaryKey().defaultRandom(),
  questionId: uuid("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isCorrect: boolean("is_correct").default(false).notNull(),
});

export const quizAttempts = pgTable("quiz_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  quizId: uuid("quiz_id")
    .notNull()
    .references(() => quizzes.id, { onDelete: "cascade" }),
  questionId: uuid("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  selectedOptionId: uuid("selected_option_id")
    .references(() => options.id, { onDelete: "set null" }),
  isCorrect: boolean("is_correct").notNull(),
  confidenceLevel: confidenceLevelEnum("confidence_level"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Flashcards System ---

export const flashcards = pgTable("flashcards", {
  id: uuid("id").primaryKey().defaultRandom(),
  benchId: uuid("bench_id")
    .notNull()
    .references(() => studyBenches.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  front: text("front").notNull(), // Pergunta ou conceito
  back: text("back").notNull(), // Resposta ou explicação
  easeFactor: text("ease_factor").default("2.5").notNull(), // SM-2 Algorithm
  interval: integer("interval").default(0).notNull(), // Em dias
  repetitions: integer("repetitions").default(0).notNull(),
  nextReviewAt: timestamp("next_review_at").defaultNow().notNull(),
  lastReviewedAt: timestamp("last_reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const flashcardAttempts = pgTable("flashcard_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  flashcardId: uuid("flashcard_id")
    .notNull()
    .references(() => flashcards.id, { onDelete: "cascade" }),
  performance: integer("performance").notNull(), // 0-5 (0: Esqueci, 5: Fácil)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const materialChunks = pgTable("material_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  materialId: uuid("material_id")
    .notNull()
    .references(() => materials.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 3072 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    embeddingIndex: index("embeddingIndex").using("hnsw", table.embedding.op("vector_cosine_ops")),
  };
});

export const semanticCache = pgTable("semantic_cache", {
  id: uuid("id").primaryKey().defaultRandom(),
  benchId: uuid("bench_id")
    .notNull()
    .references(() => studyBenches.id, { onDelete: "cascade" }),
  query: text("query").notNull(),
  queryEmbedding: vector("query_embedding", { dimensions: 3072 }),
  response: text("response").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    queryEmbeddingIndex: index("queryEmbeddingIndex").using("hnsw", table.queryEmbedding.op("vector_cosine_ops")),
  };
});

// --- RELATIONS ---

export const studyBenchesRelations = relations(studyBenches, ({ many, one }) => ({
  profile: one(profiles, {
    fields: [studyBenches.profileId],
    references: [profiles.id],
  }),
  subjects: many(subjects),
  materials: many(materials),
  editalItems: many(editalItems),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  bench: one(studyBenches, {
    fields: [subjects.benchId],
    references: [studyBenches.id],
  }),
  materials: many(materials),
}));

export const materialsRelations = relations(materials, ({ one, many }) => ({
  bench: one(studyBenches, {
    fields: [materials.benchId],
    references: [studyBenches.id],
  }),
  subject: one(subjects, {
    fields: [materials.subjectId],
    references: [subjects.id],
  }),
  chunks: many(materialChunks),
}));
