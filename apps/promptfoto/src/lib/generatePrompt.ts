import type { EditFormData } from "@/components/EditForm";

const styleMap: Record<string, string> = {
  realistic: "photorealistic, ultra high resolution, sharp focus, lifelike details",
  cinematic: "cinematic lighting, film grain, dramatic atmosphere, movie still quality, anamorphic lens feel",
  editorial: "high fashion editorial, professional photography, magazine cover quality, Vogue aesthetic",
  artistic: "artistic painterly style, fine art photography, gallery worthy",
  vintage: "vintage film aesthetic, retro color grading, analog photography feel, nostalgic atmosphere",
  minimalist: "clean minimalist composition, simple and elegant, negative space",
  dramatic: "dramatic high-contrast, bold shadows, intense atmosphere, powerful visual impact",
  ethereal: "ethereal dreamy atmosphere, soft glow, angelic quality, otherworldly beauty",
  noir: "film noir aesthetic, high contrast black and white undertones, mysterious shadows",
  glamour: "classic Hollywood glamour, golden age of cinema, timeless elegance",
  documentary: "documentary style, authentic and raw, candid moment captured",
  fashion: "high fashion photography, runway quality, avant-garde styling",
  surreal: "surrealist art style, dreamlike impossible scenes, Salvador Dali inspired",
  anime: "anime manga art style, cel shading, vibrant Japanese animation aesthetic",
  watercolor: "digital watercolor painting, soft color bleeds, artistic brush strokes",
  oil_painting: "oil painting style, thick brush strokes, classical fine art, museum quality",
  pop_art: "pop art style, bold colors, comic book aesthetic, Andy Warhol inspired",
  cyberpunk: "cyberpunk aesthetic, neon lights, futuristic tech, dystopian urban",
  fantasy: "epic fantasy art, magical atmosphere, enchanted lighting, otherworldly",
  steampunk: "steampunk aesthetic, Victorian industrial, brass gears, clockwork machinery, retro-futuristic",
  art_deco: "Art Deco style, geometric patterns, gold and black, 1920s glamour, Great Gatsby aesthetic",
  gothic: "gothic dark aesthetic, ornate architecture, moody atmosphere, dark romanticism",
  vaporwave: "vaporwave aesthetic, pink and cyan, 90s nostalgia, glitch art, retro digital",
  retro_80s: "1980s retro style, synthwave colors, neon grid, VHS aesthetic, Miami Vice",
  pixel_art: "pixel art style, 8-bit retro gaming aesthetic, pixelated",
  comic_book: "comic book illustration, bold ink lines, halftone dots, speech bubbles, Marvel DC style",
  impressionist: "impressionist painting style, visible brush strokes, light play, Monet Renoir inspired",
  baroque: "baroque art style, dramatic chiaroscuro, ornate details, Caravaggio inspired, opulent",
  grunge: "grunge aesthetic, dirty textures, raw urban decay, 90s alternative culture",
  pastel_goth: "pastel goth aesthetic, soft pastel colors with dark elements, kawaii meets gothic",
  dark_academia: "dark academia aesthetic, old books, warm lamplight, scholarly atmosphere, Oxford vibes",
  cottagecore: "cottagecore aesthetic, pastoral countryside, wildflowers, rustic charm, cozy warmth",
  afrofuturism: "afrofuturist aesthetic, African cultural elements with sci-fi technology, vibrant patterns",
  "3d_render": "3D rendered, CGI quality, volumetric lighting, ray tracing, Octane render quality",
  sketch: "pencil sketch style, hand-drawn, graphite on paper, artistic line work",
  collage: "artistic collage style, mixed media, paper cutouts, layered textures",
  low_poly: "low poly 3D art style, geometric facets, clean edges, modern digital art",
  glitch_art: "glitch art aesthetic, digital distortion, data corruption, RGB shift, broken pixels",
  art_nouveau: "Art Nouveau style, organic flowing lines, floral motifs, Alphonse Mucha inspired",
  brutalist: "brutalist aesthetic, raw concrete, bold geometric forms, stark minimalism",
};

const moodMap: Record<string, string> = {
  warm: "warm inviting atmosphere, cozy and welcoming",
  cold: "cold distant atmosphere, icy blue undertones",
  romantic: "romantic dreamy mood, soft and intimate",
  mysterious: "mysterious intriguing atmosphere, enigmatic presence",
  energetic: "energetic dynamic mood, vibrant and alive",
  calm: "calm serene atmosphere, peaceful and tranquil",
  melancholic: "melancholic thoughtful mood, introspective",
  powerful: "powerful commanding presence, strong and confident",
  dreamy: "dreamy ethereal quality, soft focus dreamscape",
  edgy: "edgy bold aesthetic, unconventional and daring",
  nostalgic: "nostalgic wistful mood, longing for the past, sentimental warmth",
  hopeful: "hopeful luminous atmosphere, uplifting and optimistic, warm light breaking through",
  dark: "dark ominous mood, deep shadows, foreboding atmosphere",
  whimsical: "whimsical fantastical mood, playful imagination, fairy tale quality",
  epic: "epic grandiose atmosphere, awe-inspiring scale, majestic",
  intimate: "intimate personal mood, close and vulnerable, private moment",
  eerie: "eerie unsettling atmosphere, uncanny valley, subtle wrongness",
  playful: "playful lighthearted mood, fun and spontaneous, joy",
  rebellious: "rebellious provocative mood, defiant and bold, counter-culture",
  sophisticated: "sophisticated refined atmosphere, cultured elegance, understated luxury",
  raw: "raw unfiltered mood, authentic grit, unpolished truth",
  euphoric: "euphoric intense mood, overwhelming joy, peak emotion, ecstatic energy",
};

