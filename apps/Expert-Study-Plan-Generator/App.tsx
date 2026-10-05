import React, { useState, useRef, useEffect, useCallback } from 'react';
import { generateStudyPlan } from './services/geminiService';
import { SendIcon, SparklesIcon, DocumentArrowDownIcon, ArrowPathIcon } from './components/icons';

// Informa ao TypeScript sobre a biblioteca jsPDF carregada globalmente via CDN
declare global {
    interface Window {
        jspdf: any;
    }
}


// --- Componentes Auxiliares ---

interface SubjectInputFormProps {
    onSubmit: (subject: string) => void;
    isLoading: boolean;
}

const SubjectInputForm: React.FC<SubjectInputFormProps> = ({ onSubmit, isLoading }) => {
    const [subject, setSubject] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (subject.trim() && !isLoading) {
            onSubmit(subject.trim());
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center animate-fade-in">
             <SparklesIcon className="w-24 h-24 text-cyan-400 mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Gerador de Plano de Estudo Expert</h1>
            <p className="text-lg text-gray-400 mb-8 max-w-2xl">
                Digite um tópico que você deseja dominar, e nossa IA criará um roteiro de aprendizado completo, do iniciante ao especialista.
            </p>
            <form onSubmit={handleSubmit} className="w-full max-w-lg">
                <div className="relative">
                    <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Ex: 'React com TypeScript', 'Física Quântica', 'Teoria Musical'..."
                        className="w-full p-4 pr-16 text-lg bg-gray-800 border-2 border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !subject.trim()}
                        className="absolute inset-y-0 right-0 flex items-center justify-center w-14 h-14 m-1 bg-cyan-600 text-white rounded-full hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300"
                        aria-label="Gerar Plano de Estudo"
                    >
                        <SendIcon className="w-6 h-6" />
                    </button>
                </div>
            </form>
        </div>
    );
};

const loadingPhases = [
    {
        title: "Analisando o tópico...",
        subtasks: ["Identificando conceitos-chave", "Avaliando a complexidade", "Definindo escopo do aprendizado"],
    },
    {
        title: "Estruturando os fundamentos...",
        subtasks: ["Mapeando pré-requisitos", "Organizando módulos iniciais", "Estabelecendo a base teórica"],
    },
    {
        title: "Mapeando conteúdo intermediário...",
        subtasks: ["Conectando ideias", "Definindo projetos práticos", "Sequenciando os tópicos"],
    },
    {
        title: "Adicionando tópicos avançados...",
        subtasks: ["Pesquisando literatura de ponta", "Incluindo especializações", "Preparando para o nível expert"],
    },
    {
        title: "Finalizando com a IA...",
        subtasks: ["Compilando o plano final", "Revisando a estrutura", "Polindo os detalhes", "Quase pronto..."],
    },
];


const LoadingIndicator: React.FC = () => {
    const [phaseIndex, setPhaseIndex] = useState(0);
    const [subtask, setSubtask] = useState('');

    // Efeito para avançar as fases principais
    useEffect(() => {
        const phaseInterval = setInterval(() => {
            setPhaseIndex(prev => {
                if (prev < loadingPhases.length - 1) {
                    return prev + 1;
                }
                clearInterval(phaseInterval);
                return prev;
            });
        }, 3000); // Duração de cada fase principal

        return () => clearInterval(phaseInterval);
    }, []);

    // Efeito para ciclar as subtarefas dentro da fase atual
    useEffect(() => {
        let subtaskIndex = 0;
        const currentPhase = loadingPhases[phaseIndex];
        setSubtask(currentPhase.subtasks[0]);

        const subtaskInterval = setInterval(() => {
            subtaskIndex = (subtaskIndex + 1) % currentPhase.subtasks.length;
            setSubtask(currentPhase.subtasks[subtaskIndex]);
        }, 750); // Velocidade da troca de subtarefas

        return () => clearInterval(subtaskInterval);
    }, [phaseIndex]);

    const isFinalizing = phaseIndex === loadingPhases.length - 1;
    const progressPercentage = isFinalizing ? 95 : Math.round(((phaseIndex) / (loadingPhases.length -1)) * 95);

    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4 animate-fade-in w-full max-w-md">
            <SparklesIcon className="w-24 h-24 text-cyan-400 mb-6 animate-icon-glow" />
            <h2 className="text-2xl font-semibold text-white">{loadingPhases[phaseIndex].title}</h2>
            <div className="text-gray-400 mt-2 mb-6 h-12 flex items-center justify-center transition-opacity duration-300">
                <p key={subtask} className="animate-text-fade-in">{subtask}</p>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                <div 
                    className={`bg-cyan-500 h-2.5 rounded-full transition-all duration-500 ease-out ${isFinalizing ? 'animate-pulse-slow' : ''}`}
                    style={{ width: `${progressPercentage}%` }}
                ></div>
            </div>
        </div>
    );
};


