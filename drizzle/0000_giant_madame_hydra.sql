CREATE TABLE "clients" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meta_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" varchar(255) NOT NULL,
	"app_id" varchar(255) NOT NULL,
	"system_user_token" varchar(1024) NOT NULL,
	"waba_id" varchar(255),
	"page_id" varchar(255),
	"destination_webhook_url" varchar(1024) NOT NULL,
	CONSTRAINT "meta_credentials_company_id_unique" UNIQUE("company_id"),
	CONSTRAINT "meta_credentials_waba_id_unique" UNIQUE("waba_id"),
	CONSTRAINT "meta_credentials_page_id_unique" UNIQUE("page_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'client' NOT NULL,
	"company_id" varchar(255),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" varchar(255) NOT NULL,
	"template_name" varchar(255) NOT NULL,
	"language" varchar(10) NOT NULL,
	"category" varchar(255) NOT NULL,
	"status" varchar(50) NOT NULL,
	"components_json" json
);
