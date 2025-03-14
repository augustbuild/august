import passport from "passport";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { randomBytes } from "crypto";
import fetch from "node-fetch";

// Startup validation
if (!process.env.MAILGUN_DOMAIN || !process.env.MAILGUN_API_KEY) {
  throw new Error("Missing required Mailgun configuration");
}

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

  // Basic message validation
  if (!email || !token) {
    throw new Error("Invalid email or token");
  }

  try {
    console.log('Sending magic link email to:', email);

    const response = await fetch(
      `https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.MAILGUN_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `August <mailgun@${process.env.MAILGUN_DOMAIN}>`,
          to: email,
          subject: 'Sign in to August',
          text: `Click this link to sign in: ${magicLink}`
        })
      }
    );

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }

    console.log('Mailgun API Response:', {
      status: response.status,
      data: data
    });

    if (!response.ok) {
      throw new Error(`Failed to send email: ${data.message || responseText}`);
    }

    return data;
  } catch (error) {
    console.error('Mailgun API error:', error);
    throw error;
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
      console.error('Failed to send magic link:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/auth/verify-magic-link", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        return res.redirect('/?error=invalid-token');
      }

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