import { GoogleGenAI, Type } from "@google/genai";
import { FloorPlan3D } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const analyzeFloorPlan = async (base64Image: string): Promise<FloorPlan3D> => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Analyze this floor plan image and convert it into a structured 3D model representation. 
  Identify rooms, their names, their approximate coordinates (in meters, relative to a center), and their heights (assume 2.7m if not specified).
  Return a JSON object matching the FloorPlan3D interface.
  Focus on accuracy of the layout.`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/png", data: base64Image.split(",")[1] || base64Image } }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          rooms: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                points: { 
                  type: Type.ARRAY, 
                  items: { 
                    type: Type.ARRAY, 
                    items: { type: Type.NUMBER },
                    minItems: 2,
                    maxItems: 2
                  } 
                },
                height: { type: Type.NUMBER },
                area: { type: Type.NUMBER },
                volume: { type: Type.NUMBER }
              },
              required: ["id", "name", "points", "height", "area", "volume"]
            }
          },
          walls: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                start: { type: Type.ARRAY, items: { type: Type.NUMBER }, minItems: 2, maxItems: 2 },
                end: { type: Type.ARRAY, items: { type: Type.NUMBER }, minItems: 2, maxItems: 2 },
                height: { type: Type.NUMBER },
                thickness: { type: Type.NUMBER }
              },
              required: ["start", "end", "height", "thickness"]
            }
          }
        },
        required: ["rooms", "walls"]
      }
    }
  });

  return JSON.parse(response.text || "{}") as FloorPlan3D;
};

export const chatWithModel = async (
  query: string, 
  floorPlan: FloorPlan3D, 
  history: { role: "user" | "model"; parts: { text: string }[] }[]
) => {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `You are an expert architectural engineer specializing in HVAC (climatização), thermal comfort, and acoustics.
  You have access to the 3D geometry of a floor plan: ${JSON.stringify(floorPlan)}.
  
  Your tasks:
  1. Answer questions about the geometry (areas, volumes).
  2. Calculate HVAC requirements (BTUs). Use standard formulas (e.g., 600-800 BTU per m² depending on usage).
  3. Provide thermal comfort advice based on room volumes and typical materials.
  4. Provide acoustic analysis (reverberation time estimates using Sabine's formula if possible, or general advice).
  
  Be precise, technical yet accessible, and professional.`;

  const chat = ai.chats.create({
    model,
    config: {
      systemInstruction,
    }
  });

  const response = await chat.sendMessage({ message: query });
  return response.text;
};
