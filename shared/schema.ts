import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").unique(),  // Made optional for backward compatibility
  avatarUrl: text("avatar_url"),
  magicLinkToken: text("magic_link_token"),
  magicLinkExpiry: timestamp("magic_link_expiry"),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  link: text("link").notNull(),
  imageUrl: text("image_url").notNull(),
  companyName: text("company_name").notNull(),
  country: text("country").notNull(),
  material: text("material").array(),
  collection: text("collection").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  score: integer("score").default(0).notNull(),
  featured: boolean("featured").default(false).notNull(),
});

export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  value: integer("value").notNull(), // 1 or -1
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  parentId: integer("parent_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
}).extend({
  email: z.string().email("Please enter a valid email address"),
});

export const insertProductSchema = createInsertSchema(products).pick({
  title: true,
  description: true,
  link: true,
  imageUrl: true,
  companyName: true,
  country: true,
  material: true,
  collection: true,
}).extend({
  title: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Description is required"),
  link: z.string().url("Must be a valid URL"),
  imageUrl: z.string().url("Must be a valid URL"),
  companyName: z.string().min(1, "Company name is required"),
  country: z.string().min(1, "Country is required"),
  material: z.array(z.string()).min(1, "At least one material is required"),
  collection: z.string().min(1, "Collection is required"),
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  content: true,
  productId: true,
  parentId: true,
});

export const insertVoteSchema = createInsertSchema(votes).pick({
  productId: true,
  value: true,
});

export const magicLinkSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Vote = typeof votes.$inferSelect;