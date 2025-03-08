import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertProductSchema, insertCommentSchema, insertVoteSchema } from "@shared/schema";
import Stripe from "stripe";

// Initialize Stripe with comprehensive error handling
let stripe: Stripe | null = null;
try {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.warn('[Stripe] Secret key missing - payment features will be disabled');
  } else {
    console.log('[Stripe] Initializing with secret key');
    stripe = new Stripe(secretKey, { 
      apiVersion: '2023-10-16' 
    });
  }
} catch (error) {
  console.error('[Stripe] Failed to initialize:', error);
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Stripe payment intent route with enhanced error handling
  app.post("/api/create-payment-intent", async (req, res) => {
    if (!stripe) {
      console.warn('[Stripe] Payment attempt failed - Stripe not initialized');
      return res.status(503).json({ 
        error: "Payment system temporarily unavailable",
        details: "The payment system is not properly configured",
        code: "STRIPE_NOT_CONFIGURED"
      });
    }

    try {
      console.log('[Stripe] Creating payment intent');
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 10000, // $100 in cents
        currency: "usd",
        payment_method_types: ["card"],
        setup_future_usage: "off_session",
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        status: "success"
      });
    } catch (error: any) {
      console.error('[Stripe] Payment intent creation failed:', error);
      res.status(500).json({ 
        error: "Failed to process payment request",
        details: error.message,
        code: error.code || "UNKNOWN_ERROR"
      });
    }
  });

  // Users
  app.get("/api/users/:id", async (req, res) => {
    const user = await storage.getUser(parseInt(req.params.id));
    if (!user) return res.sendStatus(404);
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  // Products
  app.get("/api/products", async (_req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  app.post("/api/products", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const validated = insertProductSchema.safeParse(req.body);
    if (!validated.success) {
      console.error('[Products] Validation error:', validated.error);
      return res.status(400).json(validated.error);
    }

    try {
      if (!req.user?.id) {
        throw new Error("User ID not found in session");
      }

      // Prepare product data with user ID
      const productData = {
        ...validated.data,
        userId: req.user.id,
        featured: stripe ? validated.data.featured : false
      };

      console.log('[Products] Creating product with data:', {
        ...productData,
        userId: req.user.id // Log userId explicitly
      });

      const product = await storage.createProduct(productData);

      // Create initial upvote
      await storage.createVote({
        productId: product.id,
        userId: req.user.id,
        value: 1
      });

      // Update score
      await storage.updateProductScore(product.id, 1);

      res.status(201).json(product);
    } catch (error: any) {
      console.error('[Products] Creation error:', error);
      res.status(500).json({ 
        error: "Failed to create product",
        details: error.message 
      });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    const product = await storage.getProduct(parseInt(req.params.id));
    if (!product) return res.sendStatus(404);
    res.json(product);
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

    try {
      const comment = await storage.createComment({
        ...validated.data,
        userId: req.user!.id
      });
      res.status(201).json(comment);
    } catch (error: any) {
      console.error('[Comments] Creation error:', error);
      res.status(500).json({ 
        error: "Failed to create comment",
        details: error.message 
      });
    }
  });

  // Votes
  app.get("/api/votes/:productId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const vote = await storage.getVote(req.user!.id, parseInt(req.params.productId));
    res.json(vote);
  });

  app.post("/api/votes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const validated = insertVoteSchema.safeParse(req.body);
    if (!validated.success) return res.status(400).json(validated.error);

    try {
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

      // Update product score
      if (product) {
        const votes = (await storage.getProducts())
          .find(p => p.id === validated.data.productId)?.score ?? 0;

        await storage.updateProductScore(
          validated.data.productId,
          votes + (existingVote ? validated.data.value - existingVote.value : validated.data.value)
        );
      }

      res.json(vote);
    } catch (error: any) {
      console.error('[Votes] Operation error:', error);
      res.status(500).json({ 
        error: "Failed to process vote",
        details: error.message 
      });
    }
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

  // Product management
  app.patch("/api/products/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const product = await storage.getProduct(parseInt(req.params.id));
    if (!product) return res.sendStatus(404);
    if (product.userId !== req.user!.id) return res.sendStatus(403);

    const validated = insertProductSchema.partial().safeParse(req.body);
    if (!validated.success) return res.status(400).json(validated.error);

    const updatedProduct = await storage.updateProduct(product.id, {
      ...validated.data,
      featured: stripe ? validated.data.featured : false // Disable featured if Stripe is not available
    });
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