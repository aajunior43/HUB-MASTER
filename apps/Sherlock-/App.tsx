
import React, { useState, useCallback, ChangeEvent, DragEvent, useRef } from 'react';
import { analyzeImage, generateSpeech } from './services/geminiService';

// Helper functions for audio decoding
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


const MagnifyingGlassIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
);

const SpeakerWaveIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
    </svg>
);

const StopCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9v6m-4.5 0V9M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

const SmallLoader: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const Loader: React.FC = () => (
    <div className="flex flex-col items-center justify-center space-y-4">
        <SmallLoader className="h-12 w-12 text-[#8B4513]"/>
        <p className="text-[#6b4a49] text-lg">Sherlock está no caso...</p>
    </div>
);

const ImageUploader: React.FC<{onImageSelect: (file: File) => void; imageUrl: string | null;}> = ({ onImageSelect, imageUrl }) => {
    const [isDragging, setIsDragging] = useState(false);
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => e.target.files?.[0] && onImageSelect(e.target.files[0]);
    const handleDragEnter = (e: DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e: DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDragOver = (e: DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        e.dataTransfer.files?.[0] && onImageSelect(e.dataTransfer.files[0]);
    };

    return (
        <div className="w-full">
            <label htmlFor="image-upload" onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop} className={`flex justify-center items-center w-full h-80 rounded-lg border-2 border-dashed cursor-pointer transition-colors duration-300 ${isDragging ? 'border-[#8B4513] bg-[#faf0e6]' : 'border-[#a0522d] hover:border-[#8B4513] bg-[#faf0e6]/60'} ${imageUrl ? 'border-solid p-0' : 'p-4'}`}>
                {imageUrl ? <img src={imageUrl} alt="Preview" className="w-full h-full object-contain rounded-lg" /> : (
                    <div className="text-center text-[#6b4a49]">
                        <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        <p className="mt-2 text-sm"><span className="font-semibold text-[#8B4513]">Clique para enviar</span> ou arraste e solte</p>
                        <p className="text-xs">PNG, JPG, GIF até 10MB</p>
                    </div>
                )}
            </label>
            <input id="image-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
        </div>
    );
};