const lightingMap: Record<string, string> = {
  natural: "natural daylight, soft ambient light",
  golden_hour: "golden hour warm sunlight, long soft shadows, warm golden tones",
  blue_hour: "blue hour lighting, cool twilight tones, magical atmosphere",
  studio: "professional studio lighting, controlled light setup, three-point lighting",
  dramatic: "dramatic chiaroscuro lighting, strong contrast between light and shadow, Rembrandt-style",
  soft: "soft diffused lighting, gentle and even illumination, flattering light",
  hard: "hard directional light, sharp defined shadows, bold contrast",
  rim: "rim lighting, glowing edges, backlit silhouette effect",
  neon: "neon-lit, colorful ambient lighting, vibrant cyberpunk glow",
  candlelight: "warm candlelight, intimate flickering glow, romantic atmosphere",
  overcast: "overcast soft light, even diffused illumination, no harsh shadows",
  keep: "preserve the original lighting conditions exactly",
  fluorescent: "fluorescent lighting, slightly greenish cast, institutional feel",
  moonlight: "moonlight illumination, soft silver glow, nocturnal atmosphere",
  fire: "firelight, warm flickering orange glow, dancing shadows, primal warmth",
  underwater_light: "underwater caustic lighting, dappled blue-green light patterns",
  bioluminescent: "bioluminescent glow, organic light sources, Avatar-inspired ethereal luminescence",
  volumetric: "volumetric lighting, visible light rays, god rays, atmospheric depth",
};

const lightingDirectionMap: Record<string, string> = {
  front: "frontal lighting, even illumination on face",
  side: "side lighting at 45 degrees, sculpting shadows",
  rembrandt: "Rembrandt lighting, triangular shadow on cheek",
  split: "split lighting, half face in shadow",
  butterfly: "butterfly/paramount lighting, shadow under nose",
  back: "backlighting, silhouette effect with rim light",
  loop: "loop lighting, small shadow from nose to cheek",
  top: "top-down lighting, overhead illumination",
  bottom: "under-lighting, eerie upward shadows, horror style",
  kicker: "kicker light from three-quarter behind, subtle edge definition",
};

const realismMap: Record<string, string> = {
  ultra: "ultra-realistic, indistinguishable from professional photograph, 8K resolution, extreme detail",
  high: "highly realistic, professional photography quality, crisp details",
  medium: "semi-realistic with artistic enhancement",
  stylized: "stylized artistic interpretation while maintaining recognizable features",
  hyper: "hyper-realistic, beyond photography, perfect skin and details",
  abstract: "abstract artistic interpretation, non-literal representation",
  cartoon: "cartoon illustration style, exaggerated features, clean lines",
};

const colorToneMap: Record<string, string> = {
  natural: "natural balanced colors, true to life",
  warm_orange: "warm orange tones, sunset warmth",
  warm_gold: "golden warm tones, luxurious feel",
  cool_blue: "cool blue tones, crisp and clean",
  teal_orange: "teal and orange color grading, cinematic blockbuster look",
  desaturated: "desaturated muted colors, subtle and understated",
  vibrant: "vibrant saturated colors, punchy and bold",
  pastel: "soft pastel tones, gentle and delicate",
  moody: "moody low-key colors, atmospheric and intense",
  sepia: "sepia toned, vintage warmth",
  bw: "black and white, high contrast monochrome",
  neon_colors: "neon fluorescent colors, electric vibrant hues, glowing",
  earth_tones: "earth tones, natural browns greens ochres, organic warmth",
  jewel_tones: "jewel tones, rich deep emerald ruby sapphire, luxurious saturation",
  muted: "muted subdued colors, faded elegance, quiet sophistication",
  high_contrast: "high contrast vivid colors, stark dramatic difference",
  duotone_color: "duotone color scheme, two-color harmony, graphic design feel",
};

const bgMap: Record<string, string> = {
  keep: "keep the original background exactly as is",
  studio_white: "clean white studio background, high-key setup",
  studio_black: "deep black studio background, low-key setup",
  studio_gray: "neutral gray studio backdrop, professional portrait setting",
  gradient: "soft gradient background, smooth color transition",
  blur: "background with natural bokeh blur, subject isolation",
  nature: "natural outdoor environment, organic setting",
  urban: "urban cityscape background, modern metropolitan setting",
  interior: "elegant interior setting, sophisticated architecture",
  abstract_bg: "abstract artistic background, painterly textures and colors",
  textured_wall: "textured wall background, rustic brick or concrete surface",
  neon_bg: "neon lights background, colorful glowing tubes and signs",
  space: "outer space background, galaxies stars nebula, cosmic setting",
  custom: "",
};

