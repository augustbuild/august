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

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

// Configure production mail server settings
const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  secure: false, // For port 587, use STARTTLS
};

console.log('[Auth] Initializing mail transport with config:', {
  host: smtpConfig.host,
  port: smtpConfig.port,
  auth: { user: smtpConfig.auth.user }
});

const transporter = createTransport(smtpConfig);

// Verify mail configuration on startup
transporter.verify()
  .then(() => console.log('[Auth] Mail transport verified successfully'))
  .catch(error => {
    console.error('[Auth] Mail transport verification failed:', error);
  });

async function sendMagicLink(email: string, token: string) {
  try {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.august.build'
      : `https://${process.env.REPL_SLUG}.replit.dev`;

    const magicLink = `${baseUrl}/api/auth/verify-magic-link?token=${token}`;

    const msg = {
      to: email,
      from: process.env.SMTP_USER,
      subject: 'Sign in to August',
      text: `Click this link to sign in: ${magicLink}`,
      html: `
        <p>Click the button below to sign in to August:</p>
        <a href="${magicLink}" style="display:inline-block;padding:12px 20px;background:#000;color:#fff;text-decoration:none;border-radius:5px;">
          Sign In
        </a>
      `,
    };

    console.log('[Auth] Attempting to send magic link to:', email);

    const info = await transporter.sendMail(msg);
    console.log('[Auth] Magic link sent successfully');

  } catch (error: any) {
    console.error('[Auth] Failed to send magic link:', error);
    throw new Error("Unable to send login email. Please try again in a few minutes.");
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      domain: process.env.NODE_ENV === 'production' ? '.august.build' : undefined
    }
  };

  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/auth/magic-link", async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    try {
      const token = generateToken();
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 1); // Token expires in 1 hour

      let user = await storage.getUserByEmail(email);

      if (!user) {
        // Generate username from email
        const username = email.split('@')[0];
        let finalUsername = username;
        let counter = 1;

        // Ensure unique username
        while (await storage.getUserByUsername(finalUsername)) {
          finalUsername = `${username}${counter}`;
          counter++;
        }

        // Create new user
        user = await storage.createUser({
          email,
          username: finalUsername,
        });
      }

      // Update user with magic link token
      await storage.updateUser(user.id, {
        magicLinkToken: token,
        magicLinkExpiry: expiry,
      });

      // Send magic link email
      await sendMagicLink(email, token);

      res.status(200).json({ message: "Magic link sent" });
    } catch (error: any) {
      console.error('[Auth] Magic link flow error:', error);
      res.status(500).json({ 
        message: error.message || "Unable to send login email. Please try again in a few minutes."
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

      // Clear the magic link token
      await storage.updateUser(user.id, {
        magicLinkToken: null,
        magicLinkExpiry: null,
      });

      // Log the user in
      req.login(user, (err) => {
        if (err) {
          console.error('Error logging in user:', err);
          return res.redirect('/?error=login-failed');
        }
        res.redirect('/');
      });
    } catch (error) {
      console.error('Error verifying magic link:', error);
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