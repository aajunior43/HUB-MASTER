import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Image as ImageIcon, 
  Camera, 
  Settings, 
  Sparkles, 
  Palette, 
  Sun, 
  Wind, 
  Layers, 
  Ban,
  Maximize,
  Shirt,
  Smile,
  Zap,
  Box,
  Focus
} from "lucide-react";

export interface EditFormData {
  changes: string;
  preserve: string;
  style: string;
  lighting: string;
  lightingDirection: string;
  realism: string;
  background: string;
  backgroundDescription: string;
  clothing: string;
  colorTone: string;
  mood: string;
  cameraAngle: string;
  cameraLens: string;
  depth: string;
  skinTexture: string;
  hairStyle: string;
  expression: string;
  pose: string;
  environment: string;
  weather: string;
  timeOfDay: string;
  postProcessing: string[];
  extras: string;
  negativeExtras: string;
  composition: string;
  framing: string;
  aspectRatio: string;
  intensity: string;
  filmStock: string;
  artMedium: string;
  colorScheme: string;
  texture: string;
  resolution: string;
  bodyType: string;
  age: string;
  ethnicity: string;
  makeup: string;
  accessories: string;
  lightColor: string;
  shadowStyle: string;
  perspective: string;
  season: string;
  props: string;
  negativePromptPreset: string[];
}

interface EditFormProps {
  data: EditFormData;
  onChange: (data: EditFormData) => void;
}

const Field = ({ label, children, hint, icon: Icon }: { label: string; children: React.ReactNode; hint?: string; icon?: any }) => (
  <div className="space-y-2.5 group animate-fade-in">
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-3.5 h-3.5 text-primary/70 group-hover:text-primary transition-colors" />}
      <Label className="text-[13px] font-bold text-foreground/90 group-focus-within:text-primary transition-colors">{label}</Label>
    </div>
    {hint && <p className="text-[10px] leading-tight text-muted-foreground/80 -mt-1">{hint}</p>}
    <div className="relative">
      {children}
    </div>
  </div>
);

const SectionGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
    {children}
  </div>
);

const Section = ({ title, icon: Icon, children }: { title: string; icon?: any; children: React.ReactNode }) => (
  <div className="space-y-6 animate-fade-in">
    <div className="flex items-center gap-3 pb-2 border-b border-primary/10">
      {Icon && <Icon className="w-4 h-4 text-primary" />}
      <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary/80">
        {title}
      </h3>
    </div>
    <div className="space-y-6">
      {children}
    </div>
  </div>
);

const postProcessingOptions = [
  { id: "bokeh", label: "Bokeh / Desfoque" },
  { id: "grain", label: "Granulação" },
  { id: "vignette", label: "Vinheta" },
  { id: "hdr", label: "HDR" },
  { id: "sharpening", label: "Nitidez" },
  { id: "color_grade", label: "Color Grading" },
  { id: "lens_flare", label: "Lens Flare" },
  { id: "glow", label: "Soft Glow" },
  { id: "halation", label: "Halation" },
  { id: "chromatic", label: "Aberração" },
  { id: "light_leaks", label: "Light Leaks" },
  { id: "motion_blur", label: "Motion Blur" },
];

const negativePresetOptions = [
  { id: "deformed", label: "Sem deformações" },
  { id: "blurry", label: "Sem desfoque" },
  { id: "watermark", label: "Sem marcas" },
  { id: "plastic_skin", label: "Pele natural" },
  { id: "bad_hands", label: "Mãos perfeitas" },
  { id: "low_quality", label: "Alta qualidade" },
];