const cameraAngleMap: Record<string, string> = {
  eye_level: "eye level shot, natural perspective",
  low: "low angle shot, heroic powerful perspective",
  high: "high angle shot, looking down",
  dutch: "dutch angle, tilted dramatic perspective",
  birds_eye: "bird's eye view, overhead perspective",
  worms_eye: "worm's eye view, extreme low angle",
  over_head: "overhead flat lay perspective, directly above",
  pov: "first person POV shot, through the eyes perspective",
};

const lensMap: Record<string, string> = {
  "14mm": "shot on 14mm ultra wide angle lens, dramatic distortion, immersive perspective",
  "24mm": "shot on 24mm wide angle, environmental portrait",
  "35mm": "shot on 35mm lens, versatile natural perspective",
  "50mm": "shot on 50mm lens, natural human eye perspective",
  "85mm": "shot on 85mm portrait lens, flattering compression, beautiful bokeh",
  "135mm": "shot on 135mm lens, strong compression, dreamy background separation",
  "200mm": "shot on 200mm telephoto, extreme background compression",
  "400mm": "shot on 400mm super telephoto, extreme compression and isolation",
  macro: "macro lens detail, extreme close-up clarity",
  fisheye: "fisheye lens, extreme barrel distortion, 180° field of view",
  tilt_shift_lens: "tilt-shift lens, selective focus plane, miniature effect",
  anamorphic: "anamorphic cinema lens, oval bokeh, horizontal lens flares, widescreen feel",
};

const depthMap: Record<string, string> = {
  very_shallow: "extremely shallow depth of field f/1.2, razor thin focus plane",
  shallow: "shallow depth of field f/1.4, creamy bokeh, strong subject separation",
  moderate: "moderate depth of field f/2.8, balanced focus",
  deep: "deep depth of field f/8, everything in sharp focus",
  infinite: "infinite depth of field f/16, landscape photography, everything tack sharp",
};

const skinMap: Record<string, string> = {
  natural: "natural skin texture with pores and details visible, realistic",
  smooth: "slightly smoothed skin, subtle retouching while keeping texture",
  porcelain: "porcelain smooth skin, beauty retouching",
  matte: "matte skin finish, no shine or oiliness",
  dewy: "dewy glowing skin, healthy luminous finish",
  tanned: "sun-kissed tanned skin, warm bronze tones",
  freckled: "freckled skin, visible natural freckles, charming detail",
  aged: "aged skin with wrinkles and character lines, dignified maturity",
  wet: "wet skin with water droplets, glistening surface, fresh",
  glitter: "skin with glitter and shimmer, sparkling highlight, editorial glam",
};

const expressionMap: Record<string, string> = {
  keep: "preserve original expression",
  smile: "natural genuine smile, warm and approachable",
  serious: "serious neutral expression, composed and focused",
  confident: "confident powerful expression, self-assured",
  mysterious: "mysterious enigmatic look, intriguing gaze",
  joyful: "joyful radiant expression, genuine happiness",
  pensive: "pensive thoughtful expression, introspective mood",
  seductive: "seductive alluring expression, captivating gaze",
  fierce: "fierce intense expression, powerful stare",
  surprised: "surprised wide-eyed expression, astonishment",
  angry: "angry determined expression, intense fury, clenched jaw",
  sad: "sad melancholic expression, downcast eyes, emotional depth",
  laughing: "laughing expression, open mouth joy, genuine laughter",
  stoic: "stoic impassive expression, emotionless composure",
  dreamy: "dreamy distracted expression, gazing into the distance, lost in thought",
};

const poseMap: Record<string, string> = {
  keep: "preserve original pose and position",
  portrait: "classic portrait pose, facing camera",
  three_quarter: "three-quarter turn, dynamic angle",
  profile: "profile view, side silhouette",
  over_shoulder: "looking over shoulder, intriguing angle",
  dynamic: "dynamic action pose, movement and energy",
  candid: "candid natural pose, unposed authentic moment",
  editorial: "editorial fashion pose, high fashion styling",
  sitting: "sitting pose, relaxed and natural",
  leaning: "leaning against surface, casual cool stance",
  walking: "walking in motion, natural stride captured",
  dancing: "dancing pose, graceful movement, kinetic energy",
  lying: "lying down pose, reclined and relaxed",
  crossed_arms: "arms crossed pose, confident and assertive",
  hands_in_pockets: "hands in pockets, casual relaxed stance",
};

