import { users, products, votes, comments } from "@shared/schema";
import type { User, InsertUser, Product, Comment, Vote } from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: Omit<Product, "id" | "score" | "createdAt">): Promise<Product>;
  updateProductScore(id: number, score: number): Promise<void>;
  getUserProducts(userId: number): Promise<Product[]>;
  deleteProduct(id: number): Promise<void>;
  updateProduct(id: number, product: Partial<Product>): Promise<Product>;

  getComments(productId: number): Promise<Comment[]>;
  createComment(comment: Omit<Comment, "id" | "createdAt">): Promise<Comment>;
  getUserComments(userId: number): Promise<Comment[]>;
  deleteComment(id: number): Promise<void>;
  updateComment(id: number, content: string): Promise<Comment>;
  getComment(id: number): Promise<Comment | undefined>;

  getVote(userId: number, productId: number): Promise<Vote | undefined>;
  createVote(vote: Omit<Vote, "id">): Promise<Vote>;
  updateVote(id: number, value: number): Promise<Vote>;

  sessionStore: session.Store;
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
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
    // Validate required fields
    if (!product.userId || typeof product.userId !== 'number') {
      throw new Error("Valid user ID is required to create a product");
    }

    try {
      console.log('[Storage] Creating product with data:', {
        ...product,
        userId: product.userId
      });

      const [newProduct] = await db
        .insert(products)
        .values({ 
          ...product,
          score: 0 
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

  async updateProductScore(id: number, score: number): Promise<void> {
    await db
      .update(products)
      .set({ score })
      .where(eq(products.id, id));
  }

  async getUserProducts(userId: number): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(eq(products.userId, userId));
  }

  async deleteProduct(id: number): Promise<void> {
    await db
      .delete(products)
      .where(eq(products.id, id));
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set(product)
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
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

  async deleteComment(id: number): Promise<void> {
    await db
      .delete(comments)
      .where(eq(comments.id, id));
  }

  async updateComment(id: number, content: string): Promise<Comment> {
    const [comment] = await db
      .update(comments)
      .set({ content })
      .where(eq(comments.id, id))
      .returning();
    return comment;
  }

  async getComment(id: number): Promise<Comment | undefined> {
    const [comment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, id));
    return comment;
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