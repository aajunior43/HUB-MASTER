import { useState } from "react";
 import { Wand2, RotateCcw, LayoutGrid, Settings2, Sparkle } from "lucide-react";
import { Button } from "@/components/ui/button";
import EditForm, { type EditFormData } from "@/components/EditForm";
import PromptOutput from "@/components/PromptOutput";
 import TemplatePresets from "@/components/TemplatePresets";
 import { ThemeToggle } from "@/components/ThemeToggle";
import { generatePrompt } from "@/lib/generatePrompt";

const emptyForm: EditFormData = {
  changes: "",
  preserve: "",
  style: "",
  lighting: "",
  lightingDirection: "",
  realism: "",
  background: "",
  backgroundDescription: "",
  clothing: "",
  colorTone: "",
  mood: "",
  cameraAngle: "",
  cameraLens: "",
  depth: "",
  skinTexture: "",
  hairStyle: "",
  expression: "",
  pose: "",
  environment: "",
  weather: "",
  timeOfDay: "",
  postProcessing: [],
  extras: "",
  negativeExtras: "",
  composition: "",
  framing: "",
  aspectRatio: "",
  intensity: "",
  filmStock: "",
  artMedium: "",
  colorScheme: "",
  texture: "",
  resolution: "",
  bodyType: "",
  age: "",
  ethnicity: "",
  makeup: "",
  accessories: "",
  lightColor: "",
  shadowStyle: "",
  perspective: "",
  season: "",
  props: "",
  negativePromptPreset: [],
};

