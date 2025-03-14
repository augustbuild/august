import OpenAI from "openai";
import fetch from "node-fetch";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function fetchProductPage(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    const text = await response.text();
    return text;
  } catch (error) {
    console.error("[OpenAI] Error fetching product page:", error);
    return "";
  }
}

export async function generateProductDescription(
  title: string,
  companyName: string,
  link: string,
  materials: string[],
  collection: string,
  country: string
): Promise<string> {
  try {
    console.log("[OpenAI] Generating description for:", { title, companyName });

    const pageContent = await fetchProductPage(link);

    const prompt = `Using the product link (${link}), product name "${title}", and company name "${companyName}", generate an accurate, concise description of what makes this product extraordinary. Here's additional context from the product page:\n\n${pageContent}`;

    if (!process.env.OPENAI_API_KEY) {
      console.error("[OpenAI] API key not found");
      return "Product description unavailable.";
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a concise product reviewer who specializes in identifying what makes products truly special and unique."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    console.log("[OpenAI] Received response:", response.choices[0].message.content);

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.description || "Description generation failed.";
  } catch (error: any) {
    console.error("[OpenAI] Error generating description:", error);
    // Return a default message instead of throwing
    return "A high-quality product crafted with attention to detail and premium materials.";
  }
}