import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MainContent from "@/components/MainContent";
import SpeechToSpeechChat from "@/components/SpeechToSpeechChat";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar />
        <MainContent />
        <div className="w-80 border-l border-border">
          <SpeechToSpeechChat />
        </div>
      </div>
    </div>
  );
};

export default Index;
