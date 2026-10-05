export const MadeWithDyad = () => {
  return (
    <div className="p-4 text-center mt-8"> {/* Added mt-8 for spacing */}
      <a
        href="https://www.dyad.sh/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-cyan-300 hover:text-cyan-100 dark:text-cyan-400 dark:hover:text-cyan-200 transition-colors" // Adjusted text colors
      >
        Made with Dyad
      </a>
    </div>
  );
};