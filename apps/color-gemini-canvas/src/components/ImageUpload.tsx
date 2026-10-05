
import { useState, useRef } from 'react';
import { Upload, Link, X, Image as ImageIcon, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ImageUploadProps {
  onImageSelect: (file: File | string, name: string, colorCount: number) => void;
  isProcessing: boolean;
}

export function ImageUpload({ onImageSelect, isProcessing }: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string>('');
  const [imageUrl, setImageUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [colorCount, setColorCount] = useState<number>(5);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
      setFileName(file.name);
      setUploadedFile(file);
      setImageUrl(''); // Limpar URL se arquivo foi carregado
    };
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    if (url) {
      setPreview(url);
      setFileName(new URL(url).pathname.split('/').pop() || 'imagem-url');
      setUploadedFile(null);
    }
  };

  const clearImage = () => {
    setPreview('');
    setImageUrl('');
    setFileName('');
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processImage = () => {
    if (preview) {
      if (imageUrl) {
        onImageSelect(imageUrl, fileName, colorCount);
      } else if (uploadedFile) {
        onImageSelect(uploadedFile, fileName, colorCount);
      }
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Card className="p-8 shadow-card border-0 bg-card/60 backdrop-blur-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Palette className="h-14 w-14 text-primary" />
            <ImageIcon className="h-12 w-12 text-primary/70" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-3">
            Analisador de Paleta IA
          </h2>
          <p className="text-muted-foreground text-lg">
            Extraia cores dominantes usando inteligência artificial
          </p>
        </div>

        {!preview ? (
          <div className="space-y-6">
            <Tabs defaultValue="file" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="file" className="text-sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload de Arquivo
                </TabsTrigger>
                <TabsTrigger value="url" className="text-sm">
                  <Link className="h-4 w-4 mr-2" />
                  URL da Imagem
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="file">
                <div
                  className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
                    dragActive 
                      ? 'border-primary bg-primary/5 shadow-glow scale-[1.02]' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/30 hover:scale-[1.01]'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  
                  <div className="space-y-4">
                    <Upload className="h-16 w-16 text-primary mx-auto" />
                    <div>
                      <p className="text-xl font-semibold text-foreground mb-2">
                        Arraste uma imagem ou clique para selecionar
                      </p>
                      <p className="text-muted-foreground">
                        Suporte para JPEG, PNG, WEBP (máx. 10MB)
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="url">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label htmlFor="image-url" className="text-base font-medium">
                      URL da Imagem
                    </Label>
                    <div className="relative">
                      <Link className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="image-url"
                        type="url"
                        placeholder="https://exemplo.com/imagem.jpg"
                        value={imageUrl}
                        onChange={(e) => handleUrlChange(e.target.value)}
                        className="pl-12 h-12 text-base"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="bg-muted/30 rounded-xl p-6">
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Quantidade de Cores Predominantes
                </Label>
                <Select value={colorCount.toString()} onValueChange={(value) => setColorCount(Number(value))}>
                  <SelectTrigger className="w-full h-12">
                    <SelectValue placeholder="Selecione a quantidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 cores</SelectItem>
                    <SelectItem value="4">4 cores</SelectItem>
                    <SelectItem value="5">5 cores</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Escolha quantas cores dominantes deseja extrair da imagem
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative group">
              <img
                src={preview}
                alt="Preview"
                className="w-full max-h-80 object-contain rounded-xl shadow-soft border border-border/20"
              />
              <Button
                onClick={clearImage}
                size="sm"
                variant="destructive"
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="bg-muted/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium text-foreground mb-1">{fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    Extrair {colorCount} cores predominantes
                  </p>
                </div>
                <Select value={colorCount.toString()} onValueChange={(value) => setColorCount(Number(value))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 cores</SelectItem>
                    <SelectItem value="4">4 cores</SelectItem>
                    <SelectItem value="5">5 cores</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                onClick={processImage}
                disabled={isProcessing}
                className="w-full h-12 bg-gradient-primary hover:shadow-glow transition-all duration-200 text-base font-medium"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Analisando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Analisar Cores
                  </div>
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
