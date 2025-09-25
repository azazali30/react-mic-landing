import { useState } from "react";
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
      <Header onChatToggle={toggleChat} isChatOpen={isChatOpen} />
      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar />
        <MainContent />
      </div>
      <SpeechToSpeechChat isOpen={isChatOpen} onClose={closeChat} />
    </div>
  );
};

export default Index;
