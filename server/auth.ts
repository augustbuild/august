import passport from "passport";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { randomBytes } from "crypto";
import fetch from "node-fetch";

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

    // Mailgun API requires Basic auth with 'api:YOUR-API-KEY'
    const auth = Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64');
    const formData = new URLSearchParams({
      from: `mailgun@${process.env.MAILGUN_DOMAIN}`, // Simplified sender format
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

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('[Mailgun] Email sent successfully:', {
      to: email,
      messageId: data?.id
    });

    return data;
  } catch (error: any) {
    console.error('[Mailgun] Send failed:', {
      error: error.message,
      status: error.status,
      details: error.details
    });
    throw new Error('Failed to send login email');
  }
}

export function setupAuth(app: Express) {
  app.use(session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
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
        });
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
      return res.redirect('/?error=invalid-token');
    }

    try {
      const user = await storage.getUserByMagicLinkToken(token);
      if (!user || !user.magicLinkExpiry || new Date() > new Date(user.magicLinkExpiry)) {
        return res.redirect('/?error=expired-token');
      }

      await storage.updateUser(user.id, {
        magicLinkToken: null,
        magicLinkExpiry: null,
      });

      req.login(user, (err) => {
        if (err) return res.redirect('/?error=login-failed');
        res.redirect('/');
      });
    } catch (error) {
      res.redirect('/?error=verification-failed');
    }
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
}