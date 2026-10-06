import { useState, useRef, useEffect } from "react";
import { db } from "@/integrations/db/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { Send, Trash2, Loader2, Bot, User } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function IaChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  const enviar = async () => {
    const texto = input.trim();
    if (!texto || loading) return;
    if (texto.length > 4000) {
      toast({ title: "Mensagem muito longa", description: "Máximo de 4000 caracteres", variant: "destructive" });
      return;
    }
    const novaMsg: Message = { role: "user", content: texto };
    const novas = [...messages, novaMsg];
    setMessages(novas);
    setInput("");
    setLoading(true);
    const msgs = novas.map((m) => ({ role: m.role, content: m.content }));
    const { data, error } = await db.rpc("ia_chat", {
      _caller: user,
      _messages: msgs,
      _model: model || undefined,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erro na IA", description: error.message, variant: "destructive" });
      return;
    }
    const r = data as { text: string } | null;
    if (r?.text) {
      setMessages((prev) => [...prev, { role: "assistant", content: r.text }]);
    }
  };

  const limpar = () => {
    setMessages([]);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Bot}
        title="Conversa com IA"
        subtitle="Assistente de inteligência artificial para as atividades"
        username={user}
        maxWidth="max-w-4xl"
      />

      <div className="max-w-4xl mx-auto px-6 mt-8 pb-16">
        <Card className="overflow-hidden border-border">
          {/* Header do chat */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Assistente IA</p>
                <p className="text-[10px] text-muted-foreground">
                  {model ? `Modelo: ${model}` : "Modelo padrão do servidor"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Modelo (opcional)"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="h-8 w-40 text-xs"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={limpar}
                disabled={messages.length === 0}
                className="h-8 text-muted-foreground"
                title="Limpar conversa"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Mensagens */}
          <ScrollArea className="h-[500px] p-4" ref={scrollRef}>
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <Bot className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">Inicie uma conversa</p>
                <p className="text-xs mt-1">Digite sua mensagem abaixo para começar</p>
              </div>
            )}
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex gap-2 max-w-[80%] ${
                      msg.role === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>
                    <div
                      className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-muted text-card-foreground rounded-tl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex gap-2 max-w-[80%]">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="rounded-xl bg-muted px-4 py-3 rounded-tl-sm">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-border p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                enviar();
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite sua mensagem..."
                maxLength={4000}
                disabled={loading}
                className="flex-1"
                autoFocus
              />
              <Button type="submit" disabled={loading || !input.trim()}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>
        </Card>
      </div>

      <footer className="text-center text-[10px] uppercase tracking-[0.25em] text-muted-foreground py-6">
        Desenvolvido por <span className="text-primary font-bold">DEV ALEKSANDRO ALVES</span>
      </footer>
    </div>
  );
}
