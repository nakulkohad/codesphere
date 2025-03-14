import { ChatContext as ChatContextType, ChatMessage } from "@/types/chat";
import { SocketEvent } from "@/types/socket";
import {
    ReactNode,
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";
import { useSocket } from "./SocketContext";

const ChatContext = createContext<ChatContextType | null>(null);

export const useChatRoom = (): ChatContextType => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error("useChatRoom must be used within a ChatContextProvider");
    }
    return context;
};

async function fetchAIResponse(message: string) {
    try {
        if (!import.meta.env.VITE_OPENAI_API_KEY) {
            throw new Error('OpenAI API key is not configured');
        }

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: message }],
                max_tokens: 500,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!data.choices?.[0]?.message?.content) {
            throw new Error('Invalid response format from OpenAI');
        }

        return data.choices[0].message.content;
    } catch (error) {
        console.error('Error fetching AI response:', error);
        return error instanceof Error 
            ? `Error: ${error.message}`
            : "Sorry, I couldn't process your request at the moment.";
    }
}

function ChatContextProvider({ children }: { children: ReactNode }) {
    const { socket } = useSocket();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isNewMessage, setIsNewMessage] = useState<boolean>(false);
    const [lastScrollHeight, setLastScrollHeight] = useState<number>(0);
    const [isAITyping, setIsAITyping] = useState<boolean>(false);

    useEffect(() => {
        if (!socket) {
            console.error('Socket connection not available');
            return;
        }

        const handleMessage = async ({ message }: { message: ChatMessage }) => {
            try {
                setMessages((prevMessages) => [...prevMessages, message]);
                setIsNewMessage(true);

                if (message.message.toLowerCase().startsWith("@ai")) {
                    setIsAITyping(true);
                    const query = message.message.replace(/^@ai/i, "").trim();
                    
                    if (!query) {
                        const errorMessage: ChatMessage = {
                            id: `ai-${Date.now()}`,
                            username: "AI Assistant",
                            message: "Please provide a question or prompt after @ai",
                            timestamp: new Date().toISOString()
                        };
                        setMessages((prevMessages) => [...prevMessages, errorMessage]);
                        return;
                    }

                    const aiResponse = await fetchAIResponse(query);
                    const aiMessage: ChatMessage = {
                        id: `ai-${Date.now()}`,
                        username: "AI Assistant",
                        message: aiResponse,
                        timestamp: new Date().toISOString()
                    };
                    setMessages((prevMessages) => [...prevMessages, aiMessage]);
                }
            } catch (error) {
                console.error('Error in message handler:', error);
                const errorMessage: ChatMessage = {
                    id: `ai-error-${Date.now()}`,
                    username: "AI Assistant",
                    message: "Sorry, an error occurred while processing your request.",
                    timestamp: new Date().toISOString()
                };
                setMessages((prevMessages) => [...prevMessages, errorMessage]);
            } finally {
                setIsAITyping(false);
            }
        };

        socket.on(SocketEvent.RECEIVE_MESSAGE, handleMessage);

        return () => {
            socket.off(SocketEvent.RECEIVE_MESSAGE, handleMessage);
        };
    }, [socket]);

    return (
        <ChatContext.Provider
            value={{
                messages,
                setMessages,
                isNewMessage,
                setIsNewMessage,
                lastScrollHeight,
                setLastScrollHeight,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
}

export { ChatContextProvider };
export default ChatContext;