const environmentMap: Record<string, string> = {
  indoor: "indoor setting",
  outdoor: "outdoor location",
  studio: "professional photography studio",
  beach: "beach seaside location, sand and waves",
  forest: "forest woodland setting, trees and nature",
  mountain: "mountain landscape, majestic peaks",
  city: "urban city environment, modern architecture",
  desert: "desert landscape, sand dunes",
  garden: "garden setting, flowers and greenery",
  rooftop: "rooftop location, city skyline view",
  underwater: "underwater scene, blue light, bubbles, aquatic atmosphere",
  castle: "grand castle or palace interior, ornate architecture, regal atmosphere",
  cafe: "cozy café or restaurant, warm ambient lighting, intimate setting",
  library: "elegant library, bookshelves, warm reading light, intellectual atmosphere",
  ruins: "abandoned ruins, decayed architecture, moody and atmospheric",
  snow: "snowy winter landscape, white powder, frost-covered scenery",
  neon_city: "neon-lit nighttime city, reflections on wet streets, cyberpunk vibe",
  space_station: "space station interior, futuristic panels, zero gravity feel, sci-fi",
  temple: "ancient temple or sanctuary, spiritual atmosphere, ornate carvings",
  market: "bustling market or bazaar, colorful stalls, lively atmosphere",
  train_station: "vintage train station, iron and glass architecture, departure mood",
  greenhouse: "greenhouse botanical garden, lush tropical plants, humid warm light",
  museum: "museum or art gallery, white walls, curated space, cultural atmosphere",
  concert: "concert or music venue, stage lights, energetic crowd atmosphere",
  gym: "gym or fitness studio, motivational atmosphere, modern equipment",
  pool: "swimming pool, turquoise water reflections, summer leisure",
  vineyard: "vineyard setting, rolling hills, grapevines, Tuscan countryside feel",
  bamboo_forest: "bamboo forest, tall green stalks, dappled light, zen atmosphere",
  lavender_field: "lavender field, purple rows stretching to horizon, Provence feel",
  ice_cave: "ice cave, translucent blue ice, frozen crystal formations",
  volcano: "volcanic landscape, lava glow, dramatic geological setting",
};

const weatherMap: Record<string, string> = {
  clear: "clear sunny weather, bright daylight",
  cloudy: "partly cloudy sky, diffused sunlight",
  overcast: "overcast sky, soft even light",
  rainy: "rainy weather, wet surfaces and droplets",
  foggy: "foggy misty atmosphere, ethereal haze",
  snowy: "snowy winter scene, white powder",
  stormy: "stormy dramatic sky, intense atmosphere",
  windy: "windy conditions, hair and fabric movement, dynamic energy",
  hazy: "hazy atmospheric conditions, soft diffused light, dreamy distance",
  aurora: "aurora borealis, northern lights, colorful sky curtains, magical",
  na: "",
};

const timeMap: Record<string, string> = {
  dawn: "dawn early morning light, soft pink and orange hues",
  morning: "morning daylight, fresh and bright",
  noon: "midday sun, bright overhead light",
  afternoon: "afternoon light, warm angled sun, relaxed mood",
  golden: "golden hour light, warm magical glow",
  sunset: "sunset light, rich orange and purple sky",
  blue: "blue hour twilight, cool magical tones",
  twilight: "twilight sky, deep purple and blue, first stars visible",
  night: "nighttime, artificial and ambient lighting",
  midnight: "midnight darkness, minimal light, mysterious deep shadows",
  studio: "studio lighting, controlled timeless setup",
};

const postProcessingMap: Record<string, string> = {
  bokeh: "beautiful bokeh background blur",
  grain: "subtle film grain texture",
  vignette: "gentle vignette around edges",
  hdr: "HDR dynamic range enhancement",
  sharpening: "enhanced sharpness and clarity",
  color_grade: "professional cinematic color grading",
  lens_flare: "artistic lens flare elements",
  chromatic: "subtle chromatic aberration for realism",
  glow: "soft dreamy glow effect, ethereal light bloom",
  halation: "film halation effect, warm light bleed around highlights",
  double_exposure: "double exposure blending effect, artistic overlay",
  tilt_shift: "tilt-shift miniature effect, selective focus plane",
  motion_blur: "artistic motion blur, sense of movement and dynamism",
  light_leaks: "vintage light leaks, warm color bleeds from film edges",
  sun_rays: "visible sun rays, god rays, volumetric light beams",
  dust_particles: "floating dust particles in light, atmospheric depth",
  prism: "prismatic rainbow effect, light refraction, spectral colors",
  smoke: "atmospheric smoke or haze, mysterious depth layers",
  sparkles: "sparkling highlights, glinting light points, magical shimmer",
  reflection: "water or mirror reflections, duplicated imagery",
  long_exposure: "long exposure effect, smooth water or light trails",
  cross_process: "cross-processed colors, unexpected color shifts, experimental",
  infrared: "infrared photography effect, white foliage, surreal colors",
  cyanotype: "cyanotype blue monochrome, photographic printing process look",
  duotone: "duotone effect, two-color tonal range",
  split_tone: "split toning, different colors in highlights and shadows",
  posterize: "posterization effect, reduced color levels, graphic look",
  solarize: "solarization effect, inverted tones, Man Ray inspired",
};