interface StudyPlanDisplayProps {
    plan: string;
    subject: string;
    onGeneratePdf: () => void;
    onReset: () => void;
}

const StudyPlanDisplay: React.FC<StudyPlanDisplayProps> = ({ plan, subject, onGeneratePdf, onReset }) => {
    return (
        <div className="w-full max-w-4xl mx-auto animate-fade-in p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white">Seu Plano de Estudo para:</h2>
                    <p className="text-xl md:text-2xl text-cyan-400">{subject}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
                    <button 
                        onClick={onGeneratePdf} 
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 w-full px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-500 transition-colors"
                    >
                        <DocumentArrowDownIcon className="w-5 h-5" />
                        Gerar PDF
                    </button>
                    <button 
                        onClick={onReset} 
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 w-full px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
                    >
                        <ArrowPathIcon className="w-5 h-5" />
                        Novo Plano
                    </button>
                </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700 shadow-lg">
                <pre className="text-gray-300 whitespace-pre-wrap font-mono text-sm leading-relaxed">
                    {plan}
                </pre>
            </div>
        </div>
    );
};


// --- Componente Principal ---

const App: React.FC = () => {
    const [studyPlan, setStudyPlan] = useState<string | null>(null);
    const [subject, setSubject] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    
    const topOfPageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Rola para o topo quando o estado é resetado
        if (!studyPlan && !isLoading) {
            topOfPageRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [studyPlan, isLoading]);

    const handleSubjectSubmit = useCallback(async (submittedSubject: string) => {
        setIsLoading(true);
        setSubject(submittedSubject);
        setStudyPlan(null);
        
        const plan = await generateStudyPlan(submittedSubject);
        
        setStudyPlan(plan);
        setIsLoading(false);
    }, []);
    
    const handleGeneratePdf = useCallback(() => {
        if (!studyPlan || !subject) return;
    
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    
            const pageHeight = doc.internal.pageSize.getHeight();
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 15;
            let y = margin;
    
            const checkPageBreak = (spaceNeeded: number) => {
                if (y + spaceNeeded > pageHeight - margin) {
                    doc.addPage();
                    y = margin;
                }
            };
    
            // ---- PDF Header ----
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(22);
            doc.text('Plano de Estudo Expert', pageWidth / 2, y, { align: 'center' });
            y += 10;
    
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(16);
            doc.setTextColor(80, 80, 80);
            doc.text(subject, pageWidth / 2, y, { align: 'center' });
            y += 12;
            doc.setTextColor(0, 0, 0);
    
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, y, pageWidth - margin, y);
            y += 10;
    
            // ---- PDF Content ----
            const lines = studyPlan.split('\n');
    
            lines.forEach(line => {
                const trimmedLine = line.trim();
                const indent = line.search(/\S|$/); // Find first non-whitespace character
                const leftOffset = margin + (indent * 1.5); // Adjust multiplier for desired indent space
    
                if (!trimmedLine) {
                    y += 3;
                    checkPageBreak(0);
                    return;
                }
    
                // Main section headers (e.g., "1. Fundamentos")
                if (/^\d\.\s/.test(trimmedLine) && !/^\d\.\d/.test(trimmedLine)) {
                    y += 6;
                    checkPageBreak(15);
                    doc.setFont('Helvetica', 'bold');
                    doc.setFontSize(14);
                    doc.setTextColor(0, 105, 128); // Dark Cyan
                    doc.text(trimmedLine, margin, y);
                    y += 8;
                }
                // Time estimates
                else if (trimmedLine.toLowerCase().startsWith('tempo estimado')) {
                    checkPageBreak(10);
                    doc.setFont('Helvetica', 'italic');
                    doc.setFontSize(9);
                    doc.setTextColor(120, 120, 120);
                    doc.text(trimmedLine, margin + 2, y); // Slightly indented
                    y += 8;
                }
                // Sub-topics with descriptions
                else if (trimmedLine.includes(':')) {
                    const parts = trimmedLine.split(':');
                    const topicTitle = parts[0] + ':';
                    const topicDescription = parts.slice(1).join(':').trim();
    
                    checkPageBreak(12);
                    doc.setFont('Helvetica', 'bold');
                    doc.setFontSize(10);
                    doc.text(topicTitle, leftOffset, y);
                    
                    if (topicDescription) {
                        doc.setFont('Helvetica', 'normal');
                        const descriptionLines = doc.splitTextToSize(topicDescription, pageWidth - (leftOffset + doc.getStringUnitWidth(topicTitle) * 3) - margin); // 3 is font size factor
                        doc.text(descriptionLines, leftOffset + doc.getStringUnitWidth(topicTitle) * 2.5, y);
                         y += (descriptionLines.length * 4);
                    } else {
                         y += 4;
                    }

                }
                // Other lines (fallback)
                else {
                    const textLines = doc.splitTextToSize(trimmedLine, pageWidth - leftOffset - margin);
                    checkPageBreak(textLines.length * 5);
                    doc.setFont('Helvetica', 'normal');
                    doc.setFontSize(10);
                    doc.text(textLines, leftOffset, y);
                    y += (textLines.length * 5);
                }
                doc.setTextColor(0,0,0); // Reset color
            });
    
            doc.save(`plano-de-estudo-${subject.toLowerCase().replace(/\s+/g, '-')}.pdf`);
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            alert("Não foi possível gerar o PDF. Verifique o console para mais detalhes.");
        }
    
    }, [studyPlan, subject]);

    const handleReset = () => {
        setStudyPlan(null);
        setSubject('');
    };
    
    return (
        <div className="flex flex-col min-h-screen bg-gray-900" ref={topOfPageRef}>
            <style>{`
              @keyframes fade-in {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
              @keyframes pulse-slow {
                50% { opacity: 0.8; }
              }
              .animate-pulse-slow {
                animation: pulse-slow 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
              }
              @keyframes icon-glow {
                0%, 100% { filter: drop-shadow(0 0 5px #06b6d4) drop-shadow(0 0 15px #06b6d4); }
                50% { filter: drop-shadow(0 0 10px #0891b2) drop-shadow(0 0 25px #0891b2); }
              }
              .animate-icon-glow { animation: icon-glow 2.5s ease-in-out infinite; }
      
              @keyframes text-fade-in {
                from { opacity: 0.3; }
                to { opacity: 1; }
              }
              .animate-text-fade-in { animation: text-fade-in 0.75s ease-out; }
            `}</style>
            <header className="bg-gray-800/50 backdrop-blur-sm p-4 text-center border-b border-gray-700 sticky top-0 z-10">
                <h1 className="text-xl font-bold text-white">Plano de Estudo com IA</h1>
            </header>
            
            <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4">
                { !studyPlan && !isLoading && (
                    <SubjectInputForm onSubmit={handleSubjectSubmit} isLoading={isLoading} />
                )}
                { isLoading && <LoadingIndicator /> }
                { studyPlan && !isLoading && (
                    <StudyPlanDisplay 
                        plan={studyPlan} 
                        subject={subject}
                        onGeneratePdf={handleGeneratePdf}
                        onReset={handleReset}
                    />
                )}
            </main>
        </div>
    );
};

export default App;