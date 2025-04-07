import passport from "passport";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { randomBytes } from "crypto";
import fetch from "node-fetch";
import { subscribeToNewsletter } from "./services/beehiiv";

// Validate Mailgun configuration
if (!process.env.MAILGUN_DOMAIN || !process.env.MAILGUN_API_KEY) {
  throw new Error("Missing required Mailgun configuration");
}

// Log configuration status (without exposing secrets)
console.log('Server configuration:', {
  mailgunDomain: process.env.MAILGUN_DOMAIN,
  hasMailgunKey: Boolean(process.env.MAILGUN_API_KEY),
  environment: process.env.NODE_ENV || 'development'
});

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

async function sendMagicLinkEmail(email: string, token: string) {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://www.august.build'
    : `https://${process.env.REPL_SLUG}.replit.dev`;

  const magicLink = `${baseUrl}/api/auth/verify-magic-link?token=${token}`;

  try {
    console.log('[Mailgun] Attempting to send email to:', email);

    const auth = Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64');
    const formData = new URLSearchParams({
      from: `mailgun@${process.env.MAILGUN_DOMAIN}`,
      to: email,
      subject: 'Sign in to August',
      text: `Click this link to sign in: ${magicLink}`,
      html: `<p>Click here to sign in: <a href="${magicLink}">Sign In</a></p>`
    });

    const response = await fetch(
      `https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      }
    );

    const data = await response.json().catch(() => ({ message: "Failed to parse response" }));

    if (!response.ok) {
      throw new Error((data as { message?: string }).message || `HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('[Mailgun] Email sent successfully:', {
      to: email,
      messageId: (data as { id?: string }).id || 'unknown'
    });

    return data;
  } catch (error: any) {
    console.error('[Mailgun] Send failed:', error);
    throw new Error('Failed to send login email');
  }
}

export function setupAuth(app: Express) {
  // Configure secure session handling
  app.set('trust proxy', 1);

  const sessionConfig: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'development-secret-key',
    resave: true, // Changed to true to ensure session is saved on each request
    saveUninitialized: true, // Changed to true to ensure new sessions are saved
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days for better persistence
      httpOnly: true,
      path: '/'
    },
    name: 'august.sid' // Custom session name
  };

  app.use(session(sessionConfig));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user, done) => {
    console.log('[Auth] Serializing user:', user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(new Error('User not found'));
      }
      console.log('[Auth] Deserialized user:', id);
      done(null, user);
    } catch (error) {
      console.error('[Auth] Deserialize error:', error);
      done(error);
    }
  });

  app.post("/api/auth/magic-link", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const token = randomBytes(32).toString('hex');
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 1);

      let user = await storage.getUserByEmail(email);
      if (!user) {
        const username = email.split('@')[0];
        let finalUsername = username;
        let counter = 1;

        while (await storage.getUserByUsername(finalUsername)) {
          finalUsername = `${username}${counter}`;
          counter++;
        }

        user = await storage.createUser({
          email,
          username: finalUsername,
          isSubscribedToNewsletter: true,
        });
        
        // Auto-subscribe the new user to the newsletter
        try {
          await subscribeToNewsletter({
            email,
            firstName: finalUsername,
            utm_source: 'signup',
          });
          console.log(`[Auth] Auto-subscribed new user to newsletter: ${email}`);
        } catch (error) {
          console.error('[Auth] Failed to subscribe new user to newsletter:', error);
          // Continue with account creation even if newsletter subscription fails
        }
      }

      await storage.updateUser(user.id, {
        magicLinkToken: token,
        magicLinkExpiry: expiry,
      });

      await sendMagicLinkEmail(email, token);
      res.json({ message: "Magic link sent" });
    } catch (error: any) {
      console.error('[Auth] Magic link error:', error);
      res.status(500).json({ message: "Failed to send login email" });
    }
  });

  app.get("/api/auth/verify-magic-link", async (req, res) => {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      console.error('[Auth] Invalid token format');
      return res.redirect('/?error=invalid-token');
    }

    try {
      const user = await storage.getUserByMagicLinkToken(token);

      if (!user) {
        console.error('[Auth] User not found for token');
        return res.redirect('/?error=invalid-token');
      }

      if (!user.magicLinkExpiry || new Date() > new Date(user.magicLinkExpiry)) {
        console.error('[Auth] Token expired');
        await storage.updateUser(user.id, {
          magicLinkToken: null,
          magicLinkExpiry: null
        });
        return res.redirect('/?error=expired-token');
      }

      // Clear the token first to prevent reuse
      await storage.updateUser(user.id, {
        magicLinkToken: null,
        magicLinkExpiry: null
      });

      // Handle login with proper error handling
      await new Promise<void>((resolve, reject) => {
        req.login(user, (err) => {
          if (err) {
            console.error('[Auth] Login failed:', err);
            reject(err);
          } else {
            console.log('[Auth] User logged in successfully:', user.id);
            resolve();
          }
        });
      });

      // After successful login, redirect to home
      res.redirect('/');
    } catch (error) {
      console.error('[Auth] Verification error:', error);
      res.redirect('/?error=login-failed');
    }
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      console.log('[Auth] Unauthenticated user request');
      return res.sendStatus(401);
    }
    console.log('[Auth] Returning user data for:', req.user.id);
    res.json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const userId = req.user.id;
    req.logout((err) => {
      if (err) {
        console.error('[Auth] Logout error:', err);
        return next(err);
      }
      console.log('[Auth] User logged out:', userId);
      res.sendStatus(200);
    });
  });
}