const AnalysisDisplay: React.FC<{isLoading: boolean; analysis: string | null; error: string | null;}> = ({ isLoading, analysis, error }) => {
    const renderContent = () => {
        if (isLoading) return <Loader />;
        if (error) return <div className="text-center text-red-800"><h3 className="text-xl font-semibold mb-2">Ocorreu um Erro</h3><p>{error}</p></div>;
        if (analysis) return analysis.split('\n').map((paragraph, index) => {
            if (paragraph.trim() === '') return null;
            paragraph = paragraph.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-[#2a1716]">$1</strong>').replace(/\*(.*?)\*/g, '<em class="italic text-[#4a2c2a]">$1</em>');
            return <p key={index} className="mb-4" dangerouslySetInnerHTML={{ __html: paragraph }} />;
        });
        return <div className="text-center text-[#6b4a49]"><h3 className="text-2xl font-serif mb-2">Aguardando Evidência</h3><p>Envie uma imagem e pressione "Analisar" para iniciar a investigação.</p></div>;
    };
    return <div className="bg-[#faf0e6] border border-[#a0522d] shadow-lg shadow-[#4a2c2a]/10 rounded-lg p-6 w-full h-full min-h-[20rem] flex justify-center items-center"><div className="prose prose-p:text-[#4a2c2a] prose-headings:text-[#8B4513] prose-headings:font-serif w-full max-w-full">{renderContent()}</div></div>;
};

const DEFAULT_PROMPT = `Assuma a persona de Sherlock Holmes. A imagem diante de você não é uma mera fotografia, mas uma cena congelada no tempo, repleta de pistas silenciosas. Sua missão é aplicar seu método de dedução inigualável para desvendar a história oculta nesta evidência visual.

Siga estritamente esta estrutura em três partes:

**1. Observação Detalhada:**
Primeiro, descreva meticulosamente o que você vê, sem fazer suposições. Foque nos detalhes que um observador comum ignoraria:
- **Pessoas:** Vestuário, expressões, postura, interações.
- **Objetos:** Estado de conservação (novo, gasto), posicionamento, marca, propósito.
- **Ambiente:** Localização, hora do dia, condição climática, arquitetura.
- **Texto e Símbolos:** Legibilidade, estilo da fonte, significado.
- **Se for uma captura de tela:** Analise a interface, ícones, notificações e metadados visíveis.

**2. Dedução Lógica:**
Em seguida, conecte os pontos. Para cada observação significativa, explique o que ela implica. Exponha sua linha de raciocínio passo a passo.
- O que o estado de um objeto revela sobre seu dono?
- O que uma expressão facial trai?
- Que história a composição da cena conta?

**3. Conclusão:**
Por fim, sintetize suas deduções em uma hipótese coesa e convincente sobre o contexto, os eventos que levaram a este momento ou o propósito da imagem.

Apresente sua análise de forma eloquente e estruturada, usando markdown para clareza (negrito para títulos, itálico para ênfases). Lembre-se, o impossível, uma vez eliminado, o que quer que reste, por mais improvável que seja, deve ser a verdade. O jogo começou!`;

export function App() {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const [isGeneratingSpeech, setIsGeneratingSpeech] = useState<boolean>(false);
    const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    const handleImageSelect = useCallback((file: File) => {
        setImageFile(file);
        setImageUrl(URL.createObjectURL(file));
        setAnalysis(null);
        setError(null);
        if (isPlayingAudio && audioSourceRef.current) {
            audioSourceRef.current.stop();
        }
    }, [isPlayingAudio]);

    const handleAnalyzeClick = async () => {
        if (!imageFile) { setError("Por favor, selecione uma imagem primeiro."); return; }
        setIsLoading(true);
        setError(null);
        setAnalysis(null);
        try {
            const result = await analyzeImage(imageFile, DEFAULT_PROMPT);
            setAnalysis(result);
        } catch (err) {
            setError(err instanceof Error ? `A análise falhou: ${err.message}` : "Ocorreu um erro desconhecido durante a análise.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleAudio = async () => {
        if (isPlayingAudio && audioSourceRef.current) {
            audioSourceRef.current.stop();
            return;
        }

        if (!analysis || isGeneratingSpeech) return;

        setIsGeneratingSpeech(true);
        setError(null);
        try {
            const base64Audio = await generateSpeech(analysis);
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            const audioData = decode(base64Audio);
            const audioBuffer = await decodeAudioData(audioData, audioContextRef.current, 24000, 1);
            
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            source.onended = () => {
                setIsPlayingAudio(false);
                audioSourceRef.current = null;
            };
            source.start(0);
            audioSourceRef.current = source;
            setIsPlayingAudio(true);
        } catch (err) {
            setError(err instanceof Error ? `Falha ao gerar áudio: ${err.message}` : "Ocorreu um erro desconhecido ao gerar o áudio.");
        } finally {
            setIsGeneratingSpeech(false);
        }
    };

    return (
        <div className="min-h-screen text-[#4a2c2a] font-serif p-4 sm:p-6 lg:p-8">
            <header className="text-center mb-8">
                <h1 className="text-4xl sm:text-5xl font-thin text-[#8B4513]">Sherlock<span className="text-[#6b4a49]">.ai</span></h1>
                <p className="text-[#6b4a49] mt-2">O jogo começou! Forneça a evidência, e eu farei a dedução.</p>
            </header>

            <main className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="flex flex-col items-center space-y-6">
                        <ImageUploader onImageSelect={handleImageSelect} imageUrl={imageUrl} />
                        <button onClick={handleAnalyzeClick} disabled={!imageFile || isLoading} className="flex items-center justify-center gap-2 w-full max-w-xs px-6 py-3 bg-[#8B4513] text-[#f5efde] font-bold rounded-lg shadow-md shadow-[#4a2c2a]/20 border-2 border-[#4a2c2a]/50 transition-all duration-300 ease-in-out transform hover:scale-105 hover:bg-[#a0522d] disabled:bg-[#967979] disabled:cursor-not-allowed disabled:scale-100 disabled:border-transparent">
                            {isLoading ? (<><SmallLoader className="h-5 w-5" /><span>Analisando...</span></>) : (<><MagnifyingGlassIcon className="h-6 w-6" /><span>Analisar Evidência</span></>)}
                        </button>
                    </div>

                    <div className="w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-serif text-[#4a2c2a]">Minhas Deduções</h2>
                            {analysis && !isLoading && (
                                <button onClick={handleToggleAudio} disabled={isGeneratingSpeech} title={isPlayingAudio ? "Parar Leitura" : "Ouvir Deducção"} aria-label={isPlayingAudio ? "Parar Leitura" : "Ouvir Deducção"} className="flex items-center justify-center gap-2 px-4 py-2 bg-transparent text-[#4a2c2a] font-semibold rounded-lg border border-[#a0522d] shadow-md transition-colors duration-300 hover:bg-[#fdf0d5] disabled:opacity-50 disabled:cursor-wait">
                                    {isGeneratingSpeech ? <SmallLoader className="h-5 w-5" /> : isPlayingAudio ? <StopCircleIcon className="h-5 w-5" /> : <SpeakerWaveIcon className="h-5 w-5" />}
                                    <span className="hidden sm:inline">{isGeneratingSpeech ? 'Gerando...' : isPlayingAudio ? 'Parar' : 'Ouvir'}</span>
                                </button>
                            )}
                        </div>
                        <AnalysisDisplay isLoading={isLoading} analysis={analysis} error={error} />
                    </div>
                </div>
            </main>
        </div>
    );
}
