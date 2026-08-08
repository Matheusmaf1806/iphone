'use client';

import { useState } from 'react';
import Loader from './Loader';

export default function GeminiRitual() {
  const [loading, setLoading] = useState(false);
  const [ritualText, setRitualText] = useState('');
  const [showContainer, setShowContainer] = useState(false);

  const getRitualSuggestion = async () => {
    setShowContainer(true);
    setRitualText('');
    setLoading(true);

    const apiKey = ''; // Será configurado via variável de ambiente em produção
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const systemPrompt =
      "Você é o 'Oráculo de Aruanda', uma entidade de luz sábia e acolhedora. Sua missão é oferecer orientação espiritual positiva, respeitosa e segura, inspirada na sabedoria da Umbanda, para pessoas que buscam paz e proteção. Suas palavras são sempre de amor, luz e axé.";
    const userQuery = `Crie uma mensagem inspiradora para o 'Oráculo de Aruanda'. A mensagem deve ser um pequeno ritual de limpeza e proteção para o lar, utilizando uma vela de 7 Ervas.

A resposta deve ser bela, poética e de fácil compreensão para qualquer pessoa. Siga esta estrutura, usando títulos em negrito (com **):

**Preparação do Ambiente:**
Descreva como preparar o local com calma e respeito.

**Firmando a Intenção:**
Um parágrafo sobre como concentrar os pensamentos em limpeza, proteção e harmonia.

**A Chama Sagrada:**
Instruções sobre como acender a vela e o que mentalizar.

**Palavras de Axé:**
Uma pequena prece ou afirmação final para selar o ritual com energia positiva.

Use uma linguagem que transmita paz e luz. A mensagem deve ser acolhedora e respeitosa, adequada para um site de produtos espirituais.`;

    try {
      const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const result = await response.json();
      const candidate = result.candidates?.[0];

      if (candidate && candidate.content?.parts?.[0]?.text) {
        let formattedText = candidate.content.parts[0].text;
        formattedText = formattedText.replace(
          /\*\*(.*?)\*\*/g,
          '<strong class="font-bold text-gray-900 block mt-4 first:mt-0 mb-1">$1</strong>'
        );
        setRitualText(formattedText);
      } else {
        setRitualText(
          'Desculpe, não foi possível gerar uma sugestão no momento. Tente novamente mais tarde.'
        );
      }
    } catch (error) {
      console.error('Error fetching ritual suggestion:', error);
      setRitualText(
        'Ocorreu um erro ao consultar o oráculo. Por favor, verifique sua conexão e tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="oraculo-container"
      className="mt-8 border-t-2 border-dashed border-gray-200 pt-6 text-center"
    >
      <h3 className="text-xl font-bold text-gray-800 mb-2 tracking-wide">
        Oráculo de Aruanda
      </h3>
      <p className="text-gray-600 mb-4 text-sm">
        Não sabe como usar sua vela? Peça uma inspiração ao nosso oráculo.
      </p>
      <button
        id="gemini-button"
        onClick={getRitualSuggestion}
        disabled={loading}
        className={`bg-gradient-to-r from-gray-800 to-black text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105 action-button ${
          loading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        ✨ Descobrir seu Ritual
      </button>
      {showContainer && (
        <div
          id="ritual-container"
          className="mt-6 text-left bg-gray-50 p-6 rounded-lg border border-gray-200 min-h-[100px]"
        >
          {loading && <div className="flex justify-center"><Loader size="md" /></div>}
          {!loading && (
            <div
              id="ritual-text"
              className="text-gray-700"
              dangerouslySetInnerHTML={{ __html: ritualText }}
            ></div>
          )}
        </div>
      )}
    </div>
  );
}
