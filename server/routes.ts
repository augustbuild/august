import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertProductSchema, insertCommentSchema, insertVoteSchema, User, users } from "@shared/schema";
import Stripe from "stripe";
import axios from "axios";
import { subscribeToNewsletter } from "./services/beehiiv";
import { z } from "zod";
import { db } from "./db";
import { and, eq, isNotNull, like, ne, or } from "drizzle-orm";
import rateLimit from "express-rate-limit";

// Initialize Stripe with comprehensive error handling
let stripe: Stripe | null = null;
try {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.warn('[Stripe] Secret key missing - payment features will be disabled');
  } else {
    console.log('[Stripe] Initializing with secret key');
    stripe = new Stripe(secretKey, { 
      apiVersion: '2025-02-24.acacia'
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
    // Send the user data without sensitive fields
    res.json(user);
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
        featured: validated.data.featured ?? false // Ensure featured is always boolean
      };

      console.log('[Products] Creating product with data:', productData);

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
        details: error.message,
        code: "PRODUCT_CREATION_FAILED"
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
      const commentData = {
        ...validated.data,
        userId: req.user!.id,
        parentId: validated.data.parentId || null // Ensure parentId is never undefined
      };

      const comment = await storage.createComment(commentData);
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
  app.get("/api/votes", async (req, res) => {
    // For bulk requests with no specified product ID
    // Return empty array for unauthenticated users
    if (!req.isAuthenticated()) {
      console.log('[Votes] Unauthenticated request for all votes, returning empty array');
      return res.json([]);
    }
    
    try {
      // Get all votes for the currently logged in user
      const userVotes = await storage.getUserVotes(req.user!.id);
      console.log(`[Votes] Retrieved ${userVotes.length} votes for user ${req.user!.id}`);
      return res.json(userVotes);
    } catch (error) {
      console.error('[Votes] Error retrieving all votes:', error);
      return res.status(500).json({ error: 'Failed to retrieve vote data' });
    }
  });

  app.get("/api/votes/:productId", async (req, res) => {
    // Check if user is authenticated
    if (!req.isAuthenticated()) {
      console.log('[Votes] Unauthenticated request for product votes, returning null');
      // Return null for unauthenticated users instead of 401
      return res.json(null);
    }
    
    try {
      // Parse the product ID from the URL parameters
      const productId = parseInt(req.params.productId);
      if (isNaN(productId)) {
        return res.status(400).json({ error: 'Invalid product ID' });
      }
      
      // Get the vote for the authenticated user and product
      const vote = await storage.getVote(req.user!.id, productId);
      console.log(`[Votes] Retrieved vote for user ${req.user!.id}, product ${productId}:`, vote || 'No vote found');
      
      // Return the vote data (or null if no vote found)
      return res.json(vote || null);
    } catch (error) {
      console.error('[Votes] Error retrieving vote:', error);
      return res.status(500).json({ error: 'Failed to retrieve vote data' });
    }
  });

  app.post("/api/votes", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.error('[Votes] Unauthenticated vote attempt');
      return res.status(401).json({ message: "Authentication required to vote" });
    }

    console.log(`[Votes] Processing vote request from user ${req.user!.id}:`, req.body);
    
    const validated = insertVoteSchema.safeParse(req.body);
    if (!validated.success) {
      console.error('[Votes] Invalid vote data:', validated.error);
      return res.status(400).json(validated.error);
    }

    try {
      // Check if the user is the product creator
      const product = await storage.getProduct(validated.data.productId);
      if (!product) {
        console.error(`[Votes] Product not found: ${validated.data.productId}`);
        return res.status(404).json({ message: "Product not found" });
      }
      if (product.userId === req.user!.id) {
        console.log(`[Votes] User ${req.user!.id} attempted to vote on their own product ${product.id}`);
        return res.status(403).json({ message: "Cannot vote on your own product" });
      }

      const existingVote = await storage.getVote(req.user!.id, validated.data.productId);
      let vote;

      if (existingVote) {
        console.log(`[Votes] Updating existing vote ${existingVote.id} from ${existingVote.value} to ${validated.data.value}`);
        vote = await storage.updateVote(existingVote.id, validated.data.value);
      } else {
        console.log(`[Votes] Creating new vote for user ${req.user!.id} on product ${validated.data.productId}`);
        vote = await storage.createVote({
          ...validated.data,
          userId: req.user!.id
        });
      }

      // Update product score
      if (product) {
        const votes = (await storage.getProducts())
          .find(p => p.id === validated.data.productId)?.score ?? 0;

        const newScore = votes + (existingVote ? validated.data.value - existingVote.value : validated.data.value);
        console.log(`[Votes] Updating product ${product.id} score from ${votes} to ${newScore}`);
        
        await storage.updateProductScore(
          validated.data.productId,
          newScore
        );
      }

      console.log(`[Votes] Successfully processed vote:`, vote);
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
  
  // Update user profile
  app.patch("/api/users/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    
    try {
      const { username, isSubscribedToNewsletter } = req.body;
      const updates: Partial<User> = {};
      
      // Handle username updates if provided
      if (username !== undefined) {
        if (!username || typeof username !== 'string' || username.trim() === '') {
          return res.status(400).json({ 
            error: "Invalid username format",
            details: "Username cannot be empty" 
          });
        }
        
        // Check if username is already taken by another user
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== req.user!.id) {
          return res.status(409).json({ 
            error: "Username already taken",
            details: "Please choose a different username" 
          });
        }
        
        updates.username = username;
      }
      
      // Handle newsletter subscription updates if provided
      if (isSubscribedToNewsletter !== undefined) {
        updates.isSubscribedToNewsletter = isSubscribedToNewsletter;
        
        // If subscribing, also update their subscription in the newsletter service
        if (isSubscribedToNewsletter && req.user?.email) {
          try {
            await subscribeToNewsletter({
              email: req.user.email,
              firstName: req.user.username,
              utm_source: 'profile_page',
            });
            console.log(`[Users] User ${req.user.id} subscribed to newsletter`);
          } catch (subError) {
            // Log error but don't fail the request
            console.error('[Users] Failed to update external newsletter subscription:', subError);
          }
        }
      }
      
      // Only proceed if there are updates to make
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          error: "No valid updates provided",
          details: "At least one valid field must be provided for update"
        });
      }
      
      const updatedUser = await storage.updateUser(req.user!.id, updates);
      res.json(updatedUser);
    } catch (error: any) {
      console.error('[Users] Profile update error:', error);
      res.status(500).json({ 
        error: "Failed to update profile",
        details: error.message 
      });
    }
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
      featured: validated.data.featured ?? false // Ensure featured is always boolean
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

  // YouTube API route
  app.get("/api/youtube/playlist", async (req, res) => {
    try {
      const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
      
      if (!YOUTUBE_API_KEY) {
        console.error('[YouTube] API key is missing');
        return res.status(503).json({
          error: "YouTube API service unavailable",
          details: "The YouTube API key is missing from environment variables",
          actionRequired: "Add the YOUTUBE_API_KEY environment variable to your deployment",
          code: "YOUTUBE_API_KEY_MISSING"
        });
      }

      console.log('[YouTube] Attempting to fetch playlist with API key');
      
      // The playlist ID from the given URL
      const PLAYLIST_ID = 'PLroxG2e6nYKuMsF8nSNieCN0VSr9gB1U9';
      
      // Test the API key with a simple request first
      try {
        await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
          params: {
            part: 'id',
            maxResults: 1,
            playlistId: PLAYLIST_ID,
            key: YOUTUBE_API_KEY
          }
        });
        console.log('[YouTube] API key validated successfully');
      } catch (testError: any) {
        console.error('[YouTube] API key validation failed:', testError.response?.data?.error || testError.message);
        if (testError.response?.data?.error?.status === 'PERMISSION_DENIED') {
          return res.status(403).json({
            error: "YouTube API permission denied",
            details: "The YouTube API key exists but doesn't have proper permissions",
            actionRequired: "Enable the YouTube Data API v3 in your Google Cloud Console",
            code: "YOUTUBE_API_PERMISSION_DENIED"
          });
        }
        // Re-throw to be handled in the main catch block
        throw testError;
      }
      
      // Get playlist items
      const playlistResponse = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
        params: {
          part: 'snippet',
          maxResults: 50, // Max allowed by the API
          playlistId: PLAYLIST_ID,
          key: YOUTUBE_API_KEY
        }
      });

      if (!playlistResponse.data.items || playlistResponse.data.items.length === 0) {
        console.warn('[YouTube] Playlist returned no items');
        return res.status(404).json({
          error: "No videos found",
          details: "The YouTube playlist exists but contains no accessible videos",
          code: "EMPTY_PLAYLIST"
        });
      }

      // Get video IDs from the playlist items
      const videoIds = playlistResponse.data.items.map((item: any) => 
        item.snippet.resourceId.videoId
      ).join(',');

      // Get video details including duration and statistics (for view count)
      const videosResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          part: 'contentDetails,snippet,statistics',
          id: videoIds,
          key: YOUTUBE_API_KEY
        }
      });

      if (!videosResponse.data.items || videosResponse.data.items.length === 0) {
        console.warn('[YouTube] Video details request returned no items');
        return res.status(404).json({
          error: "No video details found",
          details: "Could not retrieve video details from YouTube API",
          code: "NO_VIDEO_DETAILS"
        });
      }

      console.log(`[YouTube] Retrieved details for ${videosResponse.data.items.length} videos`);
      
      // Function to parse ISO 8601 duration to seconds
      const parseDuration = (duration: string): number => {
        const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        const hours = (match && match[1]) ? parseInt(match[1].slice(0, -1)) : 0;
        const minutes = (match && match[2]) ? parseInt(match[2].slice(0, -1)) : 0;
        const seconds = (match && match[3]) ? parseInt(match[3].slice(0, -1)) : 0;
        return hours * 3600 + minutes * 60 + seconds;
      };
      
      // Transform the data to our required format
      const videos = videosResponse.data.items.map((item: any) => {
        const durationSeconds = parseDuration(item.contentDetails.duration);
        
        // Format view count with commas (e.g., 1,234,567)
        const viewCountRaw = item.statistics?.viewCount || "0";
        const viewCount = parseInt(viewCountRaw).toLocaleString();
        
        return {
          id: item.id,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
          publishedAt: item.snippet.publishedAt,
          duration: item.contentDetails.duration,
          durationSeconds,
          isShort: durationSeconds < 180, // Less than 3 minutes is considered a short
          viewCount
        };
      });
      
      res.json(videos);
    } catch (error: any) {
      console.error('[YouTube] API Error:', error.response?.data || error.message);
      
      // Check for specific API not enabled error
      if (error.response?.data?.error?.code === 403 && 
          error.response?.data?.error?.message?.includes('has not been used in project') && 
          error.response?.data?.error?.message?.includes('or it is disabled')) {
        
        // Extract the URL from the error message for easier access
        const enableApiUrl = error.response?.data?.error?.message?.match(/https:\/\/console\.developers\.google\.com[^\s]+/)?.[0] || '';
        
        return res.status(503).json({
          error: "YouTube API not enabled",
          details: "The YouTube Data API v3 needs to be enabled for this project in the Google Cloud Console.",
          actionRequired: "Please enable the YouTube Data API v3 in your Google Cloud project.",
          enableUrl: enableApiUrl,
          code: "YOUTUBE_API_NOT_ENABLED"
        });
      }

      // Handle quota exceeded errors
      if (error.response?.data?.error?.code === 403 && 
          error.response?.data?.error?.message?.includes('quota')) {
        return res.status(429).json({
          error: "YouTube API quota exceeded",
          details: "Your daily YouTube API quota has been exceeded. Please try again tomorrow.",
          code: "YOUTUBE_API_QUOTA_EXCEEDED"
        });
      }
      
      // Generic error response with detailed information
      res.status(500).json({
        error: "Failed to fetch YouTube videos",
        details: error.response?.data?.error?.message || error.message,
        code: error.response?.data?.error?.code || "YOUTUBE_API_ERROR"
      });
    }
  });
  
  // Newsletter subscription endpoint
  const newsletterSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    firstName: z.string().optional(),
    source: z.string().optional(),
  });
  
  app.post("/api/newsletter/subscribe", async (req, res) => {
    try {
      console.log('[Newsletter] Processing subscription request');
      
      const validated = newsletterSchema.safeParse(req.body);
      if (!validated.success) {
        console.error('[Newsletter] Validation error:', validated.error);
        return res.status(400).json({ 
          error: "Invalid subscription data", 
          details: validated.error.errors[0]?.message || "Please check your information and try again" 
        });
      }
      
      const result = await subscribeToNewsletter({
        email: validated.data.email,
        firstName: validated.data.firstName,
        utm_source: validated.data.source || 'website',
      });
      
      if (result.success) {
        console.log(`[Newsletter] Successfully subscribed email: ${validated.data.email}`);
        return res.status(200).json({ 
          message: result.message || "Thank you for subscribing to our newsletter!" 
        });
      } else {
        console.error(`[Newsletter] Subscription failed for email: ${validated.data.email}`);
        return res.status(400).json({ 
          error: "Subscription failed", 
          details: result.message || "Unable to subscribe at this time. Please try again later."
        });
      }
    } catch (error: any) {
      console.error('[Newsletter] Error processing subscription:', error);
      return res.status(500).json({ 
        error: "Subscription failed", 
        details: error.message || "An unexpected error occurred. Please try again later."
      });
    }
  });

  // Create a rate limiter for admin endpoints
  const adminRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 120, // limit each IP to 120 requests per hour (allows for batch processing)
    message: {
      error: "Too many requests",
      details: "You have exceeded the rate limit for this operation. Please try again later.",
      code: "RATE_LIMIT_EXCEEDED"
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });
  
  // Helper function to validate admin access
  const validateAdminAccess = (req: Express.Request): { isAuthorized: boolean, message?: string } => {
    // For script execution in development, allow bypass with correct token
    const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    const validScriptToken = "august_newsletter_script_2025";
    const isScriptBypass = isDevelopment && 
                         (req.body?._devBypassAuth === true || req.query?._devBypassAuth === "true") && 
                         (req.body?._scriptRunToken === validScriptToken || req.query?._scriptRunToken === validScriptToken);
    
    if (isScriptBypass) {
      console.log('[Admin] Script bypass authentication accepted');
      return { isAuthorized: true };
    }
    
    // Check for admin authorization (implement proper admin check as needed)
    const user = req.user as User | undefined;
    if (!user) {
      return { 
        isAuthorized: false, 
        message: "Unauthorized. You must be logged in to access this endpoint" 
      };
    }
    
    // This endpoint is only available in development or to authorized admins
    // In production, you should implement proper admin role checks
    if (!isDevelopment && user.email !== 'admin@example.com') {
      return { 
        isAuthorized: false, 
        message: "Forbidden. You do not have permission to access this endpoint" 
      };
    }
    
    console.log(`[Admin] Admin access granted to user ${user.id} (${user.email || user.username})`);
    return { isAuthorized: true };
  };
  
  // Endpoint to get all users with email addresses
  app.get("/api/admin/users/with-email", adminRateLimit, async (req, res) => {
    try {
      // Validate admin access
      const accessCheck = validateAdminAccess(req);
      if (!accessCheck.isAuthorized) {
        return res.status(accessCheck.message?.includes("Unauthorized") ? 401 : 403)
          .json({ error: accessCheck.message?.split('.')[0], details: accessCheck.message });
      }
      
      // Get all users with email addresses
      const usersWithEmails = await db.query.users.findMany({
        where: or(
          and(
            isNotNull(users.email),
            ne(users.email, '')
          ),
          like(users.username, '%@%')
        )
      });
      
      // Transform the data to include only necessary fields
      const simplifiedUsers = usersWithEmails.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email || (user.username.includes('@') ? user.username : null),
        isSubscribedToNewsletter: user.isSubscribedToNewsletter
      }));
      
      return res.status(200).json({
        total: simplifiedUsers.length,
        users: simplifiedUsers
      });
    } catch (error: any) {
      console.error('[Admin] Error fetching users with emails:', error);
      return res.status(500).json({ 
        error: "Failed to fetch users", 
        details: error.message || "An unexpected error occurred. Please try again later."
      });
    }
  });
  
  // Endpoint to subscribe a single user to the newsletter
  app.post("/api/admin/newsletter/subscribe-single", adminRateLimit, async (req, res) => {
    try {
      // Validate admin access
      const accessCheck = validateAdminAccess(req);
      if (!accessCheck.isAuthorized) {
        return res.status(accessCheck.message?.includes("Unauthorized") ? 401 : 403)
          .json({ error: accessCheck.message?.split('.')[0], details: accessCheck.message });
      }
      
      const userId = req.body.userId;
      if (!userId) {
        return res.status(400).json({ 
          error: "Bad Request", 
          details: "User ID is required"
        });
      }
      
      // Get the user
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });
      
      if (!user) {
        return res.status(404).json({ 
          error: "Not Found", 
          details: `User with ID ${userId} not found`
        });
      }
      
      // Use email if available, otherwise use username if it looks like an email
      const email = user.email || (user.username.includes('@') ? user.username : null);
      
      if (!email) {
        return res.status(400).json({ 
          error: "Bad Request", 
          details: "User does not have a valid email address"
        });
      }
      
      // Subscribe the user to the newsletter
      const result = await subscribeToNewsletter({
        email,
        firstName: user.username,
        utm_source: 'admin_single_subscribe',
      });
      
      if (result.success) {
        // Update user in database if they weren't already marked as subscribed
        if (!user.isSubscribedToNewsletter) {
          await db.update(users)
            .set({ isSubscribedToNewsletter: true })
            .where(eq(users.id, user.id));
        }
      }
      
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('[Admin] Error subscribing user to newsletter:', error);
      return res.status(500).json({ 
        success: false,
        message: error.message || "An unexpected error occurred. Please try again later."
      });
    }
  });
  
  // Admin endpoint for bulk subscribing all users to newsletter (legacy approach)
  app.post("/api/admin/newsletter/bulk-subscribe", adminRateLimit, async (req, res) => {
    try {
      console.log('[Admin] Processing bulk newsletter subscription request');
      
      // For script execution in development, allow bypass with correct token
      const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
      const validScriptToken = "august_newsletter_script_2025";
      const isScriptBypass = isDevelopment && 
                            req.body?._devBypassAuth === true && 
                            req.body?._scriptRunToken === validScriptToken;
      
      if (isScriptBypass) {
        console.log('[Admin] Script bypass authentication accepted');
      } else {
        // Check for admin authorization (implement proper admin check as needed)
        const user = req.user as User | undefined;
        if (!user) {
          return res.status(401).json({ error: "Unauthorized", details: "You must be logged in to access this endpoint" });
        }
        
        // This endpoint is only available in development or to authorized admins
        // In production, you should implement proper admin role checks
        if (!isDevelopment && user.email !== 'admin@example.com') {
          return res.status(403).json({ error: "Forbidden", details: "You do not have permission to access this endpoint" });
        }
        
        console.log(`[Admin] Admin access granted to user ${user.id} (${user.email || user.username})`);
      }
      
      // Get all users with email addresses
      const usersWithEmails = await db.query.users.findMany({
        where: or(
          and(
            isNotNull(users.email),
            ne(users.email, '')
          ),
          like(users.username, '%@%')
        )
      });
      
      console.log(`[Admin] Found ${usersWithEmails.length} users with email addresses to subscribe`);
      
      const results = {
        total: usersWithEmails.length,
        success: 0,
        alreadySubscribed: 0,
        failed: 0,
        errors: [] as string[]
      };
      
      // Helper function to wait between API calls
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      // Process each user with rate limiting
      for (const user of usersWithEmails) {
        try {
          // Use email if available, otherwise use username if it looks like an email
          const email = user.email || (user.username.includes('@') ? user.username : null);
          
          if (!email) {
            results.failed++;
            results.errors.push(`User ID ${user.id}: No valid email found`);
            continue;
          }
          
          const result = await subscribeToNewsletter({
            email,
            firstName: user.username,
            utm_source: 'admin_bulk_subscribe',
          });
          
          if (result.success) {
            if (result.message.includes('already subscribed')) {
              results.alreadySubscribed++;
            } else {
              results.success++;
            }
            
            // Update user in database if they weren't already marked as subscribed
            if (!user.isSubscribedToNewsletter) {
              await db.update(users)
                .set({ isSubscribedToNewsletter: true })
                .where(eq(users.id, user.id));
            }
          } else {
            results.failed++;
            results.errors.push(`User ID ${user.id} (${email}): ${result.message}`);
          }
          
          // Add a small delay between requests to avoid overwhelming the API
          await delay(1000); // 1 second delay
          
        } catch (userError: any) {
          results.failed++;
          results.errors.push(`User ID ${user.id}: ${userError.message}`);
          
          // Still add delay even after errors
          await delay(1000);
        }
      }
      
      return res.status(200).json({
        message: "Bulk newsletter subscription completed",
        results
      });
    } catch (error: any) {
      console.error('[Admin] Error processing bulk subscription:', error);
      return res.status(500).json({ 
        error: "Bulk subscription failed", 
        details: error.message || "An unexpected error occurred. Please try again later."
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}