const EditForm = ({ data, onChange }: EditFormProps) => {
  const set = (key: keyof EditFormData, value: string | string[]) =>
    onChange({ ...data, [key]: value });

  const togglePostProcessing = (id: string) => {
    const current = data.postProcessing || [];
    const updated = current.includes(id) ? current.filter((p) => p !== id) : [...current, id];
    set("postProcessing", updated);
  };

  const toggleNegativePreset = (id: string) => {
    const current = data.negativePromptPreset || [];
    const updated = current.includes(id) ? current.filter((p) => p !== id) : [...current, id];
    set("negativePromptPreset", updated);
  };

  return (
    <Tabs defaultValue="essencial" className="w-full">
      <TabsList className="grid w-full grid-cols-4 neo-inset p-1 rounded-2xl h-auto mb-10 bg-background/50 backdrop-blur-sm">
        <TabsTrigger value="essencial" className="rounded-xl data-[state=active]:bg-background data-[state=active]:neo-raised data-[state=active]:shadow-none py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider">
          <Sparkles className="w-4 h-4 mr-2 hidden xs:block" /> Essencial
        </TabsTrigger>
        <TabsTrigger value="pessoa" className="rounded-xl data-[state=active]:bg-background data-[state=active]:neo-raised data-[state=active]:shadow-none py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider">
          <User className="w-4 h-4 mr-2 hidden xs:block" /> Pessoa
        </TabsTrigger>
        <TabsTrigger value="ambiente" className="rounded-xl data-[state=active]:bg-background data-[state=active]:neo-raised data-[state=active]:shadow-none py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider">
          <ImageIcon className="w-4 h-4 mr-2 hidden xs:block" /> Visual
        </TabsTrigger>
        <TabsTrigger value="tecnico" className="rounded-xl data-[state=active]:bg-background data-[state=active]:neo-raised data-[state=active]:shadow-none py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider">
          <Settings className="w-4 h-4 mr-2 hidden xs:block" /> Técnico
        </TabsTrigger>
      </TabsList>

      <TabsContent value="essencial" className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">
        <Section title="Objetivos da Edição" icon={Sparkles}>
          <Field label="O que deve ser alterado?" icon={Zap} hint="Descreva as mudanças principais que deseja ver na imagem">
            <Textarea
              placeholder="Ex: trocar o fundo por uma praia ao pôr do sol, mudar a cor da camiseta para azul..."
              value={data.changes}
              onChange={(e) => set("changes", e.target.value)}
              className="neo-inset rounded-2xl border-none bg-background resize-none min-h-[120px] p-4 text-sm focus-visible:ring-1 focus-visible:ring-primary/20"
            />
          </Field>
          <Field label="O que deve ser preservado?" icon={Ban} hint="Elementos que devem permanecer idênticos ao original">
            <Textarea
              placeholder="Ex: rosto, identidade, expressão, mãos, proporções corporais..."
              value={data.preserve}
              onChange={(e) => set("preserve", e.target.value)}
              className="neo-inset rounded-2xl border-none bg-background resize-none min-h-[80px] p-4 text-sm focus-visible:ring-1 focus-visible:ring-primary/20"
            />
          </Field>
          <Field label="Intensidade da Edição" icon={Maximize}>
            <Select value={data.intensity} onValueChange={(v) => set("intensity", v)}>
              <SelectTrigger className="neo-inset rounded-xl border-none h-12 bg-background">
                <SelectValue placeholder="Selecione a força da mudança" />
              </SelectTrigger>
              <SelectContent className="neo-raised rounded-2xl border-none p-2">
                <SelectItem value="subtle">Sutil (Quase imperceptível)</SelectItem>
                <SelectItem value="light">Leve (Pequenos ajustes)</SelectItem>
                <SelectItem value="moderate">Moderada (Equilibrada)</SelectItem>
                <SelectItem value="strong">Forte (Transformação visível)</SelectItem>
                <SelectItem value="extreme">Extrema (Transformação total)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Section>
      </TabsContent>

      <TabsContent value="pessoa" className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">
        <Section title="Aparência e Sujeito" icon={User}>
          <SectionGrid>
            <Field label="Expressão Facial" icon={Smile}>
              <Select value={data.expression} onValueChange={(v) => set("expression", v)}>
                <SelectTrigger className="neo-inset rounded-xl border-none h-11 bg-background">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="neo-raised rounded-2xl border-none">
                  <SelectItem value="keep">Manter original</SelectItem>
                  <SelectItem value="smile">Sorriso natural</SelectItem>
                  <SelectItem value="serious">Sério / Neutro</SelectItem>
                  <SelectItem value="confident">Confiante</SelectItem>
                  <SelectItem value="mysterious">Misterioso</SelectItem>
                  <SelectItem value="joyful">Radiante</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Pose / Posição" icon={Maximize}>
              <Select value={data.pose} onValueChange={(v) => set("pose", v)}>
                <SelectTrigger className="neo-inset rounded-xl border-none h-11 bg-background">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="neo-raised rounded-2xl border-none">
                  <SelectItem value="keep">Manter original</SelectItem>
                  <SelectItem value="portrait">Retrato frontal</SelectItem>
                  <SelectItem value="three_quarter">Três quartos</SelectItem>
                  <SelectItem value="profile">Perfil</SelectItem>
                  <SelectItem value="dynamic">Dinâmica</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Textura da Pele">
              <Select value={data.skinTexture} onValueChange={(v) => set("skinTexture", v)}>
                <SelectTrigger className="neo-inset rounded-xl border-none h-11 bg-background">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="neo-raised rounded-2xl border-none">
                  <SelectItem value="natural">Natural</SelectItem>
                  <SelectItem value="smooth">Suavizada</SelectItem>
                  <SelectItem value="dewy">Glow saudável</SelectItem>
                  <SelectItem value="freckled">Com sardas</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Maquiagem">
              <Select value={data.makeup} onValueChange={(v) => set("makeup", v)}>
                <SelectTrigger className="neo-inset rounded-xl border-none h-11 bg-background">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="neo-raised rounded-2xl border-none">
                  <SelectItem value="keep">Original</SelectItem>
                  <SelectItem value="natural">Natural</SelectItem>
                  <SelectItem value="glamorous">Glamour</SelectItem>
                  <SelectItem value="editorial_mk">Editorial</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </SectionGrid>
          
          <div className="space-y-6">
            <Field label="Cabelo" icon={Palette}>
              <Input
                placeholder="Ex: manter original, loiro platinado, cacheado..."
                value={data.hairStyle}
                onChange={(e) => set("hairStyle", e.target.value)}
                className="neo-inset rounded-xl border-none h-12 bg-background px-4"
              />
            </Field>
            <Field label="Roupas e Estilo" icon={Shirt}>
              <Input
                placeholder="Ex: terno italiano preto, vestido de seda vermelho..."
                value={data.clothing}
                onChange={(e) => set("clothing", e.target.value)}
                className="neo-inset rounded-xl border-none h-12 bg-background px-4"
              />
            </Field>
            <Field label="Acessórios e Objetos" icon={Box}>
              <Input
                placeholder="Ex: óculos escuros, relógio de luxo, buquê de flores..."
                value={data.accessories}
                onChange={(e) => set("accessories", e.target.value)}
                className="neo-inset rounded-xl border-none h-12 bg-background px-4"
              />
            </Field>
          </div>
        </Section>
      </TabsContent>

      <TabsContent value="ambiente" className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">
        <Section title="Cenário e Estética" icon={ImageIcon}>
          <SectionGrid>
            <Field label="Estilo Artístico" icon={Palette}>
              <Select value={data.style} onValueChange={(v) => set("style", v)}>
                <SelectTrigger className="neo-inset rounded-xl border-none h-11 bg-background">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="neo-raised rounded-2xl border-none">
                  <SelectItem value="realistic">Fotorrealista</SelectItem>
                  <SelectItem value="cinematic">Cinematográfico</SelectItem>
                  <SelectItem value="vintage">Vintage</SelectItem>
                  <SelectItem value="cyberpunk">Cyberpunk</SelectItem>
                  <SelectItem value="anime">Anime</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Atmosfera (Mood)" icon={Wind}>
              <Select value={data.mood} onValueChange={(v) => set("mood", v)}>
                <SelectTrigger className="neo-inset rounded-xl border-none h-11 bg-background">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="neo-raised rounded-2xl border-none">
                  <SelectItem value="warm">Quente</SelectItem>
                  <SelectItem value="mysterious">Misterioso</SelectItem>
                  <SelectItem value="dreamy">Onírico</SelectItem>
                  <SelectItem value="dramatic">Dramático</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Clima / Tempo" icon={Sun}>
              <Select value={data.weather} onValueChange={(v) => set("weather", v)}>
                <SelectTrigger className="neo-inset rounded-xl border-none h-11 bg-background">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="neo-raised rounded-2xl border-none">
                  <SelectItem value="clear">Céu limpo</SelectItem>
                  <SelectItem value="rainy">Chuvoso</SelectItem>
                  <SelectItem value="foggy">Nevoeiro</SelectItem>
                  <SelectItem value="snowy">Neve</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Hora do Dia">
              <Select value={data.timeOfDay} onValueChange={(v) => set("timeOfDay", v)}>
                <SelectTrigger className="neo-inset rounded-xl border-none h-11 bg-background">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="neo-raised rounded-xl border-none">
                  <SelectItem value="golden">Golden Hour</SelectItem>
                  <SelectItem value="midday">Meio dia</SelectItem>
                  <SelectItem value="night">Noite</SelectItem>
                  <SelectItem value="blue_hour">Blue Hour</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </SectionGrid>
          
          <Field label="Descrição Detalhada do Fundo" icon={ImageIcon}>
            <Textarea
              placeholder="Ex: interior de uma catedral gótica, topo de uma montanha nevada..."
              value={data.backgroundDescription}
              onChange={(e) => set("backgroundDescription", e.target.value)}
              className="neo-inset rounded-2xl border-none bg-background resize-none min-h-[80px] p-4 text-sm"
            />
          </Field>
        </Section>
      </TabsContent>

      <TabsContent value="tecnico" className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">
        <Section title="Câmera e Iluminação" icon={Camera}>
          <SectionGrid>
            <Field label="Iluminação" icon={Sun}>
              <Select value={data.lighting} onValueChange={(v) => set("lighting", v)}>
                <SelectTrigger className="neo-inset rounded-xl border-none h-11 bg-background">
                  <SelectValue placeholder="Tipo de luz" />
                </SelectTrigger>
                <SelectContent className="neo-raised rounded-2xl border-none">
                  <SelectItem value="studio">Estúdio</SelectItem>
                  <SelectItem value="natural">Natural</SelectItem>
                  <SelectItem value="neon">Neon</SelectItem>
                  <SelectItem value="dramatic">Dramática</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Lente" icon={Focus}>
              <Select value={data.cameraLens} onValueChange={(v) => set("cameraLens", v)}>
                <SelectTrigger className="neo-inset rounded-xl border-none h-11 bg-background">
                  <SelectValue placeholder="Distância focal" />
                </SelectTrigger>
                <SelectContent className="neo-raised rounded-2xl border-none">
                  <SelectItem value="35mm">35mm (Wide)</SelectItem>
                  <SelectItem value="50mm">50mm (Natural)</SelectItem>
                  <SelectItem value="85mm">85mm (Retrato)</SelectItem>
                  <SelectItem value="anamorphic">Anamórfica</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </SectionGrid>
        </Section>

        <Section title="Efeitos e Filtros" icon={Layers}>
          <div className="grid grid-cols-2 xs:grid-cols-3 gap-3">
            {postProcessingOptions.map((option) => (
              <label
                key={option.id}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl cursor-pointer transition-all duration-300 border border-transparent ${
                  (data.postProcessing || []).includes(option.id)
                    ? "bg-primary/5 border-primary/20 neo-inset"
                    : "neo-button hover:border-primary/10"
                }`}
              >
                <Checkbox
                  checked={(data.postProcessing || []).includes(option.id)}
                  onCheckedChange={() => togglePostProcessing(option.id)}
                  className="sr-only"
                />
                <span className={`text-[10px] font-bold text-center ${(data.postProcessing || []).includes(option.id) ? "text-primary" : "text-muted-foreground"}`}>
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </Section>

        <Section title="Filtros Negativos" icon={Ban}>
          <div className="grid grid-cols-2 gap-3">
            {negativePresetOptions.map((option) => (
              <label
                key={option.id}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                  (data.negativePromptPreset || []).includes(option.id)
                    ? "bg-destructive/5 border-destructive/10 neo-inset"
                    : "neo-button"
                }`}
              >
                <Checkbox
                  checked={(data.negativePromptPreset || []).includes(option.id)}
                  onCheckedChange={() => toggleNegativePreset(option.id)}
                />
                <span className="text-[10px] font-bold uppercase tracking-tighter text-foreground/80">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </Section>
      </TabsContent>
    </Tabs>
  );
};

export default EditForm;
