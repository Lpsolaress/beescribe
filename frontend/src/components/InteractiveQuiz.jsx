import React, { useState, useEffect } from 'react';

const InteractiveQuiz = ({ data }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [shuffledQuestions, setShuffledQuestions] = useState([]);

  useEffect(() => {
    if (data && data.preguntas) {
      setShuffledQuestions(data.preguntas);
    }
  }, [data]);

  const handleAnswer = (optionIndex) => {
    setAnswers({ ...answers, [currentQuestion]: optionIndex });
  };

  const nextQuestion = () => {
    if (currentQuestion < shuffledQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      calculateScore();
      setShowResult(true);
    }
  };

  const calculateScore = () => {
    let total = 0;
    shuffledQuestions.forEach((q, index) => {
      if (answers[index] === q.respuesta_correcta) {
        total += 1;
      }
    });
    setScore(total);
  };

  if (!shuffledQuestions || shuffledQuestions.length === 0) {
    const isError = data?.error || (data && !data.preguntas);
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-red-200">
        <div className={`${isError ? 'text-red-500' : 'animate-bounce text-amber-500'} mb-4 text-4xl`}>
          {isError ? '⚠️' : '🐝'}
        </div>
        <p className={`${isError ? 'text-red-800' : 'text-amber-800'} font-medium font-outfit text-center`}>
          {isError 
            ? 'No se pudieron generar las preguntas del cuestionario. Intenta de nuevo con otro fragmento o tipo.' 
            : 'Preparando tu cuestionario interactivo...'}
        </p>
        {isError && (
          <p className="text-xs text-red-400 mt-2 max-w-xs text-center italic">
            Detalle técnico: {data?.error || 'Estructura de datos inválida'}
          </p>
        )}
      </div>
    );
  }

  if (showResult) {
    const percentage = Math.round((score / shuffledQuestions.length) * 100);
    return (
      <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 max-w-3xl mx-auto border border-white animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="relative inline-block mb-6">
             <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={364.4} strokeDashoffset={364.4 - (364.4 * percentage) / 100} className="text-amber-500 transition-all duration-1000 ease-out" strokeLinecap="round" />
             </svg>
             <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-black text-gray-800 font-outfit">{percentage}%</span>
             </div>
          </div>
          <h2 className="text-4xl font-black text-gray-900 mb-2 font-outfit">¡Desafío Completado!</h2>
          <p className="text-gray-500 font-medium italic">Has acertado {score} de {shuffledQuestions.length} preguntas</p>
        </div>
        
        <div className="space-y-6">
          {shuffledQuestions.map((q, idx) => (
            <div key={idx} className={`p-6 rounded-2xl border-2 transition-all duration-300 ${answers[idx] === q.respuesta_correcta ? 'border-green-100 bg-green-50/50' : 'border-red-100 bg-red-50/50'}`}>
              <div className="flex items-start gap-4">
                <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center font-bold ${answers[idx] === q.respuesta_correcta ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {answers[idx] === q.respuesta_correcta ? '✓' : '✗'}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-800 text-lg leading-tight mb-3 font-outfit">{q.pregunta}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                    {q.opciones.map((opt, i) => (
                        <div key={i} className={`px-4 py-2 rounded-xl text-sm font-medium ${
                            i === q.respuesta_correcta ? 'bg-green-100 text-green-800 border-2 border-green-200' : 
                            i === answers[idx] ? 'bg-red-100 text-red-800 border-2 border-red-200' : 'bg-white/50 text-gray-400'
                        }`}>
                            {opt}
                        </div>
                    ))}
                  </div>
                  <div className="bg-white/60 p-4 rounded-xl border border-white">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Por qué es así:</p>
                    <p className="text-sm text-gray-700 leading-relaxed italic">{q.explicacion}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={() => { setShowResult(false); setCurrentQuestion(0); setAnswers({}); }}
          className="w-full mt-10 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl font-black text-xl hover:shadow-xl hover:shadow-amber-200 transition-all transform hover:-translate-y-1 active:scale-95 font-outfit"
        >
          Reintentar el Test
        </button>
      </div>
    );
  }

  const q = shuffledQuestions[currentQuestion];

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 max-w-3xl mx-auto border border-white transition-all duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
           <h3 className="text-xs font-black uppercase tracking-[0.2em] text-amber-600 mb-1 font-outfit">Progreso de Evaluación</h3>
           <div className="flex gap-2 mt-2">
             {shuffledQuestions.map((_, idx) => (
                <button 
                    key={idx}
                    onClick={() => setCurrentQuestion(idx)}
                    className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center transition-all ${
                        currentQuestion === idx ? 'bg-amber-500 text-white shadow-lg shadow-amber-200 scale-110' :
                        answers[idx] !== undefined ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                >
                    {idx + 1}
                </button>
             ))}
           </div>
        </div>
        <div className="text-right flex-shrink-0">
           <span className="text-3xl font-black text-gray-900 font-outfit">{currentQuestion + 1}<span className="text-lg text-gray-400">/{shuffledQuestions.length}</span></span>
        </div>
      </div>

      <div className="mb-10 min-h-[80px]">
        <h2 className="text-2xl md:text-3xl font-black text-gray-800 leading-tight font-outfit">{q.pregunta}</h2>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {q.opciones.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => handleAnswer(idx)}
            className={`w-full text-left p-6 rounded-2xl border-4 transition-all duration-300 flex items-center gap-5 group
              ${answers[currentQuestion] === idx 
                ? 'border-amber-500 bg-amber-50/50 shadow-inner' 
                : 'border-white bg-white hover:border-amber-200 hover:bg-amber-50/30 shadow-sm hover:shadow-md'}`}
          >
            <div className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center font-bold text-lg transition-all
              ${answers[currentQuestion] === idx ? 'bg-amber-500 border-amber-500 text-white rotate-[360deg]' : 'border-gray-100 text-gray-300 group-hover:border-amber-300 group-hover:text-amber-500'}`}>
              {String.fromCharCode(65 + idx)}
            </div>
            <span className={`text-lg transition-colors ${answers[currentQuestion] === idx ? 'text-amber-900 font-black' : 'text-gray-600 font-semibold'}`}>{opt}</span>
          </button>
        ))}
      </div>

      <div className="mt-12 flex items-center justify-between">
        <button 
           onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
           disabled={currentQuestion === 0}
           className={`font-black text-sm uppercase tracking-widest ${currentQuestion === 0 ? 'text-gray-300' : 'text-amber-600 hover:text-amber-800'}`}
        >
            ← Anterior
        </button>
        <button
          onClick={nextQuestion}
          disabled={answers[currentQuestion] === undefined}
          className={`flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-lg transition-all
            ${answers[currentQuestion] === undefined 
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
              : currentQuestion === shuffledQuestions.length - 1
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-xl hover:shadow-green-200 shadow-lg active:scale-95 animate-pulse'
                : 'bg-amber-500 text-white hover:bg-amber-600 shadow-xl shadow-amber-100 active:scale-95'}`}
        >
          {currentQuestion === shuffledQuestions.length - 1 ? 'Finalizar Cuestionario' : 'Siguiente'}
          <span>{currentQuestion === shuffledQuestions.length - 1 ? '🏆' : '→'}</span>
        </button>
      </div>
    </div>
  );
};

export default InteractiveQuiz;
