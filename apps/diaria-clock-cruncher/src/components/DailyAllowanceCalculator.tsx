import { useState, useRef } from "react";
import { differenceInHours, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DatePicker } from "./DatePicker";
import { toast } from "sonner";
import { Calculator, Clock, Calendar, FileDown, MapPin, Plane, Award, CheckCircle } from "lucide-react";

export function DailyAllowanceCalculator() {
  const [departureDate, setDepartureDate] = useState<Date | undefined>();
  const [departureTime, setDepartureTime] = useState("");
  const [returnDate, setReturnDate] = useState<Date | undefined>();
  const [returnTime, setReturnTime] = useState("");
  const [allowances, setAllowances] = useState<number | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleCalculate = () => {
    if (!departureDate || !departureTime || !returnDate || !returnTime) {
      toast.error("Por favor, preencha todos os campos.");
      setAllowances(null);
      return;
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(departureTime) || !timeRegex.test(returnTime)) {
        toast.error("Formato de hora inválido. Use HH:mm.");
        setAllowances(null);
        return;
    }

    const departureDateTime = new Date(departureDate);
    const [depHours, depMinutes] = departureTime.split(':').map(Number);
    departureDateTime.setHours(depHours, depMinutes, 0, 0);

    const returnDateTime = new Date(returnDate);
    const [retHours, retMinutes] = returnTime.split(':').map(Number);
    returnDateTime.setHours(retHours, retMinutes, 0, 0);

    if (returnDateTime <= departureDateTime) {
        toast.error("A data/hora de retorno deve ser posterior à de partida.");
        setAllowances(null);
        return;
    }
    
    const hoursDifference = differenceInHours(returnDateTime, departureDateTime);

    let calculatedAllowances = 0;
    if (hoursDifference >= 12 && hoursDifference <= 36) {
      calculatedAllowances = 1;
    } else if (hoursDifference > 36) {
      calculatedAllowances = 2;
    }
    
    setAllowances(calculatedAllowances);
    toast.success("Cálculo realizado com sucesso!");
  };

  const handleDownloadPdf = () => {
    if (!resultRef.current || allowances === null) {
      toast.error("Não foi possível encontrar o resultado para gerar o PDF.");
      return;
    }

    toast.info("Gerando PDF profissional... Para melhor impressão, use o tema claro.");

    // Criar PDF diretamente com jsPDF para melhor qualidade
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Cores
    const primaryColor = [59, 130, 246]; // blue-500
    const textColor = [31, 41, 55]; // gray-800
    const lightGray = [243, 244, 246]; // gray-100
    
    // Header com gradiente simulado
    pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    
    // Título
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont("helvetica", "bold");
    pdf.text("RELATÓRIO DE DIÁRIAS DE VIAGEM", pageWidth / 2, 25, { align: 'center' });
    
    // Subtítulo
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.text("Cálculo Automático Baseado em Tempo de Deslocamento", pageWidth / 2, 32, { align: 'center' });
    
    // Informações da viagem
    let yPosition = 60;
    
    // Caixa de informações
    pdf.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    pdf.rect(20, yPosition - 5, pageWidth - 40, 45, 'F');
    
    pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("DADOS DA VIAGEM", 25, yPosition + 5);
    
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    
    // Partida
    pdf.setFont("helvetica", "bold");
    pdf.text("Partida:", 25, yPosition + 15);
    pdf.setFont("helvetica", "normal");
    const departureText = `${departureDate ? format(departureDate, 'PPP', { locale: ptBR }) : ''} às ${departureTime}`;
    pdf.text(departureText, 45, yPosition + 15);
    
    // Retorno
    pdf.setFont("helvetica", "bold");
    pdf.text("Retorno:", 25, yPosition + 25);
    pdf.setFont("helvetica", "normal");
    const returnText = `${returnDate ? format(returnDate, 'PPP', { locale: ptBR }) : ''} às ${returnTime}`;
    pdf.text(returnText, 45, yPosition + 25);
    
    // Duração
    if (departureDate && returnDate) {
      const departureDateTime = new Date(departureDate);
      const [depHours, depMinutes] = departureTime.split(':').map(Number);
      departureDateTime.setHours(depHours, depMinutes, 0, 0);
      
      const returnDateTime = new Date(returnDate);
      const [retHours, retMinutes] = returnTime.split(':').map(Number);
      returnDateTime.setHours(retHours, retMinutes, 0, 0);
      
      const hoursDifference = differenceInHours(returnDateTime, departureDateTime);
      
      pdf.setFont("helvetica", "bold");
      pdf.text("Duração Total:", 25, yPosition + 35);
      pdf.setFont("helvetica", "normal");
      pdf.text(`${hoursDifference} horas`, 55, yPosition + 35);
    }
    
    // Resultado
    yPosition += 70;
    
    // Caixa do resultado
    pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.rect(20, yPosition, pageWidth - 40, 50, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text("RESULTADO DO CÁLCULO", pageWidth / 2, yPosition + 15, { align: 'center' });
    
    pdf.setFontSize(36);
    pdf.text(allowances.toString(), pageWidth / 2, yPosition + 30, { align: 'center' });
    
    pdf.setFontSize(14);
    const diariasText = allowances === 1 ? 'DIÁRIA' : 'DIÁRIAS';
    pdf.text(diariasText, pageWidth / 2, yPosition + 42, { align: 'center' });
    
    // Explicação
    yPosition += 70;
    pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("CRITÉRIOS DE CÁLCULO:", 25, yPosition);
    
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    const criterios = [
      "• Menos de 12 horas: 0 diárias",
      "• De 12 a 36 horas: 1 diária",
      "• Mais de 36 horas: 2 diárias"
    ];
    
    criterios.forEach((criterio, index) => {
      pdf.text(criterio, 25, yPosition + 10 + (index * 8));
    });
    
    // Justificativa do resultado
    yPosition += 45;
    pdf.setFont("helvetica", "bold");
    pdf.text("JUSTIFICATIVA:", 25, yPosition);
    
    pdf.setFont("helvetica", "normal");
    let justificativa = "";
    if (allowances === 0) {
      justificativa = "Tempo de deslocamento insuficiente para direito a diárias (menos de 12 horas).";
    } else if (allowances === 1) {
      justificativa = "Direito a uma diária devido ao período de deslocamento entre 12h e 36h.";
    } else {
      justificativa = `Direito a ${allowances} diárias devido ao período de deslocamento superior a 36h.`;
    }
    
    const splitText = pdf.splitTextToSize(justificativa, pageWidth - 50);
    pdf.text(splitText, 25, yPosition + 10);
    
    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text(`Documento gerado automaticamente em ${format(new Date(), 'PPP', { locale: ptBR })}`, 25, pageHeight - 20);
    pdf.text("Dev Aleksandro Alves da Rocha Junior", pageWidth - 25, pageHeight - 20, { align: 'right' });
    
    // Salvar PDF
    pdf.save("relatorio-diarias-profissional.pdf");
    toast.success("PDF profissional gerado com sucesso!");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <Card className="w-full max-w-4xl mx-auto shadow-lg border border-gray-200 dark:border-gray-700">
          <CardHeader className="text-center space-y-6 pb-8">
            <div className="mx-auto p-4 rounded-full bg-gray-100 dark:bg-gray-800 w-fit">
              <Calculator className="h-8 w-8 text-gray-700 dark:text-gray-300" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Calculadora de Diárias
              </CardTitle>
              <CardDescription className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Sistema para cálculo automático de diárias de viagem baseado no tempo de deslocamento
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-8 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Departure Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Plane className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    Partida
                  </h3>
                </div>
                <div className="space-y-4 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="space-y-2">
                    <Label htmlFor="departure-date" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Data de Partida
                    </Label>
                    <DatePicker 
                      date={departureDate} 
                      setDate={setDepartureDate} 
                      placeholder="Selecione a data de partida" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="departure-time" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Horário de Partida
                    </Label>
                    <Input
                      id="departure-time"
                      type="time"
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      className="h-11"
                    />
                  </div>
                </div>
              </div>
              
              {/* Return Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    Retorno
                  </h3>
                </div>
                <div className="space-y-4 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="space-y-2">
                    <Label htmlFor="return-date" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Data de Retorno
                    </Label>
                    <DatePicker 
                      date={returnDate} 
                      setDate={setReturnDate} 
                      placeholder="Selecione a data de retorno" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="return-time" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Horário de Retorno
                    </Label>
                    <Input
                      id="return-time"
                      type="time"
                      value={returnTime}
                      onChange={(e) => setReturnTime(e.target.value)}
                      className="h-11"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col items-center gap-8 pt-4 pb-8 px-8">
            <Button 
              onClick={handleCalculate} 
              className="w-full max-w-md h-12 text-base font-semibold"
            >
              <Calculator className="mr-2 h-5 w-5" />
              Calcular Diárias
            </Button>

            {allowances !== null && (
              <div className="w-full max-w-3xl space-y-6">
                <div 
                  ref={resultRef} 
                  className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <Award className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                      Resultado do Cálculo
                    </h3>
                  </div>

                  <div className="space-y-6 text-base text-gray-600 dark:text-gray-400 mb-8">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Plane className="h-5 w-5 text-gray-500" />
                        <span className="font-medium">Partida:</span>
                      </div>
                      <span>
                        {departureDate ? format(departureDate, 'PPP', { locale: ptBR }) : ''} às {departureTime}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-gray-500" />
                        <span className="font-medium">Retorno:</span>
                      </div>
                      <span>
                        {returnDate ? format(returnDate, 'PPP', { locale: ptBR }) : ''} às {returnTime}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="text-6xl font-bold text-gray-900 dark:text-gray-100">
                      {allowances}
                    </div>
                    <div className="text-2xl font-semibold text-gray-700 dark:text-gray-300">
                      {allowances === 1 ? 'DIÁRIA' : 'DIÁRIAS'}
                    </div>
                    <div className="text-base text-gray-600 dark:text-gray-400 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Status:</span>
                      </div>
                      {allowances === 0 && "Tempo insuficiente para direito a diárias (menos de 12 horas)."}
                      {allowances === 1 && "Direito confirmado a uma diária (período de 12h a 36h)."}
                      {allowances > 1 && `Direito confirmado a ${allowances} diárias (período superior a 36h).`}
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={handleDownloadPdf}
                  variant="outline"
                  className="w-full h-12 text-base font-medium"
                >
                  <FileDown className="mr-2 h-5 w-5" />
                  Baixar Relatório em PDF
                </Button>
              </div>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
