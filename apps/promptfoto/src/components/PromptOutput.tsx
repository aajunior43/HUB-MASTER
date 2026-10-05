import { useState } from "react";
import { Copy, Check, Sparkles, Ban, Lightbulb } from "lucide-react";
import { toast } from "sonner";

interface PromptOutputProps {
  prompt: string;
  negativePrompt: string;
  tips: string[];
}

 const CopyBlock = ({
   label,
   icon: Icon,
   content,
   accent,
 }: {
   label: string;
   icon: any;
   content: string;
   accent?: boolean;
 }) => {
   const [copied, setCopied] = useState(false);
 
   const copy = () => {
     navigator.clipboard.writeText(content);
     setCopied(true);
     toast.success("Copiado!");
     setTimeout(() => setCopied(false), 2000);
   };
 
   return (
     <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
       <div className="flex items-center justify-between px-1">
         <div className="flex items-center gap-2">
           <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
             <Icon className="w-4 h-4" />
           </div>
           <h3 className={`text-xs font-black uppercase tracking-widest ${accent ? "text-primary" : "text-foreground"}`}>
             {label}
           </h3>
         </div>
         <button
           onClick={copy}
           className={`neo-button rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all duration-300 ${copied ? "text-primary scale-95" : "text-muted-foreground hover:text-foreground"}`}
         >
           {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
           {copied ? "Copiado" : "Copiar"}
         </button>
       </div>
       <div
         className={`p-6 rounded-3xl text-sm leading-relaxed whitespace-pre-wrap font-medium relative group overflow-hidden ${
           accent
             ? "neo-concave text-foreground border border-primary/10"
             : "neo-inset text-muted-foreground italic border border-white/5"
         }`}
       >
         {content}
         <div className="absolute top-0 right-0 w-2 h-full bg-gradient-to-b from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
       </div>
     </div>
   );
 };

 const PromptOutput = ({ prompt, negativePrompt, tips }: PromptOutputProps) => {
   return (
     <div className="space-y-10 animate-fade-in py-2">
       <CopyBlock label="Prompt de Edição" icon={Sparkles} content={prompt} accent />
 
       {negativePrompt && (
         <CopyBlock label="Prompt Negativo" icon={Ban} content={negativePrompt} />
       )}
 
       {tips.length > 0 && (
         <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500 delay-150">
           <div className="flex items-center gap-2 px-1">
             <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
               <Lightbulb className="w-4 h-4" />
             </div>
             <h3 className="text-xs font-black uppercase tracking-widest text-primary">
               Dicas de Edição
             </h3>
           </div>
           <div className="neo-inset rounded-[2rem] p-6 border border-primary/5">
             <ul className="space-y-3">
               {tips.map((tip, i) => (
                 <li key={i} className="text-[11px] sm:text-xs text-muted-foreground flex items-start gap-3 leading-relaxed">
                   <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0 shadow-[0_0_8px_hsl(var(--primary))]" />
                   {tip}
                 </li>
               ))}
             </ul>
           </div>
         </div>
       )}
     </div>
   );
 };

export default PromptOutput;
