import { users, products, votes, comments } from "@shared/schema";
import type { User, InsertUser, Product, Comment, Vote } from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;

  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByMagicLinkToken(token: string): Promise<User | undefined>;
  createUser(user: { 
    username: string;
    email?: string;
    avatarUrl?: string;
    isSubscribedToNewsletter?: boolean;
  }): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;

  // Product operations
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: Omit<Product, "id" | "score" | "createdAt">): Promise<Product>;
  updateProduct(id: number, product: Partial<Product>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  getUserProducts(userId: number): Promise<Product[]>;
  updateProductScore(id: number, score: number): Promise<void>;

  // Comment operations
  getComments(productId: number): Promise<Comment[]>;
  createComment(comment: Omit<Comment, "id" | "createdAt">): Promise<Comment>;
  getUserComments(userId: number): Promise<Comment[]>;
  getComment(id: number): Promise<Comment | undefined>;
  updateComment(id: number, content: string): Promise<Comment>;
  deleteComment(id: number): Promise<void>;

  // Vote operations
  getVote(userId: number, productId: number): Promise<Vote | undefined>;
  getUserVotes(userId: number): Promise<Vote[]>; // Get all votes for a user
  createVote(vote: Omit<Vote, "id">): Promise<Vote>;
  updateVote(id: number, value: number): Promise<Vote>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // Use case-insensitive comparison
    if (!email) return undefined;
    
    // Use lowercase for consistent storage and comparison
    const lowerEmail = email.toLowerCase();
    
    // Try to find by lowercase email comparison
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, lowerEmail));
      
    return user;
  }

  async getUserByMagicLinkToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.magicLinkToken, token));
    return user;
  }

  async createUser(insertUser: { 
    username: string;
    email?: string;
    avatarUrl?: string;
    isSubscribedToNewsletter?: boolean;
  }): Promise<User> {
    // Standardize email format by storing as lowercase
    const userData = {
      ...insertUser,
      // Convert email to lowercase if it exists
      email: insertUser.email ? insertUser.email.toLowerCase() : undefined
    };
    
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    // Standardize email format if being updated
    const userData = {
      ...updates,
      // Convert email to lowercase if it exists in the updates
      email: updates.email !== undefined ? 
        (updates.email ? updates.email.toLowerCase() : null) : 
        undefined
    };
    
    const [user] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: Omit<Product, "id" | "score" | "createdAt">): Promise<Product> {
    if (!product.userId || typeof product.userId !== 'number') {
      throw new Error("Valid user ID is required to create a product");
    }

    try {
      const [newProduct] = await db
        .insert(products)
        .values({
          ...product,
          score: 0,
        })
        .returning();

      if (!newProduct) {
        throw new Error("Failed to create product in database");
      }

      return newProduct;
    } catch (error: any) {
      console.error('[Storage] Product creation error:', error);
      throw error;
    }
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set(product)
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async getUserProducts(userId: number): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(eq(products.userId, userId));
  }

  async updateProductScore(id: number, score: number): Promise<void> {
    await db
      .update(products)
      .set({ score })
      .where(eq(products.id, id));
  }

  async getComments(productId: number): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.productId, productId));
  }

  async createComment(comment: Omit<Comment, "id" | "createdAt">): Promise<Comment> {
    const [newComment] = await db
      .insert(comments)
      .values(comment)
      .returning();
    return newComment;
  }

  async getUserComments(userId: number): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.userId, userId));
  }

  async getComment(id: number): Promise<Comment | undefined> {
    const [comment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, id));
    return comment;
  }

  async updateComment(id: number, content: string): Promise<Comment> {
    const [comment] = await db
      .update(comments)
      .set({ content })
      .where(eq(comments.id, id))
      .returning();
    return comment;
  }

  async deleteComment(id: number): Promise<void> {
    await db.delete(comments).where(eq(comments.id, id));
  }

  async getVote(userId: number, productId: number): Promise<Vote | undefined> {
    const [vote] = await db
      .select()
      .from(votes)
      .where(
        and(
          eq(votes.userId, userId),
          eq(votes.productId, productId)
        )
      );
    return vote;
  }

  async getUserVotes(userId: number): Promise<Vote[]> {
    return await db
      .select()
      .from(votes)
      .where(eq(votes.userId, userId));
  }

  async createVote(vote: Omit<Vote, "id">): Promise<Vote> {
    const [newVote] = await db
      .insert(votes)
      .values(vote)
      .returning();
    return newVote;
  }

  async updateVote(id: number, value: number): Promise<Vote> {
    const [updatedVote] = await db
      .update(votes)
      .set({ value })
      .where(eq(votes.id, id))
      .returning();
    return updatedVote;
  }
}

export const storage = new DatabaseStorage();