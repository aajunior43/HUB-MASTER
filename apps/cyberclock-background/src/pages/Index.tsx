import Clock from '../components/Clock';

const Index = () => {
  return (
    <div className="cyberpunk-bg min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-blue-900/20 z-0"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,0.7),rgba(17,24,39,0.9))] z-1"></div>
      <Clock />
    </div>
  );
};

export default Index;