const compositionMap: Record<string, string> = {
  rule_of_thirds: "rule of thirds composition, subject placed at intersection points",
  centered: "centered composition, symmetrical framing, subject in middle",
  golden_ratio: "golden ratio composition, fibonacci spiral, naturally pleasing placement",
  symmetrical: "perfectly symmetrical composition, mirror-like balance",
  asymmetrical: "asymmetrical composition, dynamic visual tension, off-center interest",
  diagonal: "diagonal composition, dynamic lines creating energy and movement",
  leading_lines: "leading lines composition, converging lines drawing eye to subject",
  frame_within: "frame within a frame, natural framing elements, layered depth",
  negative_space: "negative space composition, minimalist surrounding, emphasis on subject",
  filling: "fill the frame composition, tight crop, maximum subject presence",
};

const framingMap: Record<string, string> = {
  extreme_closeup: "extreme close-up shot, detail of eyes or specific feature",
  closeup: "close-up shot, face filling the frame",
  medium_closeup: "medium close-up, head and shoulders visible",
  medium: "medium shot, waist up visible",
  medium_full: "medium full shot, cowboy shot, knees up",
  full: "full body shot, entire figure visible",
  wide: "wide shot, subject with surrounding environment",
  extreme_wide: "extreme wide shot, vast landscape with small subject",
};

const aspectRatioMap: Record<string, string> = {
  "1:1": "1:1 square format",
  "4:5": "4:5 vertical portrait format",
  "3:4": "3:4 classic portrait format",
  "2:3": "2:3 35mm film portrait format",
  "9:16": "9:16 vertical mobile format, stories and reels",
  "3:2": "3:2 classic 35mm landscape format",
  "4:3": "4:3 classic landscape format",
  "16:9": "16:9 widescreen cinematic format",
  "21:9": "21:9 ultra widescreen format",
  "2.35:1": "2.35:1 anamorphic cinemascope format",
};

const intensityMap: Record<string, string> = {
  subtle: "apply changes subtly and delicately, barely noticeable enhancements, denoising strength 0.2-0.3",
  light: "apply light changes, gentle adjustments, denoising strength 0.3-0.4",
  moderate: "apply moderate changes, clearly visible but natural, denoising strength 0.4-0.6",
  strong: "apply strong transformative changes, significant visual impact, denoising strength 0.6-0.8",
  extreme: "apply extreme transformation, dramatic overhaul, denoising strength 0.8-1.0",
};

const filmStockMap: Record<string, string> = {
  none: "",
  portra_400: "shot on Kodak Portra 400, warm skin tones, subtle pastel colors, fine grain",
  portra_800: "shot on Kodak Portra 800, warm tones, slightly grainier, great in low light",
  ektar_100: "shot on Kodak Ektar 100, vivid saturated colors, ultra fine grain, high contrast",
  gold_200: "shot on Kodak Gold 200, warm yellowish tones, consumer film aesthetic, nostalgic",
  tri_x: "shot on Kodak Tri-X 400, classic black and white, beautiful grain, timeless contrast",
  superia_400: "shot on Fuji Superia 400, cool green tones, everyday film look, natural colors",
  pro_400h: "shot on Fuji Pro 400H, soft pastel colors, low contrast, beautiful skin tones",
  velvia_50: "shot on Fuji Velvia 50, extreme color saturation, vivid landscapes, punchy contrast",
  cinestill_800t: "shot on CineStill 800T, tungsten balanced, halation around highlights, cinematic red glow",
  ilford_hp5: "shot on Ilford HP5 Plus, classic B&W, medium grain, versatile contrast",
  ilford_delta: "shot on Ilford Delta 3200, high ISO B&W, pronounced grain, night photography",
  polaroid: "shot on Polaroid instant film, square format, faded colors, white border, retro charm",
  lomography: "shot on Lomography film, light leaks, vignetting, oversaturated, experimental lo-fi",
};

const artMediumMap: Record<string, string> = {
  photography: "professional photography",
  digital_art: "digital art, created digitally, clean rendering",
  "3d_render": "3D rendered, CGI, volumetric lighting, ray tracing, photorealistic render",
  oil_canvas: "oil painting on canvas, visible brushwork, rich pigments, museum quality",
  watercolor_paper: "watercolor on textured paper, soft color bleeds, delicate washes",
  charcoal: "charcoal drawing, dramatic black marks, smudged gradients, raw texture",
  pencil: "pencil drawing, fine graphite lines, detailed hatching, sketch quality",
  pastel_medium: "soft pastel on paper, powdery texture, vibrant pigments, blended tones",
  ink: "ink illustration, bold black lines, cross-hatching, woodcut quality",
  acrylic: "acrylic painting, bold flat colors, modern art feel, textured surface",
  mixed_media: "mixed media artwork, collage elements, varied textures, experimental composition",
  sculpture: "digital sculpture, three-dimensional form, dramatic lighting on form",
  embroidery: "embroidery art style, thread texture, needlework patterns, textile art",
  mosaic: "mosaic art style, small tile pieces, Byzantine inspired, fragmented beauty",
};

