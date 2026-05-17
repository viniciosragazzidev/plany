CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"persona" "student_level" DEFAULT 'concurseiro' NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"font_size" text DEFAULT 'base' NOT NULL,
	"notify_sm2" boolean DEFAULT true NOT NULL,
	"notify_new_editais" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;