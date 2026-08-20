import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import ImageKit from "imagekit";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize ImageKit with user provided credentials
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "public_+zeLkm1+EQPgROSL0v3Fp/UlHfs=",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "private_ctaGaQJx7xF54u8k2Zcknw5R+/A=",
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/titl32n0d",
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ImageKit Auth Parameters for client-side uploads
app.get("/api/imagekit/auth", (_req, res) => {
  try {
    const authenticationParameters = imagekit.getAuthenticationParameters();
    res.json(authenticationParameters);
  } catch (error: any) {
    console.error("Error generating ImageKit auth parameters:", error);
    res.status(500).json({ error: error.message || "Failed to generate auth parameters" });
  }
});

// ImageKit Direct Upload Endpoint (supports Base64 / data URL)
app.post("/api/imagekit/upload", async (req, res) => {
  try {
    const { file, fileName, folder } = req.body;
    if (!file || !fileName) {
      return res.status(400).json({ error: "File and fileName are required" });
    }

    const uploadResponse = await imagekit.upload({
      file, // can be base64 string or file URL
      fileName,
      folder: folder || "/malek_messages",
      useUniqueFileName: true,
    });

    res.json({
      success: true,
      url: uploadResponse.url,
      thumbnailUrl: uploadResponse.thumbnailUrl || uploadResponse.url,
      fileId: uploadResponse.fileId,
      name: uploadResponse.name,
      fileType: uploadResponse.fileType,
      size: uploadResponse.size,
    });
  } catch (error: any) {
    console.error("ImageKit upload error:", error);
    res.status(500).json({ error: error.message || "Upload failed" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Malek Message server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
