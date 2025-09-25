import React, { useState, useRef, useEffect } from "react";
import { Paperclip, Mic, MicOff, Send, MoreHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AudioPlayer } from "@/lib/audioPlayer";

interface Message {
  id: string;
  text: string;
  sender: "user" | "agent";
  timestamp: Date;
}

interface SpeechToSpeechChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const SpeechToSpeechChat = ({ isOpen, onClose }: SpeechToSpeechChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState("Disconnected");
  
  const websocketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize audio player
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        audioPlayerRef.current = new AudioPlayer();
      } catch (error) {
        console.error("Failed to initialize audio player:", error);
      }
    };
    
    initializeAudio();
    
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.stop();
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText("");

    // Simulate agent response
    setTimeout(() => {
      const agentResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "I understand your request. How can I assist you further?",
        sender: "agent",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, agentResponse]);
    }, 1000);
  };

  const toggleRecording = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            // Process audio data here
            console.log("Audio data received:", event.data);
          }
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        setStatus("Recording...");
      } catch (error) {
        console.error("Error starting recording:", error);
      }
    } else {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
      setStatus("Processing...");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <Card className="w-72 h-96 flex flex-col bg-card shadow-lg border fixed top-20 right-4 z-50 animate-fade-in">
      {/* Header */}
      <div className="p-4 border-b border-border bg-[hsl(var(--pulse-header))] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="font-semibold text-foreground">Pulse</span>
        </div>
        <Button variant="ghost" size="sm">
          <MoreHorizontal size={16} />
        </Button>
      </div>

      {/* Agent Info */}
      <div className="p-4 border-b border-border bg-card flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">A</span>
          </div>
          <div>
            <div className="font-medium text-sm text-foreground">InterviewProcessAgent</div>
            <div className="text-xs text-muted-foreground">Post</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X size={16} />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm">
            Start a conversation...
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg text-sm ${
                message.sender === "user"
                  ? "bg-[hsl(var(--user-bubble))] text-foreground"
                  : "bg-[hsl(var(--agent-bubble))] text-foreground"
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-card">
        <div className="text-xs text-muted-foreground mb-2">
          Message InterviewProcessAgent
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="pr-16 bg-background"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-muted"
              >
                <Paperclip size={14} className="text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 ${
                  isRecording 
                    ? "bg-red-100 hover:bg-red-200 text-red-600" 
                    : "hover:bg-muted"
                }`}
                onClick={toggleRecording}
              >
                {isRecording ? (
                  <MicOff size={14} />
                ) : (
                  <Mic size={14} className="text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4"
          >
            Send
          </Button>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Verify AI-generated content for accuracy.
        </div>
      </div>
    </Card>
  );
};

export default SpeechToSpeechChat;