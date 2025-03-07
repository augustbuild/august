import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertProductSchema, insertCommentSchema, insertVoteSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Users
  app.get("/api/users/:id", async (req, res) => {
    const user = await storage.getUser(parseInt(req.params.id));
    if (!user) return res.sendStatus(404);
    // Don't send the password hash to the client
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  // Products
  app.get("/api/products", async (_req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  app.get("/api/products/:id", async (req, res) => {
    const product = await storage.getProduct(parseInt(req.params.id));
    if (!product) return res.sendStatus(404);
    res.json(product);
  });

  app.post("/api/products", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const validated = insertProductSchema.safeParse(req.body);
    if (!validated.success) return res.status(400).json(validated.error);

    const product = await storage.createProduct(validated.data, req.user!.id);
    res.status(201).json(product);
  });

  // Comments
  app.get("/api/products/:id/comments", async (req, res) => {
    const comments = await storage.getComments(parseInt(req.params.id));
    res.json(comments);
  });

  app.post("/api/comments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const validated = insertCommentSchema.safeParse(req.body);
    if (!validated.success) return res.status(400).json(validated.error);

    const comment = await storage.createComment(validated.data, req.user!.id);
    res.status(201).json(comment);
  });

  // Votes
  app.post("/api/votes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const validated = insertVoteSchema.safeParse(req.body);
    if (!validated.success) return res.status(400).json(validated.error);

    const existingVote = await storage.getVote(req.user!.id, validated.data.productId);
    let vote;

    if (existingVote) {
      vote = await storage.updateVote(existingVote.id, validated.data.value);
    } else {
      vote = await storage.createVote(validated.data, req.user!.id);
    }

    const product = await storage.getProduct(validated.data.productId);
    if (product) {
      const votes = Array.from((await storage.getProducts())
        .filter(p => p.id === validated.data.productId)
        .map(p => p.score))[0];

      await storage.updateProductScore(
        validated.data.productId,
        votes + (existingVote ? validated.data.value - existingVote.value : validated.data.value)
      );
    }

    res.json(vote);
  });

  // User's products and comments
  app.get("/api/users/:id/products", async (req, res) => {
    const products = await storage.getUserProducts(parseInt(req.params.id));
    res.json(products);
  });

  app.get("/api/users/:id/comments", async (req, res) => {
    const comments = await storage.getUserComments(parseInt(req.params.id));
    res.json(comments);
  });

  // Comment management
  app.patch("/api/comments/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const comment = await storage.getComment(parseInt(req.params.id));
    if (!comment) return res.sendStatus(404);
    if (comment.userId !== req.user!.id) return res.sendStatus(403);

    const updatedComment = await storage.updateComment(comment.id, req.body.content);
    res.json(updatedComment);
  });

  app.delete("/api/comments/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const comment = await storage.getComment(parseInt(req.params.id));
    if (!comment) return res.sendStatus(404);
    if (comment.userId !== req.user!.id) return res.sendStatus(403);

    await storage.deleteComment(comment.id);
    res.sendStatus(204);
  });

  // Product management
  app.patch("/api/products/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const product = await storage.getProduct(parseInt(req.params.id));
    if (!product) return res.sendStatus(404);
    if (product.userId !== req.user!.id) return res.sendStatus(403);

    const validated = insertProductSchema.partial().safeParse(req.body);
    if (!validated.success) return res.status(400).json(validated.error);

    const updatedProduct = await storage.updateProduct(product.id, validated.data);
    res.json(updatedProduct);
  });

  app.delete("/api/products/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const product = await storage.getProduct(parseInt(req.params.id));
    if (!product) return res.sendStatus(404);
    if (product.userId !== req.user!.id) return res.sendStatus(403);

    await storage.deleteProduct(product.id);
    res.sendStatus(204);
  });

  const httpServer = createServer(app);
  return httpServer;
}