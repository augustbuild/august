import { Router } from "express";
import { generateProductDescription } from "../lib/openai";
import { z } from "zod";

const router = Router();

const generateDescriptionSchema = z.object({
  title: z.string(),
  companyName: z.string(),
  link: z.string().url(),
  materials: z.array(z.string()),
  collection: z.string(),
  country: z.string()
});

router.post("/api/generate-description", async (req, res) => {
  try {
    const data = generateDescriptionSchema.parse(req.body);
    const description = await generateProductDescription(
      data.title,
      data.companyName,
      data.link,
      data.materials,
      data.collection,
      data.country
    );
    res.json({ description });
  } catch (error) {
    console.error("[Generate Description] Error:", error);
    res.status(400).json({ error: "Failed to generate description" });
  }
});

export default router;
