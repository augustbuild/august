import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
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

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

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