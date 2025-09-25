import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MainContent from "@/components/MainContent";
import SpeechToSpeechChat from "@/components/SpeechToSpeechChat";

const Index = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  const closeChat = () => {
    setIsChatOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar />
        <MainContent />
      </div>
      
      {/* Floating Chat Trigger Button */}
      <Button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white shadow-lg z-40 flex items-center justify-center"
        title="Open Chat"
      >
        <Sparkles size={24} className="text-white" />
      </Button>
      
      <SpeechToSpeechChat isOpen={isChatOpen} onClose={closeChat} />
    </div>
  );
};

export default Index;
