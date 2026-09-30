import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a helpful customer support assistant for Aurum Ventura Enterprise LLC, an outsourced back-office administrative services company serving small and growing businesses across the United States.

Aurum Ventura offers the following services:
1. Document Preparation & Management - organizing documents, maintaining filing systems, preparing administrative documents
2. Invoice Administration - preparing and sending invoices, tracking payments and due dates, maintaining records
3. License & Renewal Tracking - recording and tracking licenses, permits, certifications, and insurance
4. Vendor Administration - maintaining vendor records, organizing W-9s and Certificates of Insurance
5. Business Operations Support - general administrative support for business operations
6. Customer Service & Communication - handling customer inquiries and communications
7. Financial Record Keeping - maintaining financial records and bookkeeping support
8. Compliance & Documentation - ensuring compliance with business requirements

Your responsibilities:
- Answer questions about our services and how they can help businesses
- Explain what Aurum Ventura can do for a business
- Provide information about our service areas and capabilities
- Help visitors understand our back-office support offerings
- Direct visitors to contact us for more detailed inquiries or consultations

Important guidelines:
- Stay focused on Aurum Ventura services and related business topics
- Be professional, friendly, and concise
- If asked about pricing or specific service details not mentioned, suggest contacting Aurum Ventura directly
- Contact information: admin@aurumventura.net or +1-850-653-7797
- Do not provide legal, tax, or accounting advice - suggest they consult with appropriate professionals
- If someone asks about something unrelated to Aurum Ventura services, politely redirect them back to how we can help their business

Always maintain a professional tone and remember that you represent Aurum Ventura Enterprise LLC.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, conversationHistory } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Invalid message" });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "API key not configured" });
    }

    // Build messages array with conversation history
    const messages = [
      ...(conversationHistory || []),
      { role: "user", content: message },
    ];

    // Set response headers for streaming
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Create streaming message
    const stream = await client.messages.stream({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages,
    });

    // Stream the response back to the client
    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        res.write(chunk.delta.text);
      }
    }

    res.end();
  } catch (error) {
    console.error("Chat API error:", error);
    res.status(500).json({ error: "Failed to process chat message" });
  }
}
