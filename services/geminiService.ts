
import { GoogleGenAI } from "@google/genai";
import { RiskProfile, DailyStat, Language } from "../types";

export const getTradingInsights = async (profile: RiskProfile, history: DailyStat[], lang: Language) => {
  // Initialize GoogleGenAI with API key directly from process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const historyString = history.slice(-15).map(h => 
    `${h.date}: $${h.pnlAmount} [${h.category}/${h.subCategory}${h.strategy !== 'NONE' ? '/' + h.strategy : ''}]`
  ).join('\n');
  
  const prompt = lang === 'ru' ? `
    Как профессиональный риск-менеджер, проанализируй историю торгов для профиля "${profile.name}":
    
    Начальный капитал: $${profile.initialCapital}
    Текущий баланс: $${profile.currentBalance}
    История по категориям (Акции/Опционы/Стратегии):
    ${historyString}
    
    Дай 3 кратких совета. Обрати внимание на то, в каких категориях (Акции или Опционы) трейдер наиболее эффективен, а где теряет деньги. 
    Пиши на русском языке. Будь конкретен и профессионален.
  ` : `
    As a professional risk manager, analyze the following categorical trading history for profile "${profile.name}":
    
    Initial Capital: $${profile.initialCapital}
    Current Balance: $${profile.currentBalance}
    History by Categories (Stocks/Options/Strategies):
    ${historyString}
    
    Provide 3 concise insights. Specifically mention which categories (Stocks or Options) are most profitable vs most risky for this trader.
    Keep it professional and actionable.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return lang === 'ru' 
      ? "Не удалось сгенерировать аналитику. Сосредоточьтесь на категориях, приносящих убыток."
      : "Unable to generate insights. Focus on loss-making categories.";
  }
};
