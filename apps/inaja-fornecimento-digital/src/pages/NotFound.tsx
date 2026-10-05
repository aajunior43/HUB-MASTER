import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <h1 className="text-4xl font-display font-bold mb-4 text-primary">404</h1>
        <p className="text-xl text-muted-foreground mb-4">Página não encontrada</p>
        <Link to="/" className="text-primary font-medium hover:underline">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
