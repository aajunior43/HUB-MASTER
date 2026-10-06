import { PromptOptions } from './types';

export const PROMPT_OPTIONS: PromptOptions = {
  style: [
    "Photorealistic", "Oil Painting", "Watercolor", "Anime", "Concept Art", 
    "Cyberpunk", "Steampunk", "Fantasy", "Sci-Fi", "Abstract", "Minimalist", 
    "Impressionism", "Surrealism", "Pop Art", "Art Nouveau", "Low Poly",
    "Pixel Art", "3D Render", "Gothic", "Art Deco", "Bauhaus"
  ],
  artist: [
    "Greg Rutkowski", "Artgerm", "Alphonse Mucha", "H.R. Giger", "Hayao Miyazaki", 
    "Vincent van Gogh", "Salvador Dalí", "Frida Kahlo", "Banksy", "Claude Monet",
    "James Jean", "WLOP"
  ],
  lighting: [
    "Cinematic", "Golden Hour", "Blue Hour", "Dramatic", "Soft Light", "Studio Lighting",
    "Backlight", "Rim Lighting", "Neon", "Volumetric", "Natural Light", "Chiaroscuro"
  ],
  composition: [
    "Close-Up", "Medium Shot", "Full Shot", "Wide Angle", "Dutch Angle", 
    "Low Angle", "High Angle", "Symmetrical", "Rule of Thirds", "Leading Lines",
    "Bird's-Eye View", "Worm's-Eye View"
  ],
  mood: [
    "Serene", "Melancholic", "Energetic", "Mysterious", "Cheerful", "Ominous",
    "Dreamy", "Nostalgic", "Epic", "Whimsical", "Romantic", "Chaotic"
  ],
  details: [
    "Hyperdetailed", "Intricate", "4K", "8K", "Sharp Focus", "Depth of Field",
    "Ray Tracing", "Vivid Colors", "Monochromatic", "Highly Detailed", 
    "Trending on Artstation", "Unreal Engine"
  ]
};