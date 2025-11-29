import { AI_CONFIG } from '../constants';

interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const sendMessageToAi = async (userMessage: string): Promise<string> => {
  try {
    const payload = {
      model: AI_CONFIG.MODEL,
      messages: [
        { 
          role: 'system', 
          content: '你是“川小农”，DaiP智能聊天室的AI助手。请用幽默、简短的风格回答用户的问题。' 
        },
        { role: 'user', content: userMessage }
      ],
      stream: false,
    };

    const response = await fetch(AI_CONFIG.BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('AI API Error:', errorData);
      return '川小农现在有点晕，请稍后再试... (API Error)';
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '川小农不知道该说什么...';
  } catch (error) {
    console.error('Network Error:', error);
    return '网络连接似乎断开了...';
  }
};