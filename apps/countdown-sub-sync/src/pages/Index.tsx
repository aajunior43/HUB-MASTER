import { useState } from "react";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { SubscriptionForm } from "@/components/SubscriptionForm";


import { ExportImport } from "@/components/ExportImport";
import UserMenu from "@/components/UserMenu";
import { Subscription, SubscriptionFormData } from "@/types/subscription";
import { CreditCard, DollarSign, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubscriptions } from "@/hooks/use-subscriptions";
import { useNotifications } from "@/hooks/use-notifications";

const Index = () => {
  const { 
    subscriptions, 
    loading, 
    addSubscription, 
    updateSubscription, 
    deleteSubscription 
  } = useSubscriptions();
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);

  // Inicializar sistema de notificações
  useNotifications(subscriptions);



  // Add new subscription
  const handleAddSubscription = (data: SubscriptionFormData) => {
    addSubscription(data);
  };

  // Edit subscription
  const handleEditSubscription = (data: SubscriptionFormData) => {
    if (!editingSubscription) return;
    updateSubscription(editingSubscription.id, data);
    setEditingSubscription(null);
  };

  // Delete subscription
  const handleDeleteSubscription = (id: string) => {
    deleteSubscription(id);
  };

  // Import subscriptions
  const handleImportSubscriptions = (importedSubscriptions: Subscription[]) => {
    // TODO: Implementar import no Supabase
    console.log('Import subscriptions:', importedSubscriptions);
  };

  // Calculate statistics
  const totalMonthlySpending = subscriptions.reduce((total, sub) => total + sub.price, 0);
  const activeSubscriptions = subscriptions.filter(sub => sub.isActive).length;
  const upcomingRenewals = subscriptions.filter(sub => {
    const renewalDate = new Date(sub.renewalDate);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return renewalDate <= nextWeek && renewalDate >= new Date();
  }).length;

  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      background: 'radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Starfield Background */}
      <div className="fixed inset-0 z-0">
        {/* Stars */}
        {Array.from({ length: 150 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 'px',
              height: Math.random() * 2 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              opacity: Math.random() * 0.8 + 0.2,
              animation: `twinkle ${Math.random() * 3 + 2}s infinite alternate`
            }}
          />
        ))}
        
        {/* Meteors */}
        {Array.from({ length: 1 }).map((_, i) => {
          const directions = [
            { movementAngle: 225, tailAngle: 45 },
            { movementAngle: 315, tailAngle: 135 },
            { movementAngle: 135, tailAngle: 315 },
            { movementAngle: 45, tailAngle: 225 }
          ];
          const direction = directions[Math.floor(Math.random() * directions.length)];
          const tailAngle = direction.tailAngle + (Math.random() - 0.5) * 10;
          
          return (
            <div
              key={`meteor-${i}`}
              className="absolute"
              style={{
                width: '80px',
                height: '1px',
                background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.05) 40%, rgba(255,255,255,0.2) 70%, rgba(255,255,255,0.4) 90%, rgba(255,255,255,0.6) 100%)',
                borderRadius: '0.5px',
                boxShadow: '0 0 4px 0.5px rgba(255,255,255,0.2), 0 0 8px 1px rgba(255,255,255,0.05)',
                animation: `meteor-main ${Math.random() * 20 + 40}s linear infinite`,
                animationDelay: `${Math.random() * 30}s`,
                transform: `rotate(${tailAngle}deg)`,
                filter: 'blur(0.2px)'
              }}
            />
          );
        })}
      </div>
      
      {/* Enhanced CSS Animations */}
      <style>{`
        @keyframes twinkle {
          0% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0.2; transform: scale(1); }
        }
        
        @keyframes meteor-main {
          0% {
            transform: translateX(-20vw) translateY(-20vh);
            opacity: 0;
          }
          3% {
            opacity: 0.6;
          }
          97% {
            opacity: 0.6;
          }
          100% {
            transform: translateX(120vw) translateY(120vh);
            opacity: 0;
          }
        }
        
        @keyframes fade-in {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
          }
          50% {
            box-shadow: 0 0 40px rgba(139, 92, 246, 0.6), 0 0 60px rgba(139, 92, 246, 0.3);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
      
      {/* Enhanced Header */}
      <header className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 pointer-events-none animate-pulse-glow" />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent pointer-events-none" />
        <div className="container mx-auto px-6 py-8 relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3 animate-fade-in">
              <div className="relative">
                <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent animate-float">
                  Minhas Assinaturas
                </h1>
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 blur-xl opacity-50 animate-pulse-glow"></div>
              </div>
              <p className="text-gray-300 text-lg font-medium tracking-wide">✨ Gerencie suas assinaturas no espaço sideral</p>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Sistema online • {subscriptions.length} assinaturas</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 animate-fade-in" style={{ animationDelay: '200ms' }}>
              <div className="transform hover:scale-105 transition-transform duration-300">
                <UserMenu />
              </div>
              <div className="transform hover:scale-105 transition-transform duration-300">
                <ExportImport
                  subscriptions={subscriptions}
                  onImport={handleImportSubscriptions}
                />
              </div>
              <div className="transform hover:scale-105 transition-transform duration-300">
                <SubscriptionForm
                  onSubmit={handleAddSubscription}
                  editingSubscription={editingSubscription}
                  onCancel={() => setEditingSubscription(null)}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-6 py-10">
        {/* Enhanced Statistics */}
        <section className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="group bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-xl border border-white/20 hover:border-green-400/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-green-400/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Total Mensal</p>
                    <p className="text-xl font-bold text-white group-hover:text-green-400 transition-colors duration-300">R$ {totalMonthlySpending.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">Gastos recorrentes</p>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-400/20 rounded-full blur-md group-hover:blur-lg transition-all duration-300"></div>
                    <DollarSign className="relative h-6 w-6 text-green-400 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-xl border border-white/20 hover:border-blue-400/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-blue-400/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Ativas</p>
                    <p className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors duration-300">{activeSubscriptions}</p>
                    <p className="text-xs text-gray-500">Serviços ativos</p>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-md group-hover:blur-lg transition-all duration-300"></div>
                    <CreditCard className="relative h-6 w-6 text-blue-400 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-xl border border-white/20 hover:border-orange-400/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-orange-400/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Próximas</p>
                    <p className="text-xl font-bold text-white group-hover:text-orange-400 transition-colors duration-300">{upcomingRenewals}</p>
                    <p className="text-xs text-gray-500">Vencimentos (7 dias)</p>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 bg-orange-400/20 rounded-full blur-md group-hover:blur-lg transition-all duration-300"></div>
                    <Calendar className="relative h-6 w-6 text-orange-400 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Edit Form */}
        {editingSubscription && (
          <div className="mb-8">
            <SubscriptionForm
              onSubmit={handleEditSubscription}
              editingSubscription={editingSubscription}
              onCancel={() => setEditingSubscription(null)}
            />
          </div>
        )}

        {/* Enhanced Main Content */}
        {subscriptions.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-blue-500/30 rounded-3xl blur-2xl animate-pulse-glow"></div>
              <div className="relative w-24 h-24 bg-gradient-to-br from-purple-500 via-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl animate-float">
                <CreditCard className="h-12 w-12 text-white" />
              </div>
            </div>
            <div className="space-y-4 mb-8">
              <h3 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                🚀 Bem-vindo ao espaço!
              </h3>
              <p className="text-gray-300 text-lg max-w-md mx-auto leading-relaxed">
                Sua jornada de gerenciamento de assinaturas começa aqui. Adicione sua primeira assinatura e explore o universo de possibilidades.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
                  <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
                </div>
                <span>Pronto para começar</span>
              </div>
            </div>
            
            <div className="transform hover:scale-105 transition-transform duration-300">
              <SubscriptionForm
                onSubmit={handleAddSubscription}
                editingSubscription={editingSubscription}
                onCancel={() => setEditingSubscription(null)}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">

            {/* Subscriptions Grid */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-white">Suas Assinaturas</h2>
                <span className="text-sm text-gray-300">
                  {subscriptions.length} {subscriptions.length === 1 ? 'assinatura' : 'assinaturas'}
                </span>
              </div>
              
              {subscriptions.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-2xl">
                    <CreditCard className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    Nenhuma assinatura encontrada
                  </h3>
                  <p className="text-gray-300 text-lg max-w-md mx-auto leading-relaxed">
                    Adicione sua primeira assinatura para começar a gerenciar seus gastos mensais.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {subscriptions.map((subscription, index) => (
                    <div
                      key={subscription.id}
                      className="animate-fade-in"
                      style={{
                        animationDelay: `${index * 100}ms`,
                        animationFillMode: 'both'
                      }}
                    >
                      <SubscriptionCard
                        subscription={subscription}
                        onEdit={setEditingSubscription}
                        onDelete={handleDeleteSubscription}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
      
      {/* Enhanced Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-xl mt-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-purple-500/5 to-transparent pointer-events-none" />
        <div className="container mx-auto px-6 py-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center animate-pulse-glow">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <div className="h-px w-12 bg-gradient-to-r from-transparent via-purple-400 to-transparent"></div>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center animate-pulse-glow" style={{ animationDelay: '1s' }}>
                <span className="text-white font-bold text-sm">A</span>
              </div>
            </div>
            <p className="text-sm font-medium bg-gradient-to-r from-gray-300 to-gray-500 bg-clip-text text-transparent">
              Desenvolvido com ❤️ por <span className="text-purple-400 font-semibold">ALEKSANDRO ALVES</span>
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
                Sistema Online
              </span>
              <span>•</span>
              <span>Versão 2.0</span>
              <span>•</span>
              <span>🚀 Espacial</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
