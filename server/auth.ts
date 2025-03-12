import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
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

const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

console.log('[Auth] Setting up SMTP with host:', process.env.SMTP_HOST);
console.log('[Auth] SMTP port:', process.env.SMTP_PORT);
console.log('[Auth] SMTP user:', process.env.SMTP_USER);

const transporter = createTransport(smtpConfig);

// Verify SMTP connection
transporter.verify((error) => {
  if (error) {
    console.error('[Auth] SMTP connection error:', error);
  } else {
    console.log('[Auth] SMTP connection successful');
  }
});

async function sendMagicLink(email: string, token: string) {
  try {
    const magicLink = `https://${process.env.REPL_SLUG}.replit.dev/api/auth/verify-magic-link?token=${token}`;

    // Get domain from SMTP_USER for the display name
    const fromEmail = process.env.SMTP_USER;
    const fromName = "August";

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: "Sign in to August",
      text: `Click this link to sign in: ${magicLink}`,
      html: `
        <p>Click the button below to sign in to August:</p>
        <a href="${magicLink}" style="display:inline-block;padding:12px 20px;background:#000;color:#fff;text-decoration:none;border-radius:5px;">
          Sign In
        </a>
      `,
    };

    console.log('[Auth] Attempting to send email with options:', { 
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject 
    });

    await transporter.sendMail(mailOptions);
    console.log('[Auth] Magic link email sent successfully to:', email);
  } catch (error: any) {
    console.error('[Auth] Error sending magic link email:', error);
    if (error.code === 'EAUTH') {
      console.error('[Auth] Authentication failed. Please check SMTP credentials.');
    } else if (error.code === 'ECONNECTION') {
      console.error('[Auth] Connection failed. Please check SMTP host and port.');
    }
    if (error.responseCode === 421) {
      throw new Error(
        "This email address is not authorized in the Mailgun sandbox. Please add it to your authorized recipients in Mailgun settings, or use GitHub login as an alternative."
      );
    }
    throw new Error(
      error.message.includes("is not allowed to send: Free accounts are for test purposes only")
        ? "Email sending is restricted in Mailgun sandbox mode. Please try using GitHub login instead."
        : "Failed to send magic link email. Please try again later or use GitHub login."
    );
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  // Magic link endpoints
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
      console.error('[Auth] Error in magic link flow:', error);
      res.status(503).json({ 
        message: error.message || "Failed to send magic link email. Please try again later or use GitHub login.",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
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

  // GitHub Strategy
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        callbackURL: "/api/auth/github/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // First try to find user by GitHub ID
          let user = await storage.getUserByGithubId(profile.id);

          if (!user) {
            // If no user found by GitHub ID, try to find by username
            user = await storage.getUserByUsername(profile.username!);

            if (user) {
              // If user exists but hasn't linked GitHub, update their GitHub info
              user = await storage.updateUser(user.id, {
                githubId: profile.id,
                githubAccessToken: accessToken,
                email: profile.emails?.[0]?.value,
                avatarUrl: profile.photos?.[0]?.value,
              });
            } else {
              // Create new user if no existing user found
              user = await storage.createUser({
                username: profile.username!,
                email: profile.emails?.[0]?.value,
                githubId: profile.id,
                githubAccessToken: accessToken,
                avatarUrl: profile.photos?.[0]?.value,
              });
            }
          } else {
            // Update existing GitHub user's token and avatar
            user = await storage.updateUser(user.id, {
              githubAccessToken: accessToken,
              avatarUrl: profile.photos?.[0]?.value,
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );

  // GitHub OAuth routes
  app.get("/api/auth/github", passport.authenticate("github", { scope: ["user:email"] }));

  app.get(
    "/api/auth/github/callback",
    passport.authenticate("github", { failureRedirect: "/login" }),
    (req, res) => {
      res.redirect("/");
    }
  );

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}