const colorSchemeMap: Record<string, string> = {
  monochromatic: "monochromatic color scheme, single hue variations, elegant simplicity",
  complementary: "complementary colors, opposite hues for vibrant contrast and energy",
  analogous: "analogous color harmony, adjacent hues, smooth harmonious palette",
  triadic: "triadic color scheme, three evenly spaced hues, vibrant and balanced",
  split_comp: "split complementary colors, nuanced contrast, sophisticated palette",
  warm_palette: "warm color palette, reds oranges yellows, cozy inviting tones",
  cool_palette: "cool color palette, blues greens purples, calm serene tones",
  rainbow: "full spectrum rainbow colors, all hues represented, maximalist color",
};

const textureMap: Record<string, string> = {
  smooth_tex: "smooth clean texture, polished finish, no visible grain or noise",
  grainy: "grainy film texture, visible noise, analog photography feel",
  rough: "rough textured surface, gritty tactile quality",
  paper: "paper texture overlay, subtle fiber pattern, handmade quality",
  canvas_tex: "canvas texture, woven fabric pattern, painterly surface",
  fabric: "fabric texture, textile weave pattern, soft material quality",
  metallic: "metallic texture, reflective sheen, brushed metal quality",
  glass: "glass-like texture, transparent reflective, crystalline clarity",
  organic: "organic natural texture, wood grain or stone pattern, earth element",
};

const resolutionMap: Record<string, string> = {
  sd: "512x512 resolution, standard definition",
  hd: "1024x1024 resolution, high definition, detailed",
  full_hd: "1920x1080 full HD resolution, widescreen detailed",
  "2k": "2K resolution, 2048x2048, very detailed",
  "4k": "4K ultra high resolution, 4096x4096, extremely detailed, sharp",
  "8k": "8K resolution, maximum detail, every pore and texture visible, ultra sharp",
};

const makeupMap: Record<string, string> = {
  keep: "preserve original makeup",
  natural: "no makeup, bare natural face",
  light: "light natural makeup, barely-there enhancement",
  glamorous: "full glamorous makeup, contoured, highlighted, dramatic lashes",
  smokey: "smokey eye makeup, dark eyeshadow, sultry and dramatic",
  editorial_mk: "editorial avant-garde makeup, artistic bold colors, creative expression",
  gothic: "gothic dark makeup, black lips, pale foundation, dramatic dark eyes",
  avant_garde: "avant-garde makeup, unconventional colors and shapes, artistic statement",
  dewy_mk: "dewy glowing makeup, luminous skin, glass skin effect",
  retro_mk: "retro vintage makeup, pin-up style, red lips, winged eyeliner",
  bold_lips: "bold red lips, classic glamour, statement lip color",
  no_makeup: "completely bare face, no makeup at all, natural skin",
};

const lightColorMap: Record<string, string> = {
  white: "white neutral light temperature",
  warm_light: "warm yellowish light, tungsten warmth",
  cool_light: "cool bluish light, daylight balance",
  red_light: "red colored light, dramatic crimson illumination",
  blue_light: "blue colored light, cold electric illumination",
  purple_light: "purple lilac colored light, mystical violet illumination",
  green_light: "green colored light, otherworldly emerald glow",
  orange_light: "orange colored light, warm amber glow",
  pink_light: "pink colored light, soft rose illumination",
  mixed_light: "mixed multicolored lighting, rainbow of light sources",
};

const shadowStyleMap: Record<string, string> = {
  soft_shadow: "soft diffused shadows, gentle gradation, flattering",
  hard_shadow: "hard sharp shadows, defined edges, bold contrast",
  minimal_shadow: "minimal shadows, even illumination, flat lighting",
  dramatic_shadow: "deep dramatic shadows, noir-like darkness, strong contrast",
  colored_shadow: "colored shadows, chromatic shadow play, artistic illumination",
  long_shadow: "long elongated shadows, low angle light source, dramatic stretch",
  ambient_shadow: "ambient natural shadows, realistic environmental shading",
};

const seasonMap: Record<string, string> = {
  spring: "spring season, blooming flowers, fresh green leaves, renewal atmosphere",
  summer: "summer season, bright sun, lush greenery, warm vibrant energy",
  autumn: "autumn season, golden and red leaves, warm earthy tones, harvest mood",
  winter: "winter season, bare trees, cold atmosphere, possible frost or snow",
};

const negativePresetMap: Record<string, string> = {
  deformed: "deformed features, distorted anatomy, malformed body parts",
  blurry: "blurry, out of focus, motion blur where not intended",
  watermark: "watermark, text overlay, signature, copyright notice, logo",
  oversaturated: "oversaturated, garish colors, neon skin, unnatural color cast",
  plastic_skin: "plastic skin, artificial look, wax figure, mannequin",
  bad_hands: "mutated hands, extra fingers, fused fingers, malformed hands",
  bad_eyes: "irregular eyes, crossed eyes, different sized eyes, wall-eyed",
  bad_teeth: "bad teeth, extra teeth, missing teeth, deformed mouth",
  cropped: "cropped, cut off, missing body parts, edge artifacts",
  low_quality: "low quality, jpeg artifacts, pixelated, compression artifacts",
  noise: "excessive digital noise, banding, color noise, grain where unwanted",
  cartoon: "cartoon style, illustrated, non-photographic, animated look",
  anime_style: "anime style, manga, cel-shaded, Japanese animation",
  extra_fingers: "extra fingers, too many fingers, six fingers, polydactyly",
};

