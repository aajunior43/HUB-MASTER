"use client";

import { useState } from "react";

export default function Page() {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Contato/Feedback</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Envie uma sugestão, relato de bug ou elogio. Seus dados não serão coletados.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className="w-full border rounded p-3 bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700"
        placeholder="Digite seu feedback aqui"
      />
      <div>
        <button
          className="px-4 py-2 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-50"
          onClick={() => setSent(true)}
          disabled={!text.trim()}
        >
          Enviar
        </button>
      </div>
      {sent && <p className="text-green-600">Obrigado! Feedback enviado (simulação).</p>}
    </div>
  );
}