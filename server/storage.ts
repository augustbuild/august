import { users, products, votes, comments } from "@shared/schema";
import type { User, InsertUser, Product, Comment, Vote } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: Omit<Product, "id" | "score" | "createdAt">, userId: number): Promise<Product>;
  updateProductScore(id: number, score: number): Promise<void>;
  
  getComments(productId: number): Promise<Comment[]>;
  createComment(comment: Omit<Comment, "id" | "createdAt">, userId: number): Promise<Comment>;
  
  getVote(userId: number, productId: number): Promise<Vote | undefined>;
  createVote(vote: Omit<Vote, "id">, userId: number): Promise<Vote>;
  updateVote(id: number, value: number): Promise<Vote>;

  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private products: Map<number, Product>;
  private comments: Map<number, Comment>;
  private votes: Map<number, Vote>;
  sessionStore: session.SessionStore;
  
  private userId: number = 1;
  private productId: number = 1;
  private commentId: number = 1;
  private voteId: number = 1;

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.comments = new Map();
    this.votes = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(
    product: Omit<Product, "id" | "score" | "createdAt">,
    userId: number,
  ): Promise<Product> {
    const id = this.productId++;
    const newProduct = {
      ...product,
      id,
      userId,
      score: 0,
      createdAt: new Date(),
    };
    this.products.set(id, newProduct);
    return newProduct;
  }

  async updateProductScore(id: number, score: number): Promise<void> {
    const product = await this.getProduct(id);
    if (product) {
      this.products.set(id, { ...product, score });
    }
  }

  async getComments(productId: number): Promise<Comment[]> {
    return Array.from(this.comments.values()).filter(
      (comment) => comment.productId === productId,
    );
  }

  async createComment(
    comment: Omit<Comment, "id" | "createdAt">,
    userId: number,
  ): Promise<Comment> {
    const id = this.commentId++;
    const newComment = {
      ...comment,
      id,
      userId,
      createdAt: new Date(),
    };
    this.comments.set(id, newComment);
    return newComment;
  }

  async getVote(userId: number, productId: number): Promise<Vote | undefined> {
    return Array.from(this.votes.values()).find(
      (vote) => vote.userId === userId && vote.productId === productId,
    );
  }

  async createVote(
    vote: Omit<Vote, "id">,
    userId: number,
  ): Promise<Vote> {
    const id = this.voteId++;
    const newVote = { ...vote, id, userId };
    this.votes.set(id, newVote);
    return newVote;
  }

  async updateVote(id: number, value: number): Promise<Vote> {
    const vote = this.votes.get(id)!;
    const updatedVote = { ...vote, value };
    this.votes.set(id, updatedVote);
    return updatedVote;
  }
}

export const storage = new MemStorage();
