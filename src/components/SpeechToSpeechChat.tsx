import React, { useState, useRef, useEffect } from "react";
import { Paperclip, MoreHorizontal, X, Sparkles, ChevronDown } from "lucide-react";
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
    <Card className="w-96 h-[600px] flex flex-col bg-white shadow-2xl border fixed bottom-4 right-4 z-50 animate-fade-in rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="text-purple-600" size={20} />
          <span className="font-semibold text-gray-900">InterviewProcessAgent</span>
        </div>
        <div className="flex items-center space-x-1">
          <Button variant="outline" size="sm" className="text-xs px-2 py-1">
            Actions
          </Button>
          <Button variant="ghost" size="sm" className="p-1">
            <MoreHorizontal size={16} className="text-gray-600" />
          </Button>
          <Button variant="ghost" size="sm" className="p-1" onClick={onClose}>
            <X size={16} className="text-gray-600" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-6 overflow-y-auto bg-white flex flex-col items-center justify-center">
        {messages.length === 0 ? (
          <div className="text-center">
            <div className="mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-red-600 text-xl">⚠</span>
              </div>
              <p className="text-gray-600 text-sm">Failed to connect to /10.255.255.254:8080</p>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg text-sm ${
                    message.sender === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
        <div className="text-sm text-gray-700 mb-3 font-medium">Message InterviewProcessAgent</div>
        <div className="mb-3">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder=""
            className="w-full p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center space-x-1 text-purple-600 hover:bg-purple-50 p-2"
            >
              <Sparkles size={16} />
              <span className="text-sm">Suggestions</span>
              <ChevronDown size={14} />
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="p-2 hover:bg-gray-100"
            >
              <Paperclip size={16} className="text-gray-600" />
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={!inputText.trim()}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-sm font-medium"
            >
              Send
            </Button>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 mt-2">
          Verify AI-generated content for accuracy.
        </div>
      </div>
    </Card>
  );
};

export default SpeechToSpeechChat;