import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertProductSchema, insertCommentSchema, insertVoteSchema } from "@shared/schema";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

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

    try {
      // Create the product
      const product = await storage.createProduct(validated.data, req.user!.id);

      // Automatically create an upvote from the creator
      await storage.createVote({
        productId: product.id,
        userId: req.user!.id,
        value: 1
      });

      // Update the product score
      await storage.updateProductScore(product.id, 1);

      res.status(201).json(product);
    } catch (error: any) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Stripe payment intent
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 10000, // $100 in cents
        currency: "usd",
        payment_method_types: ["card"],
        // Set up recurring billing
        setup_future_usage: "off_session",
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
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

    const comment = await storage.createComment({
      ...validated.data,
      userId: req.user!.id
    });
    res.status(201).json(comment);
  });

  // Votes
  app.get("/api/votes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const votes = await storage.getUserVotes(req.user!.id);
    res.json(votes);
  });

  app.post("/api/votes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const validated = insertVoteSchema.safeParse(req.body);
    if (!validated.success) return res.status(400).json(validated.error);

    // Check if the user is the product creator
    const product = await storage.getProduct(validated.data.productId);
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (product.userId === req.user!.id) {
      return res.status(403).json({ message: "Cannot vote on your own product" });
    }

    const existingVote = await storage.getVote(req.user!.id, validated.data.productId);
    let vote;

    if (existingVote) {
      vote = await storage.updateVote(existingVote.id, validated.data.value);
    } else {
      vote = await storage.createVote({
        ...validated.data,
        userId: req.user!.id
      });
    }

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