import { GeneratedVariant } from "../types";

export const generateStatusText = async (theme: string): Promise<GeneratedVariant[]> => {
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ theme })
    });

    const data = await res.json();

    if (!res.ok) {
      if (data && data.error) {
        throw new Error(data.error);
      }
      throw new Error(`Server returned ${res.status}`);
    }

    return data;

  } catch (error: any) {
    console.error("Fetch Error:", error);
    // Fallback stub - using obviously system messages, not fake quotes
    return [
      { 
        id: 'err-1', tone: 'SISTEMA', text: `${error.message || 'ERRO DE CONEXÃO.'}\n— Tente Novamente`, font: 'font-mono', 
        paletteName: 'ERROR', alignment: 'text-left', fontSize: 40, hasNoise: true, uppercase: true 
      }
    ];
  }
};