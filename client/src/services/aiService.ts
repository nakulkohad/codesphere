const API_KEY = "AIzaSyD76aus2cXj_hyqg-uBKB12xiJJHyAmn4Q";
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

export async function getAIResponse(message: string): Promise<{ response?: string; error?: string }> {
    try {
        const response = await fetch(`${API_URL}?key=${API_KEY}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: message
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048,
                    topK: 1,
                    topP: 1
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error Details:', errorData);
            throw new Error(errorData.error?.message || 'Failed to get AI response');
        }

        const data = await response.json();
        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error('No response generated');
        }

        return { 
            response: data.candidates[0].content.parts[0].text
        };
    } catch (error) {
        console.error('AI Service Error:', error);
        return {
            error: error instanceof Error 
                ? `Error: ${error.message}` 
                : "Failed to get AI response"
        };
    }
} 