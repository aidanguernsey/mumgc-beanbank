import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, User, Bet } from '../types';

// Initialize Gemini Client
// We use a getter to lazy-load the client. This prevents the app from crashing 
// on load if the environment variable isn't immediately available during module evaluation.
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const GeminiService = {
  /**
   * The Bean Oracle: Analyzes the economy and chat with the user.
   */
  askOracle: async (
    query: string, 
    users: User[], 
    transactions: Transaction[], 
    bets: Bet[]
  ): Promise<string> => {
    try {
      const ai = getAiClient();
      
      // Prepare context data
      const economyContext = {
        totalCirculation: users.reduce((acc, u) => acc + u.balance, 0),
        leaderboard: users.map(u => `${u.username} (${u.section}): ${u.balance} beans`).join(', '),
        recentTransactions: transactions.slice(0, 10).map(t => 
          `${t.fromUserId === 'SYSTEM' ? 'Bank' : t.fromUserId} paid ${t.toUserId} ${t.amount} beans for "${t.description}"`
        ).join('\n'),
        activeBets: bets.filter(b => b.status === 'OPEN').map(b => b.title).join(', ')
      };

      const systemPrompt = `
        You are the 'Bean Oracle', the mystical and slightly sarcastic financial advisor for a Choir's virtual bank.
        The currency is 'Beans'.
        
        Here is the current state of the Choir Economy:
        - Total Beans in Circulation: ${economyContext.totalCirculation}
        - Leaderboard: ${economyContext.leaderboard}
        - Recent Transactions: 
        ${economyContext.recentTransactions}
        - Active Bets: ${economyContext.activeBets}

        Answer the user's question based on this data. 
        If they ask for financial advice, give terrible, funny advice related to singing or beans.
        If they ask who is rich, tell them based on the leaderboard.
        If they ask about recent drama, look at the transaction descriptions.
        Keep it brief (under 100 words) and entertaining.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: query,
        config: {
          systemInstruction: systemPrompt
        }
      });

      return response.text || " The Oracle is silent... (No response generated)";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "The Oracle is currently meditating (API Error). Please try again later.";
    }
  },

  /**
   * Suggests a category and emoji for a transaction description.
   */
  categorizeTransaction: async (description: string): Promise<{ category: string, emoji: string }> => {
     try {
       const ai = getAiClient();

       const response = await ai.models.generateContent({
         model: 'gemini-2.5-flash',
         contents: `Classify this transaction description: "${description}"`,
         config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                emoji: { type: Type.STRING }
              }
            }
         }
       });
       
       const text = response.text;
       if (!text) return { category: 'General', emoji: '💸' };
       
       return JSON.parse(text);
     } catch (e) {
       console.error("Categorization failed", e);
       return { category: 'General', emoji: '💸' };
     }
  }
};