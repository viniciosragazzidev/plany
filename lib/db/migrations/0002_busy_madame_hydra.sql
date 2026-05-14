CREATE TABLE "edital_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bench_id" uuid NOT NULL,
	"category" text NOT NULL,
	"topic" text NOT NULL,
	"description" text,
	"is_covered" boolean DEFAULT false NOT NULL,
	"weight" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "study_benches" ADD COLUMN "exam_notice_url" text;--> statement-breakpoint
ALTER TABLE "edital_items" ADD CONSTRAINT "edital_items_bench_id_study_benches_id_fk" FOREIGN KEY ("bench_id") REFERENCES "public"."study_benches"("id") ON DELETE no action ON UPDATE no action;