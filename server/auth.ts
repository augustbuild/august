import passport from "passport";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { randomBytes } from "crypto";
import { createTransport } from "nodemailer";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

// Generate a random token for magic links
function generateToken(): string {
  return randomBytes(32).toString('hex');
}

// Simplest possible Mailgun configuration
const mailgun = createTransport({
  host: "smtp.mailgun.org",
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verify the connection
mailgun.verify(function(error, success) {
  if (error) {
    console.error('[Mailgun] Connection error:', error);
  } else {
    console.log("[Mailgun] Server is ready to send emails");
  }
});

async function sendMagicLink(email: string, token: string) {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://www.august.build'
    : `https://${process.env.REPL_SLUG}.replit.dev`;

  const magicLink = `${baseUrl}/api/auth/verify-magic-link?token=${token}`;

  try {
    console.log('[Mailgun] Attempting to send email to:', email);

    const info = await mailgun.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Sign in to August',
      html: `
        <p>Click the button below to sign in to August:</p>
        <a href="${magicLink}" style="display:inline-block;padding:12px 20px;background:#000;color:#fff;text-decoration:none;border-radius:5px;">
          Sign In
        </a>
      `
    });

    console.log('[Mailgun] Email sent successfully:', info.messageId);
  } catch (error: any) {
    console.error('[Mailgun] Send error:', {
      message: error.message,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      response: error.response
    });
    throw new Error(error.message || "Failed to send login email");
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

      const token = generateToken();
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

      await sendMagicLink(email, token);
      res.json({ message: "Magic link sent" });
    } catch (error: any) {
      console.error('[Auth] Magic link error:', error);
      res.status(500).json({ 
        message: error.message || "Failed to send login email"
      });
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
        if (err) {
          return res.redirect('/?error=login-failed');
        }
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