const Index = () => {
  const [formData, setFormData] = useState<EditFormData>(emptyForm);
  const [result, setResult] = useState<{
    prompt: string;
    negativePrompt: string;
    tips: string[];
  } | null>(null);

  const canGenerate = formData.changes.trim().length > 0;

  const handleGenerate = () => {
    if (!canGenerate) return;
    setResult(generatePrompt(formData));
  };

  const handleReset = () => {
    setFormData(emptyForm);
    setResult(null);
  };

  const handleApplyTemplate = (templateData: Partial<EditFormData>) => {
    setFormData({ ...emptyForm, ...templateData });
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
       <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md">
         <div className="container max-w-6xl mx-auto px-4 py-3 sm:py-4">
           <div className="neo-raised rounded-2xl px-4 sm:px-6 py-3 flex items-center justify-between">
             <div className="flex items-center gap-3 sm:gap-4">
               <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl neo-convex flex items-center justify-center animate-pulse-glow">
                 <Wand2 className="w-5 h-5 text-primary" />
               </div>
               <div className="hidden xs:block">
                 <h1 className="text-lg sm:text-xl font-black font-display text-foreground tracking-tight leading-none">
                   PromptForge
                 </h1>
                 <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold mt-1">
                   AI Photo Editor
                 </p>
               </div>
             </div>
             
             <div className="flex items-center gap-2 sm:gap-3">
               <button
                 onClick={handleReset}
                 className="neo-button rounded-xl px-3 sm:px-4 h-9 sm:h-10 text-[10px] sm:text-xs font-bold text-muted-foreground hover:text-destructive flex items-center gap-1.5 transition-colors"
               >
                 <RotateCcw className="w-3.5 h-3.5" />
                 <span className="hidden sm:inline">Recomeçar</span>
               </button>
               <ThemeToggle />
             </div>
           </div>
         </div>
       </header>

       <main className="container max-w-6xl mx-auto px-4 py-6 sm:py-12">
         <div className="space-y-12">
           {/* Hero / Intro */}
           <div className="text-center space-y-4 max-w-2xl mx-auto mb-4 animate-fade-in">
             <h2 className="text-3xl sm:text-5xl font-black font-display tracking-tight text-foreground leading-[1.1]">
               Transforme suas fotos com <span className="text-primary italic">Precisão.</span>
             </h2>
             <p className="text-muted-foreground text-sm sm:text-lg leading-relaxed px-4">
               Escolha um modelo pronto ou configure cada detalhe técnico para gerar prompts de edição ultra-profissionais.
             </p>
           </div>
 
           <div className="grid lg:grid-cols-12 gap-8 sm:gap-10 items-start">
             {/* Left Column - Form */}
             <div className="lg:col-span-7 space-y-10">
               <section className="space-y-4">
                 <div className="flex items-center gap-2.5 px-2">
                   <LayoutGrid className="w-4 h-4 text-primary" />
                   <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                     Modelos Rápidos
                   </h3>
                 </div>
                 <div className="neo-raised-lg rounded-[2.5rem] p-4 sm:p-7 overflow-hidden">
                   <TemplatePresets onApply={handleApplyTemplate} />
                 </div>
               </section>
 
               <section className="space-y-4">
                 <div className="flex items-center justify-between px-2">
                   <div className="flex items-center gap-2.5">
                     <Settings2 className="w-4 h-4 text-primary" />
                     <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                       Configuração Detalhada
                     </h3>
                   </div>
                   <div className="hidden sm:flex items-center gap-2 text-[10px] font-black text-primary/80 uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                     <Sparkle className="w-3 h-3" />
                     Modo Avançado
                   </div>
                 </div>
                 <div className="neo-raised-lg rounded-[2.5rem] p-6 sm:p-10 border border-white/40 dark:border-white/5">
                   <EditForm data={formData} onChange={setFormData} />
                   
                   <div className="mt-12 sm:mt-16">
                     <button
                       onClick={handleGenerate}
                       disabled={!canGenerate}
                       className={`w-full h-16 sm:h-20 rounded-2xl sm:rounded-3xl font-display font-black tracking-[0.15em] text-base sm:text-xl flex items-center justify-center gap-3 transition-all duration-500 overflow-hidden relative group shadow-2xl ${
                         canGenerate
                           ? "bg-primary text-primary-foreground shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1.5 active:translate-y-0"
                           : "neo-inset text-muted-foreground cursor-not-allowed opacity-40 shadow-none"
                       }`}
                     >
                       <Wand2 className={`w-6 h-6 sm:w-7 sm:h-7 ${canGenerate ? "animate-pulse" : ""}`} />
                       GERAR PROMPT MÁGICO
                       {canGenerate && (
                         <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-[35deg]" />
                       )}
                     </button>
                     {!canGenerate && (
                       <p className="text-center text-[10px] sm:text-xs text-muted-foreground mt-4 font-black uppercase tracking-[0.1em] animate-pulse">
                         Preencha o campo "Modificações" para começar
                       </p>
                     )}
                   </div>
                 </div>
               </section>
             </div>
 
             {/* Right Column - Output */}
             <div className="lg:col-span-5 lg:sticky lg:top-28 space-y-4">
               <div className="flex items-center gap-2.5 px-2">
                 <Sparkle className="w-4 h-4 text-primary" />
                 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                   Resultado do Prompt
                 </h3>
               </div>
               <div className="neo-raised-lg rounded-[2.5rem] p-8 sm:p-12 min-h-[500px] border-2 border-primary/20 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors duration-700" />
                 
                 {result ? (
                   <PromptOutput
                     prompt={result.prompt}
                     negativePrompt={result.negativePrompt}
                     tips={result.tips}
                   />
                 ) : (
                   <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center space-y-8 animate-in fade-in zoom-in duration-700">
                     <div className="relative">
                       <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full neo-concave flex items-center justify-center relative z-10">
                         <Wand2 className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground/30" />
                       </div>
                       <div className="absolute -top-3 -right-3 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center animate-bounce duration-[3000ms]">
                         <Sparkle className="w-5 h-5 sm:w-6 sm:h-6 text-primary/60" />
                       </div>
                     </div>
                     <div className="space-y-3">
                       <h4 className="text-xl sm:text-2xl font-black text-foreground font-display tracking-tight">
                         Pronto para criar?
                       </h4>
                       <p className="text-sm sm:text-base text-muted-foreground max-w-[280px] leading-relaxed mx-auto font-medium">
                         Configure as opções ao lado para gerar seu prompt otimizado para IAs de edição.
                       </p>
                     </div>
                   </div>
                 )}
               </div>
             </div>
           </div>
         </div>
       </main>
    </div>
  );
};

export default Index;
