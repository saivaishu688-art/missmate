/**
 * MissMate - Gemini API Service Integration
 * Implements Google Gemini 3.8 Flash integration using structured JSON output.
 * Built following the official gemini-api-dev skill guidelines.
 */

const GeminiService = {
  STORAGE_KEY: "missmate_gemini_api_key",
  MODEL_KEY: "missmate_gemini_model",
  DEFAULT_MODEL: "gemini-3.8-flash",

  getApiKey() {
    return localStorage.getItem(this.STORAGE_KEY) || "";
  },

  setApiKey(key) {
    if (key && key.trim()) {
      localStorage.setItem(this.STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  },

  getSelectedModel() {
    return localStorage.getItem(this.MODEL_KEY) || this.DEFAULT_MODEL;
  },

  setSelectedModel(model) {
    localStorage.setItem(this.MODEL_KEY, model);
  },

  /**
   * Analyze chat messages using Google Gemini API.
   * Tries the modern Interactions API first, with graceful fallback.
   */
  async analyzeWithGemini(rawText, onProgress = null) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error("No Gemini API key provided. Please enter your API key in Settings.");
    }

    const model = this.getSelectedModel();
    if (onProgress) onProgress("Sending chat history to Gemini 3.8 Flash...");

    const systemPrompt = `You are MissMate AI, an expert student assistant analyzing messy college group chats.
Extract key information strictly grounded in the chat text. Do not invent missing facts.
Return a structured JSON object matching this schema:
{
  "main_focus": "1-2 sentences on what this chat was mostly about",
  "critical_notice": "The single most urgent alert, deadline shift, or critical notice",
  "next_steps": "Key next steps, decisions, or agreed schedule",
  "narrative": "A concise 2-3 paragraph executive summary explaining the context, why decisions were made, and overall team progress",
  "tone": "Brief description of chat sentiment/tone (e.g. Stressed about deadline, Productive, Casual)",
  "top_topics": ["3-5 hashtag-style keywords without the #"],
  "action_items": [
    {
      "task": "Clear, actionable task description",
      "assignee": "Name of the person assigned, or 'Everyone', or 'Volunteer Needed'",
      "urgency": "urgent / important / normal",
      "context": "Short quote or context snippet from the chat"
    }
  ],
  "deadlines": [
    {
      "time_phrase": "Exact date/time mentioned (e.g. 'Friday, Oct 14 at 11:59 PM')",
      "type": "Submission Deadline / Meeting / Exam / Schedule",
      "is_urgent": true / false,
      "details": "What is due or happening at this time",
      "sender": "Person who announced it"
    }
  ],
  "classified_messages": [
    {
      "sender": "Sender name",
      "text": "Message text",
      "priority": "urgent / important / general",
      "reason": "Why it was given this priority"
    }
  ]
}`;

    const promptText = `Analyze this college group chat and return the structured JSON:\n\n${rawText}`;

    // Schema definition for Structured Output
    const jsonSchema = {
      type: "object",
      properties: {
        main_focus: { type: "string" },
        critical_notice: { type: "string" },
        next_steps: { type: "string" },
        narrative: { type: "string" },
        tone: { type: "string" },
        top_topics: {
          type: "array",
          items: { type: "string" }
        },
        action_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              task: { type: "string" },
              assignee: { type: "string" },
              urgency: { type: "string" },
              context: { type: "string" }
            },
            required: ["task", "assignee"]
          }
        },
        deadlines: {
          type: "array",
          items: {
            type: "object",
            properties: {
              time_phrase: { type: "string" },
              type: { type: "string" },
              is_urgent: { type: "boolean" },
              details: { type: "string" },
              sender: { type: "string" }
            },
            required: ["time_phrase", "type"]
          }
        },
        classified_messages: {
          type: "array",
          items: {
            type: "object",
            properties: {
              sender: { type: "string" },
              text: { type: "string" },
              priority: { type: "string" },
              reason: { type: "string" }
            }
          }
        }
      },
      required: ["main_focus", "critical_notice", "next_steps", "narrative", "action_items", "deadlines"]
    };

    // Attempt 1: Gemini Interactions API
    try {
      if (onProgress) onProgress("Connecting to Gemini API...");
      const endpoint = "https://generativelanguage.googleapis.com/v1beta/interactions";
      const payload = {
        model: model,
        input: promptText,
        system_instruction: systemPrompt,
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: jsonSchema
        },
        store: false
      };

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
          "Api-Revision": "2026-05-20"
        },
        body: JSON.stringify(payload)
      });

      if (resp.ok) {
        const data = await resp.json();
        // Parse output_text or model_output steps
        let rawJson = "";
        if (data.steps) {
          for (const step of data.steps) {
            if (step.type === "model_output" && step.content) {
              for (const part of step.content) {
                if (part.type === "text" || part.text) {
                  rawJson += part.text || "";
                }
              }
            }
          }
        } else if (data.output_text) {
          rawJson = data.output_text;
        }

        if (rawJson) {
          return JSON.parse(rawJson);
        }
      }
    } catch (err) {
      console.warn("Interactions API call encountered an issue, trying generateContent fallback:", err);
    }

    // Attempt 2: generateContent API with responseSchema
    if (onProgress) onProgress("Running Gemini Structured Generation...");
    const fallbackEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const fallbackPayload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: promptText }]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: jsonSchema,
        temperature: 0.2
      }
    };

    const fallbackResp = await fetch(fallbackEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(fallbackPayload)
    });

    if (!fallbackResp.ok) {
      const errJson = await fallbackResp.json().catch(() => ({}));
      const errMsg = errJson.error?.message || `HTTP ${fallbackResp.status}: ${fallbackResp.statusText}`;
      throw new Error(`Gemini API Error: ${errMsg}`);
    }

    const fallbackData = await fallbackResp.json();
    const candidate = fallbackData.candidates?.[0];
    const textOut = candidate?.content?.parts?.[0]?.text;

    if (!textOut) {
      throw new Error("No output text received from Gemini API.");
    }

    return JSON.parse(textOut);
  }
};
