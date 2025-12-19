
import { GoogleGenAI } from "@google/genai";

// Fixed: Correctly initialize GoogleGenAI with named parameter using process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// 1. General Chat (Upgraded to gemini-3-pro-preview)
export const generateGeminiResponse = async (prompt: string, systemInstruction?: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      },
    });
    // Fixed: Use .text property directly as per guidelines
    return response.text || "I couldn't generate a response at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error while processing your request.";
  }
};

// 2. Image Editing (gemini-2.5-flash-image)
export const editImage = async (prompt: string, base64Image: string, mimeType: string): Promise<string | null> => {
  try {
    // Extract raw base64 string if data URL is provided
    const data = base64Image.split(',')[1] || base64Image;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType, data } },
          { text: prompt }
        ],
      },
    });

    // Fixed: Iterate through parts to find the image part
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    return null;
  } catch (error) {
    console.error("Gemini Image Edit Error:", error);
    throw error;
  }
};

// 3. Image Generation (gemini-3-pro-image-preview)
export const generateImage = async (prompt: string, aspectRatio: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
          imageSize: "1K"
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    return null;
  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    throw error;
  }
};

// 4. Video Understanding (gemini-3-pro-preview)
export const analyzeVideo = async (prompt: string, base64Video: string, mimeType: string): Promise<string> => {
  try {
    const data = base64Video.split(',')[1] || base64Video;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data } },
          { text: prompt }
        ]
      }
    });
    // Fixed: Use .text property directly
    return response.text || "Could not analyze video.";
  } catch (error) {
    console.error("Gemini Video Analysis Error:", error);
    return "Error analyzing video content.";
  }
};

// 5. Audio Transcription (gemini-3-flash-preview)
export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  try {
    const data = base64Audio.split(',')[1] || base64Audio;

    const response = await ai.models.generateContent({
      // Fixed: Replaced unlisted/prohibited model with gemini-3-flash-preview
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data } },
          { text: "Please transcribe this audio." }
        ]
      }
    });
    // Fixed: Use .text property directly
    return response.text || "No transcription generated.";
  } catch (error) {
    console.error("Gemini Audio Transcription Error:", error);
    return "Error transcribing audio.";
  }
};

// 6. Thinking Mode (gemini-3-pro-preview with max budget)
export const generateThinkingResponse = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }
      }
    });
    // Fixed: Use .text property directly
    return response.text || "No response generated.";
  } catch (error) {
    console.error("Gemini Thinking Mode Error:", error);
    return "Error in thinking process.";
  }
};