export function generatePrompt(data: EditFormData): {
  prompt: string;
  negativePrompt: string;
  tips: string[];
} {
  const parts: string[] = [];

  // Opening
  parts.push(
    "Edit the uploaded reference image with the following precise modifications while preserving identity and key features:\n"
  );

  // Modifications
  if (data.changes) {
    parts.push(`\nMODIFICATIONS REQUIRED:\n${data.changes}`);
  }

  // Preserve
  if (data.preserve) {
    parts.push(`\nMUST PRESERVE EXACTLY: ${data.preserve}`);
  }

  // Intensity
  if (data.intensity && intensityMap[data.intensity]) {
    parts.push(`\nEDIT INTENSITY: ${intensityMap[data.intensity]}`);
  }

  // Expression and pose
  const subjectDetails: string[] = [];
  if (data.expression && expressionMap[data.expression]) {
    subjectDetails.push(expressionMap[data.expression]);
  }
  if (data.pose && poseMap[data.pose]) {
    subjectDetails.push(poseMap[data.pose]);
  }
  if (data.skinTexture && skinMap[data.skinTexture]) {
    subjectDetails.push(skinMap[data.skinTexture]);
  }
  if (data.hairStyle) {
    subjectDetails.push(`hair: ${data.hairStyle}`);
  }
  if (data.makeup && makeupMap[data.makeup]) {
    subjectDetails.push(makeupMap[data.makeup]);
  }
  if (data.accessories) {
    subjectDetails.push(`accessories: ${data.accessories}`);
  }
  if (data.props) {
    subjectDetails.push(`props in scene: ${data.props}`);
  }
  if (subjectDetails.length > 0) {
    parts.push(`\nSUBJECT DETAILS: ${subjectDetails.join(", ")}`);
  }

  // Clothing
  if (data.clothing) {
    parts.push(`\nCLOTHING & ACCESSORIES: ${data.clothing}`);
  }

  // Style and mood
  const styleDetails: string[] = [];
  if (data.style && styleMap[data.style]) {
    styleDetails.push(styleMap[data.style]);
  }
  if (data.mood && moodMap[data.mood]) {
    styleDetails.push(moodMap[data.mood]);
  }
  if (data.realism && realismMap[data.realism]) {
    styleDetails.push(realismMap[data.realism]);
  }
  if (data.colorTone && colorToneMap[data.colorTone]) {
    styleDetails.push(colorToneMap[data.colorTone]);
  }
  if (data.artMedium && artMediumMap[data.artMedium]) {
    styleDetails.push(artMediumMap[data.artMedium]);
  }
  if (data.filmStock && filmStockMap[data.filmStock]) {
    styleDetails.push(filmStockMap[data.filmStock]);
  }
  if (data.colorScheme && colorSchemeMap[data.colorScheme]) {
    styleDetails.push(colorSchemeMap[data.colorScheme]);
  }
  if (data.texture && textureMap[data.texture]) {
    styleDetails.push(textureMap[data.texture]);
  }
  if (styleDetails.length > 0) {
    parts.push(`\nSTYLE & QUALITY: ${styleDetails.join(", ")}`);
  }

  // Lighting
  const lightDetails: string[] = [];
  if (data.lighting && lightingMap[data.lighting]) {
    lightDetails.push(lightingMap[data.lighting]);
  }
  if (data.lightingDirection && lightingDirectionMap[data.lightingDirection]) {
    lightDetails.push(lightingDirectionMap[data.lightingDirection]);
  }
  if (data.lightColor && lightColorMap[data.lightColor]) {
    lightDetails.push(lightColorMap[data.lightColor]);
  }
  if (data.shadowStyle && shadowStyleMap[data.shadowStyle]) {
    lightDetails.push(shadowStyleMap[data.shadowStyle]);
  }
  if (lightDetails.length > 0) {
    parts.push(`\nLIGHTING: ${lightDetails.join(", ")}`);
  }

  // Camera
  const cameraDetails: string[] = [];
  if (data.cameraAngle && cameraAngleMap[data.cameraAngle]) {
    cameraDetails.push(cameraAngleMap[data.cameraAngle]);
  }
  if (data.cameraLens && lensMap[data.cameraLens]) {
    cameraDetails.push(lensMap[data.cameraLens]);
  }
  if (data.depth && depthMap[data.depth]) {
    cameraDetails.push(depthMap[data.depth]);
  }
  if (data.framing && framingMap[data.framing]) {
    cameraDetails.push(framingMap[data.framing]);
  }
  if (data.composition && compositionMap[data.composition]) {
    cameraDetails.push(compositionMap[data.composition]);
  }
  if (data.aspectRatio && aspectRatioMap[data.aspectRatio]) {
    cameraDetails.push(aspectRatioMap[data.aspectRatio]);
  }
  if (cameraDetails.length > 0) {
    parts.push(`\nCAMERA & COMPOSITION: ${cameraDetails.join(", ")}`);
  }

  // Resolution
  if (data.resolution && resolutionMap[data.resolution]) {
    parts.push(`\nRESOLUTION: ${resolutionMap[data.resolution]}`);
  }

  // Environment
  const envDetails: string[] = [];
  if (data.background && bgMap[data.background]) {
    if (data.background === "custom" && data.backgroundDescription) {
      envDetails.push(`custom background: ${data.backgroundDescription}`);
    } else if (bgMap[data.background]) {
      envDetails.push(bgMap[data.background]);
    }
  }
  if (data.environment && environmentMap[data.environment]) {
    envDetails.push(environmentMap[data.environment]);
  }
  if (data.timeOfDay && timeMap[data.timeOfDay]) {
    envDetails.push(timeMap[data.timeOfDay]);
  }
  if (data.weather && weatherMap[data.weather]) {
    envDetails.push(weatherMap[data.weather]);
  }
  if (data.season && seasonMap[data.season]) {
    envDetails.push(seasonMap[data.season]);
  }
  if (envDetails.length > 0) {
    parts.push(`\nENVIRONMENT & SETTING: ${envDetails.join(", ")}`);
  }

  // Post processing
  if (data.postProcessing && data.postProcessing.length > 0) {
    const ppDetails = data.postProcessing
      .map((p) => postProcessingMap[p])
      .filter(Boolean);
    if (ppDetails.length > 0) {
      parts.push(`\nPOST-PROCESSING: ${ppDetails.join(", ")}`);
    }
  }

  // Extras
  if (data.extras) {
    parts.push(`\nADDITIONAL ENHANCEMENTS: ${data.extras}`);
  }

  // Closing
  parts.push(
    "\n\nMaintain facial features, skin texture, body proportions, and overall identity from the original image. Apply all changes seamlessly and naturally. Professional retouching quality."
  );

  // Negative prompt
  const negParts: string[] = [];

  // Add preset negatives
  if (data.negativePromptPreset && data.negativePromptPreset.length > 0) {
    data.negativePromptPreset.forEach((p) => {
      if (negativePresetMap[p]) {
        negParts.push(negativePresetMap[p]);
      }
    });
  }

  // Default negatives always included
  const defaultNeg = [
    "deformed features",
    "distorted face",
    "extra limbs",
    "mutated hands",
    "blurry",
    "low quality",
    "jpeg artifacts",
    "watermark",
    "text overlay",
    "unnatural skin",
    "plastic artificial look",
    "oversaturated",
    "overexposed",
    "underexposed",
    "bad anatomy",
    "wrong proportions",
  ];
  defaultNeg.forEach((n) => {
    if (!negParts.includes(n)) negParts.push(n);
  });

  if (data.preserve?.toLowerCase().includes("rosto") || data.preserve?.toLowerCase().includes("face")) {
    negParts.push("changed facial features", "different face", "altered identity", "wrong face");
  }

  if (data.negativeExtras) {
    negParts.push(data.negativeExtras);
  }

  // Tips
  const tips: string[] = [
    "Use modo img2img com denoising 0.3-0.5 para edições sutis, ou 0.6-0.8 para mudanças maiores.",
    "Para preservar identidade facial, mantenha denoising abaixo de 0.5 e use controlnet face.",
  ];

  if (data.intensity === "subtle" || data.intensity === "light") {
    tips.push("Para edições sutis, use denoising strength entre 0.2-0.4 e mantenha o CFG scale mais alto (7-12).");
  }

  if (data.background === "custom" || data.background === "change") {
    tips.push("Use inpainting com máscara no fundo para trocar cenários sem afetar o sujeito principal.");
  }

  if (data.style === "cinematic" || data.style === "noir") {
    tips.push("Para look cinematográfico, adicione granulação e ajuste curvas de cor na pós-produção.");
  }

  if (data.realism === "ultra" || data.realism === "hyper") {
    tips.push("Use modelos como SDXL, Flux ou Midjourney v6 para resultados ultra-realistas.");
  }

  if (data.postProcessing?.includes("bokeh") || data.depth === "shallow") {
    tips.push("Para bokeh natural, use ControlNet depth ou gere com modelo treinado em fotografia.");
  }

  if (data.lighting === "dramatic" || data.lightingDirection === "rembrandt") {
    tips.push("Iluminação dramática funciona melhor com faces angulares e contraste bem definido.");
  }

  if (data.filmStock && data.filmStock !== "none") {
    tips.push("Para simular film stock, considere usar LUTs específicas no pós-processamento para resultados mais autênticos.");
  }

  if (data.artMedium && data.artMedium !== "photography") {
    tips.push("Para meios artísticos não-fotográficos, aumente o denoising strength para permitir mais liberdade criativa.");
  }

  if (data.aspectRatio) {
    tips.push(`Gere a imagem na proporção ${data.aspectRatio} para melhor enquadramento no uso final.`);
  }

  return {
    prompt: parts.join(""),
    negativePrompt: negParts.join(", "),
    tips: tips.slice(0, 6),
  };
}
