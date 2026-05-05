import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { OAuth2Client } from "google-auth-library";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

app.use(express.json());

// Google OAuth Client
const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  `${APP_URL}/auth/callback`
);

// API Routes
app.get("/api/auth/google/url", (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ error: "Google OAuth credentials not configured." });
  }

  const scopes = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/userinfo.profile",
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });

  res.json({ url });
});

app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("No code provided");
  }

  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    
    // In a real app, you'd store these tokens in Firestore linked to the user.
    // For the popup bridge, we'll pass them back to the client via postMessage.
    // WARNING: Passing tokens in HTML is only for this specific popup-bridge demo purpose.
    // Ideally, the server exchanges code for tokens and stores them, 
    // then signals SUCCESS to the client.
    
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS',
                tokens: ${JSON.stringify(tokens)}
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. You can close this window.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error exchanging code for tokens:", error);
    res.status(500).send("Authentication failed");
  }
});

// Proxy for Google Drive photos (to avoid CORS)
app.get("/api/drive/photo/:fileId", async (req, res) => {
  const { fileId } = req.params;
  const accessToken = req.headers.authorization?.split(" ")[1];

  if (!accessToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) throw new Error("Failed to fetch photo from Drive");

    const contentType = response.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("Drive Proxy Error:", error);
    res.status(500).json({ error: "Failed to fetch photo" });
  }
});

import bcrypt from "bcryptjs";

import { initializeApp as initializeAdmin } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

// Load config manually for ESM compatibility
const firebaseConfig = JSON.parse(
  readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8")
);

// Initialize admin
try {
  initializeAdmin();
} catch (e) {
  // If already initialized or other error, fallback to default
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.warn("No GOOGLE_APPLICATION_CREDENTIALS found. Admin SDK may fail.");
  }
}

const adminDb = getAdminFirestore(firebaseConfig.firestoreDatabaseId);

app.post("/api/albums/:albumId/verify-password", async (req, res) => {
  const { albumId } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: "Missing password" });
  }

  try {
    const securityPath = `albums/${albumId}/private/security`;
    const securityDoc = await adminDb.doc(securityPath).get();
    
    if (!securityDoc.exists) {
      console.error(`Security doc not found at ${securityPath}`);
      return res.status(404).json({ error: "No security configuration found for this vault." });
    }

    const { passwordHash } = securityDoc.data()!;
    const isValid = await bcrypt.compare(password, passwordHash);
    res.json({ isValid });
  } catch (error: any) {
    console.error("Verification Error details:", error);
    res.status(500).json({ error: "High-security vault verification failed. Please try again later." });
  }
});

app.post("/api/hash-password", async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Missing password" });

  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    res.json({ hash });
  } catch (error) {
    res.status(500).json({ error: "Hashing failed" });
  }
});

// Vite middleware
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
