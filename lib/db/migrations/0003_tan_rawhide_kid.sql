CREATE TYPE "public"."confidence_level" AS ENUM('certo', 'duvidoso', 'chutando');--> statement-breakpoint
CREATE TYPE "public"."quiz_status" AS ENUM('generating', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."web_source_status" AS ENUM('pending', 'converted', 'imported', 'rejected');--> statement-breakpoint
ALTER TYPE "public"."material_type" ADD VALUE 'anotacao';--> statement-breakpoint
ALTER TYPE "public"."material_type" ADD VALUE 'simulado';--> statement-breakpoint
ALTER TYPE "public"."material_type" ADD VALUE 'flashcard';--> statement-breakpoint
CREATE TABLE "flashcard_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flashcard_id" uuid NOT NULL,
	"performance" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flashcards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bench_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"front" text NOT NULL,
	"back" text NOT NULL,
	"ease_factor" text DEFAULT '2.5' NOT NULL,
	"interval" integer DEFAULT 0 NOT NULL,
	"repetitions" integer DEFAULT 0 NOT NULL,
	"next_review_at" timestamp DEFAULT now() NOT NULL,
	"last_reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid NOT NULL,
	"subject_id" uuid,
	"topic_id" uuid,
	"origin_tag" text,
	"content" text NOT NULL,
	"embedding" vector(768),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'info' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"link" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"content" text NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "public_editais" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug_name" text NOT NULL,
	"file_hash" text NOT NULL,
	"institution" text NOT NULL,
	"role" text NOT NULL,
	"year" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "public_editais_slug_name_unique" UNIQUE("slug_name"),
	CONSTRAINT "public_editais_file_hash_unique" UNIQUE("file_hash")
);
--> statement-breakpoint
CREATE TABLE "public_subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_edital_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "public_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_subject_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"edital_item_id" uuid,
	"content" text NOT NULL,
	"explanation" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"selected_option_id" uuid,
	"is_correct" boolean NOT NULL,
	"confidence_level" "confidence_level",
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quizzes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bench_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" "quiz_status" DEFAULT 'generating' NOT NULL,
	"score" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "semantic_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bench_id" uuid NOT NULL,
	"query" text NOT NULL,
	"query_embedding" vector(768),
	"response" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bench_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"materials_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "web_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bench_id" uuid NOT NULL,
	"title" text NOT NULL,
	"source_url" text NOT NULL,
	"html_content" text,
	"markdown_content" text,
	"category" text NOT NULL,
	"topic" text NOT NULL,
	"authority_score" integer DEFAULT 50 NOT NULL,
	"status" "web_source_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "materials" ALTER COLUMN "subject_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "bench_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "edital_item_id" uuid;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "content" text;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "content_hash" text;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "is_pinned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "content_vector_ref" text;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "study_benches" ADD COLUMN "exam_notice_raw" text;--> statement-breakpoint
ALTER TABLE "study_benches" ADD COLUMN "exam_board" text;--> statement-breakpoint
ALTER TABLE "study_benches" ADD COLUMN "has_discovered_topics" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "study_benches" ADD COLUMN "research_status" text DEFAULT 'idle' NOT NULL;--> statement-breakpoint
ALTER TABLE "study_benches" ADD COLUMN "public_edital_id" uuid;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "icon" text;--> statement-breakpoint
ALTER TABLE "flashcard_attempts" ADD CONSTRAINT "flashcard_attempts_flashcard_id_flashcards_id_fk" FOREIGN KEY ("flashcard_id") REFERENCES "public"."flashcards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_bench_id_study_benches_id_fk" FOREIGN KEY ("bench_id") REFERENCES "public"."study_benches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_chunks" ADD CONSTRAINT "material_chunks_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_chunks" ADD CONSTRAINT "material_chunks_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_chunks" ADD CONSTRAINT "material_chunks_topic_id_edital_items_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."edital_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "options" ADD CONSTRAINT "options_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_subjects" ADD CONSTRAINT "public_subjects_public_edital_id_public_editais_id_fk" FOREIGN KEY ("public_edital_id") REFERENCES "public"."public_editais"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_topics" ADD CONSTRAINT "public_topics_public_subject_id_public_subjects_id_fk" FOREIGN KEY ("public_subject_id") REFERENCES "public"."public_subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_edital_item_id_edital_items_id_fk" FOREIGN KEY ("edital_item_id") REFERENCES "public"."edital_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_selected_option_id_options_id_fk" FOREIGN KEY ("selected_option_id") REFERENCES "public"."options"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_bench_id_study_benches_id_fk" FOREIGN KEY ("bench_id") REFERENCES "public"."study_benches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semantic_cache" ADD CONSTRAINT "semantic_cache_bench_id_study_benches_id_fk" FOREIGN KEY ("bench_id") REFERENCES "public"."study_benches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_bench_id_study_benches_id_fk" FOREIGN KEY ("bench_id") REFERENCES "public"."study_benches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_sources" ADD CONSTRAINT "web_sources_bench_id_study_benches_id_fk" FOREIGN KEY ("bench_id") REFERENCES "public"."study_benches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "embeddingIndex" ON "material_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "mc_subject_idx" ON "material_chunks" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "mc_topic_idx" ON "material_chunks" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "queryEmbeddingIndex" ON "semantic_cache" USING hnsw ("query_embedding" vector_cosine_ops);--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_bench_id_study_benches_id_fk" FOREIGN KEY ("bench_id") REFERENCES "public"."study_benches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_edital_item_id_edital_items_id_fk" FOREIGN KEY ("edital_item_id") REFERENCES "public"."edital_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" DROP COLUMN "vector_id";