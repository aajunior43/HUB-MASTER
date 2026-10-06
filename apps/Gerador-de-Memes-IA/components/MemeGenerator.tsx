import React, { useState, useRef, useCallback } from 'react';
import { generateMemeText } from '../services/geminiService';
import { UploadIcon, DownloadIcon, SparklesIcon, LoadingIcon, ImageIcon } from './icons';

interface MemeGeneratorProps {
    onApiKeyError: () => void;
}

const MemeGenerator: React.FC<MemeGeneratorProps> = ({ onApiKeyError }) => {
    const [image, setImage] = useState<string | null>(null);
    const [topText, setTopText] = useState<string>('');
    const [bottomText, setBottomText] = useState<string>('');
    const [theme, setTheme] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);

    const memeRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processFile = (file: File) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setImage(event.target?.result as string);
                setError(null);
                setTopText('');
                setBottomText('');
                setTheme('');
            };
            reader.readAsDataURL(file);
        } else {
            setError('Por favor, selecione um arquivo de imagem válido.');
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleDragEvents = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    };

    const handleDownload = useCallback(() => {
        if (!memeRef.current) return;

        (window as any).htmlToImage.toPng(memeRef.current, { cacheBust: true, pixelRatio: 2.5 })
            .then((dataUrl: string) => {
                const link = document.createElement('a');
                link.download = 'meu-meme.png';
                link.href = dataUrl;
                link.click();
            })
            .catch((err: Error) => {
                console.error('Oops, something went wrong!', err);
                setError('Erro ao baixar a imagem. Tente novamente.');
            });
    }, [memeRef]);

    const handleGenerateWithAI = async () => {
        if (!image) {
            setError('Por favor, carregue uma imagem primeiro.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const memeText = await generateMemeText(image, theme);
            setTopText(memeText.topText.toUpperCase());
            setBottomText(memeText.bottomText.toUpperCase());
        } catch (err) {
            if (err instanceof Error && err.message === 'API_KEY_ERROR') {
                onApiKeyError();
            } else {
                setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const memeTextStyle: React.CSSProperties = {
        fontFamily: "'Impact', 'Arial Black', sans-serif",
        textShadow: '3px 3px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 3px 0px 0 #000, -3px 0px 0 #000, 0px 3px 0 #000, 0px -3px 0 #000',
        wordBreak: 'break-word',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
    };

    return (
        <div className="w-full max-w-5xl p-4 md:p-6 bg-gray-900/50 rounded-2xl shadow-2xl border border-gray-700/50 backdrop-blur-sm">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* Controls Column */}
                <fieldset disabled={isLoading} className="group flex flex-col space-y-5 transition-opacity duration-300 ease-in-out group-disabled:opacity-50">
                    <div>
                         <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            accept="image/*"
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-all duration-200"
                        >
                            <UploadIcon />
                            {image ? 'Trocar Imagem' : 'Selecionar Imagem'}
                        </button>
                    </div>

                    {image && (
                        <>
                            <div className="space-y-4 bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                                <h3 className="font-semibold text-lg text-gray-200">Personalize seu Meme</h3>
                                <div className="space-y-3">
                                    <label htmlFor="theme" className="font-medium text-gray-400">Tema/Assunto (Opcional)</label>
                                    <input
                                        id="theme"
                                        type="text"
                                        value={theme}
                                        onChange={(e) => setTheme(e.target.value)}
                                        placeholder="Ex: Vida de programador, segunda-feira"
                                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label htmlFor="top-text" className="font-medium text-gray-400">Texto Superior</label>
                                    <input
                                        id="top-text"
                                        type="text"
                                        value={topText}
                                        onChange={(e) => setTopText(e.target.value)}
                                        placeholder="Digite o texto de cima"
                                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label htmlFor="bottom-text" className="font-medium text-gray-400">Texto Inferior</label>
                                    <input
                                        id="bottom-text"
                                        type="text"
                                        value={bottomText}
                                        onChange={(e) => setBottomText(e.target.value)}
                                        placeholder="Digite o texto de baixo"
                                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-3 pt-2">
                                <button
                                    onClick={handleGenerateWithAI}
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? <LoadingIcon /> : <SparklesIcon />}
                                    {isLoading ? 'Gerando Magia...' : 'Gerar com IA'}
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-all duration-200 disabled:opacity-50"
                                >
                                    <DownloadIcon />
                                    Baixar Meme
                                </button>
                            </div>
                        </>
                    )}
                     {error && <p className="text-red-400 text-sm mt-2 text-center animate-pulse">{error}</p>}
                </fieldset>
                
                {/* Preview Column */}
                <div 
                    className={`flex justify-center items-center bg-gray-900/50 rounded-lg p-2 border-2 border-dashed  min-h-[350px] lg:min-h-full transition-colors duration-300 ${isDragging ? 'border-blue-500' : 'border-gray-600/50'}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragEvents}
                    onDragEnter={handleDragEvents}
                    onDragLeave={handleDragEvents}
                >
                    {image ? (
                        <div ref={memeRef} className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black">
                            <img 
                                src={image} 
                                alt="Meme preview" 
                                className={`max-w-full max-h-full object-contain transition-transform duration-300 ${isLoading ? 'animate-gentle-pulse' : ''}`}
                            />
                            <div 
                                style={memeTextStyle}
                                className="absolute top-0 left-0 right-0 p-4 text-center text-2xl sm:text-3xl md:text-4xl font-black uppercase text-white"
                            >
                                {topText}
                            </div>
                            <div 
                                style={memeTextStyle}
                                className="absolute bottom-0 left-0 right-0 p-4 text-center text-2xl sm:text-3xl md:text-4xl font-black uppercase text-white"
                            >
                                {bottomText}
                            </div>
                        </div>
                    ) : (
                        <div onClick={() => fileInputRef.current?.click()} className="text-center text-gray-500 cursor-pointer p-8">
                            <ImageIcon className="mx-auto h-16 w-16 mb-4 text-gray-600"/>
                            <h3 className="font-semibold text-gray-300 text-lg">Arraste e solte uma imagem aqui</h3>
                            <p className="text-sm">ou <span className="text-blue-500 font-semibold">clique para selecionar</span></p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MemeGenerator;