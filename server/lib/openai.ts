import OpenAI from "openai";
import fetch from "node-fetch";
import * as cheerio from "cheerio"; // For extracting relevant content

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function fetchProductPage(url: string): Promise<string> {
  try {
    console.log("[OpenAI] Fetching product page:", url);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch product page: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract relevant content (product details, headings, etc.)
    const relevantContent = $('h1, h2, h3, p, li').slice(0, 20).text(); // Limit to avoid token overload

    console.log("[OpenAI] Extracted relevant content:", relevantContent.substring(0, 300) + "...");

    return relevantContent;
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
    if (!pageContent) {
      console.error("[OpenAI] Failed to fetch page content for:", link);
      return "Product description unavailable.";
    }

    console.log("[OpenAI] Successfully fetched and processed page content, length:", pageContent.length);

    const prompt = `Generate a product description based on the following details:
- Product Name: "${title}"
- Company: "${companyName}"
- Materials: ${materials.join(', ')}
- Collection: "${collection}"
- Country: "${country}"

Use the following context from the product page:
${pageContent}

Provide a concise description that highlights what makes this product special and unique.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a professional product reviewer known for creating concise, accurate product descriptions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7
    });

    const result = response.choices[0]?.message?.content?.trim();
    if (!result) throw new Error("Empty response from OpenAI");

    console.log("[OpenAI] Generated description:", result);

    return result;
  } catch (error: any) {
    console.error("[OpenAI] Error generating description:", error.message);
    return "Description generation failed due to an internal error.";
  }
}
