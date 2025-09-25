import React, { useState, useRef, useEffect } from "react";
import { Paperclip, MoreHorizontal, X, Sparkles, ChevronDown, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AudioPlayer, base64ToFloat32Array } from "@/lib/audioPlayer";

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
  const [status, setStatus] = useState("Ready to connect");
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioChunks, setAudioChunks] = useState<Float32Array[]>([]);
  
  const websocketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<any>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isRecordingRef = useRef<boolean>(false);

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
      // Cleanup on unmount
      console.log("Cleaning up SpeechToSpeechChat component...");
      
      // Disconnect WebSocket properly
      if (websocketRef.current) {
        try {
          if (websocketRef.current.readyState === WebSocket.OPEN) {
            sendCommand('end_session');
          }
          websocketRef.current.close();
        } catch (err) {
          console.error("Error closing WebSocket:", err);
        }
        websocketRef.current = null;
      }
      
      // Stop audio player
      if (audioPlayerRef.current) {
        audioPlayerRef.current.stop();
      }
      
      // Stop recording if active
      if (isRecordingRef.current) {
        isRecordingRef.current = false;
        setIsRecording(false);
      }
      
      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      
      // Stop media streams
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Stop speech synthesis
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  // Handle component close
  const handleClose = () => {
    console.log("Closing SpeechToSpeechChat...");
    disconnect();
    onClose();
  };

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

  // Convert array buffer to base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    return window.btoa(binary);
  };

  // WebSocket event handlers
  const handleWebSocketOpen = () => {
    console.log("WebSocket connection opened successfully");
    setIsConnected(true);
    setStatus('Connected - Ready to record');
    
    // Add system message for connection
    const systemMessage: Message = {
      id: Date.now().toString(),
      text: "Connected to Nova Sonic speech-to-speech service. You can now start recording.",
      sender: "agent",
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, systemMessage]);
    
    // Log WebSocket state
    console.log("WebSocket state:", {
      url: websocketRef.current?.url,
      readyState: websocketRef.current?.readyState,
      protocol: websocketRef.current?.protocol,
      extensions: websocketRef.current?.extensions
    });
  };

  const handleWebSocketMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      console.log("handleWebSocketMessage", data.type, data);
      
      switch (data.type) {
        case 'status':
          setStatus(data.status);
          if (data.message) {
            // Filter out technical debug messages from appearing in chat
            const technicalMessages = [
              'Received',
              'bytes of audio data',
              'Processing your request',
              'Waiting for response',
              'audio_received',
              'Recording started',
              'Recording stopped',
              'Sending audio data'
            ];
            
            const isTechnicalMessage = technicalMessages.some(msg => data.message.includes(msg));
            
            if (!isTechnicalMessage) {
              const statusMessage: Message = {
                id: Date.now().toString(),
                text: data.message,
                sender: "agent",
                timestamp: new Date(),
              };
              setMessages(prev => [...prev, statusMessage]);
            } else {
              console.log("Filtered technical message:", data.message);
            }
          }
          break;
          
        case 'text':
          // Add text message
          const textMessage: Message = {
            id: Date.now().toString(),
            text: data.content,
            sender: data.role === 'user' ? 'user' : 'agent',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, textMessage]);
          
          // Nova Sonic API handles both text and audio responses
          // No need for local speech synthesis - the server should send audio separately
          console.log("Received text response from Nova Sonic:", data.content);
          break;
          
        case 'audio':
          // Process audio data - don't show debug messages in chat
          console.log("Received audio data from server:", {
            format: data.format,
            contentType: data.contentType,
            sampleRate: data.sampleRate,
            channels: data.channels,
            bitsPerSample: data.bitsPerSample,
            contentLength: data.content ? data.content.length : 0
          });
          
          if (data.format === 'base64' && data.contentType === 'audio/pcm') {
            try {
              // Convert base64 PCM to Float32Array for the audio player
              const audioData = base64ToFloat32Array(data.content);
              console.log(`Converted audio data: ${audioData.length} samples, first few values:`, audioData.slice(0, 10));
              
              // Ensure audio player is initialized and started
              if (audioPlayerRef.current) {
                // Start audio player if not already started (non-async call)
                audioPlayerRef.current.start().then(() => {
                  console.log("Audio player started, now playing audio...");
                  if (audioPlayerRef.current) {
                    audioPlayerRef.current.playAudio(audioData);
                    console.log("Audio playback initiated successfully");
                    setStatus("Playing audio response...");
                  }
                }).catch(startErr => {
                  console.error("Error starting audio player:", startErr);
                  // Try to play anyway in case it's already started
                  if (audioPlayerRef.current) {
                    audioPlayerRef.current.playAudio(audioData);
                  }
                });
              } else {
                console.error("Audio player not initialized");
              }
            } catch (err) {
              console.error("Error playing audio:", err);
            }
          } else {
            console.error("Received audio with unsupported format:", data.format, data.contentType);
          }
          break;
          
        case 'tool_use':
          // Add tool use message
          const toolUseMessage: Message = {
            id: Date.now().toString(),
            text: `Using tool: ${data.toolName}`,
            sender: "agent",
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, toolUseMessage]);
          break;
          
        case 'tool_result':
          // Add tool result message
          const toolResultMessage: Message = {
            id: Date.now().toString(),
            text: `Tool result: ${JSON.stringify(data.result)}`,
            sender: "agent",
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, toolResultMessage]);
          break;
          
        case 'error':
          setStatus(`Error: ${data.message}`);
          const errorMessage: Message = {
            id: Date.now().toString(),
            text: `Error: ${data.message}`,
            sender: "agent",
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, errorMessage]);
          break;
          
        default:
          console.log('Unknown message type:', data);
      }
    } catch (err) {
      console.error('Error processing message:', err);
    }
  };

  const handleWebSocketError = (error: Event) => {
    console.error("WebSocket error:", error);
    setStatus(`WebSocket error: Connection failed`);
  };

  const handleWebSocketClose = (event: CloseEvent) => {
    console.log("WebSocket connection closed:", {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });
    
    setIsConnected(false);
    setStatus('Disconnected');
    
    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }
    
    console.log(`Disconnected from Nova Sonic. ${event.wasClean ? 'Connection closed cleanly.' : 'Connection interrupted.'}`);
  };

  // Send a command to the server
  const sendCommand = (command: string, data: any = {}) => {
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      const message = {
        type: 'command',
        command: command,
        ...data
      };
      
      const messageStr = JSON.stringify(message);
      console.log(`Sending command to server: ${command}`, message);
      websocketRef.current.send(messageStr);
    } else {
      console.error(`Cannot send command ${command}: WebSocket not open`, {
        websocketExists: !!websocketRef.current,
        readyState: websocketRef.current ? websocketRef.current.readyState : 'N/A'
      });
    }
  };


  // Start recording audio using Web Audio API for direct PCM capture
  const startRecording = async () => {
    try {
      console.log("Starting recording with Web Audio API...");
      
      // Set recording state first
      setIsRecording(true);
      isRecordingRef.current = true;
      setAudioChunks([]);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      console.log("Microphone access granted");
      streamRef.current = stream;
      
      // Create audio context with the target sample rate
      audioContextRef.current = new AudioContext({
        sampleRate: 16000
      });
      
      console.log("Audio context created with sample rate:", 16000);
      
      // Create a MediaStreamAudioSourceNode from the microphone stream
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Create a ScriptProcessorNode to capture raw audio data
      const bufferSize = 4096; // Buffer size for processing
      const processor = audioContextRef.current.createScriptProcessor(bufferSize, 1, 1);
      
      const audioChunksLocal: Float32Array[] = [];
      
      processor.onaudioprocess = (event) => {
        if (isRecordingRef.current) {
          const inputBuffer = event.inputBuffer;
          const inputData = inputBuffer.getChannelData(0);
          
          // Check if we have actual audio data
          let hasAudio = false;
          for (let i = 0; i < Math.min(100, inputData.length); i++) {
            if (Math.abs(inputData[i]) > 0.001) {
              hasAudio = true;
              break;
            }
          }
          
          if (hasAudio) {
            // Store the audio data locally
            const audioChunk = new Float32Array(inputData);
            audioChunksLocal.push(audioChunk);
            console.log(`Captured audio chunk: ${audioChunk.length} samples`);
            
            // Send audio data to WebSocket server in real-time
            if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
              // Convert Float32Array to Int16 PCM
              const pcmData = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                const s = Math.max(-1, Math.min(1, inputData[i]));
                pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }
              
              // Convert to base64
              const audioBytes = new Uint8Array(pcmData.buffer);
              const base64Audio = arrayBufferToBase64(audioBytes.buffer);
              
              // Send to server
              const audioMessage = {
                type: 'audio',
                format: 'base64',
                content: base64Audio
              };
              
              websocketRef.current.send(JSON.stringify(audioMessage));
              console.log(`Sent PCM audio chunk: ${base64Audio.length} characters`);
            } else {
              console.error('WebSocket not open, cannot send audio');
            }
          }
        }
      };
      
      // Connect the audio processing chain
      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
      
      // Store references for cleanup
      mediaRecorderRef.current = {
        stream: stream,
        processor: processor,
        source: source,
        audioChunks: audioChunksLocal,
        state: 'recording'
      };
      
      setStatus("Recording... Speak now");
      console.log('Web Audio API recording started successfully');
    } catch (err) {
      console.error("Error starting recording:", err);
      setIsRecording(false);
      isRecordingRef.current = false;
      setStatus(`Recording error: ${err.message}`);
    }
  };
  
  // Stop recording audio
  const stopRecording = async () => {
    console.log('Stopping Web Audio API recording...');
    
    // Update state first to prevent new audio chunks from being processed
    setIsRecording(false);
    isRecordingRef.current = false;
    setStatus("Processing audio...");
    
    if (mediaRecorderRef.current) {
      try {
        // Get all collected audio chunks
        const allAudioChunks = mediaRecorderRef.current.audioChunks || [];
        
        // Disconnect the audio processing chain
        if (mediaRecorderRef.current.source) {
          mediaRecorderRef.current.source.disconnect();
          console.log('Audio source disconnected');
        }
        
        if (mediaRecorderRef.current.processor) {
          mediaRecorderRef.current.processor.disconnect();
          console.log('Audio processor disconnected');
        }
        
        // Stop all tracks
        if (mediaRecorderRef.current.stream) {
          const tracks = mediaRecorderRef.current.stream.getTracks();
          console.log(`Stopping ${tracks.length} audio tracks`);
          
          tracks.forEach(track => {
            track.stop();
            console.log(`Track ${track.id} stopped`);
          });
        }
        
        // Clear the reference
        mediaRecorderRef.current = null;
        
        // Close audio context
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        
        // Send end_audio command to server to signal end of audio input
        if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
          console.log('Sending end of audio input signal');
          sendCommand('end_audio');
          setStatus("Waiting for response from Nova Sonic...");
        }
        
        // Store audio chunks for reference
        if (allAudioChunks.length > 0) {
          console.log(`Recorded ${allAudioChunks.length} audio chunks`);
          setAudioChunks(allAudioChunks);
        } else {
          console.log('No audio data captured');
          setStatus("No audio detected");
        }
        
        console.log('Web Audio API recording stopped successfully');
      } catch (err) {
        console.error('Error stopping recording:', err);
        setStatus(`Error stopping recording: ${err.message}`);
      }
    } else {
      console.log('No audio recording to stop');
      setStatus("No recording active");
    }
  };

  // Connect to the WebSocket server
  const connect = async () => {
    try {
      setStatus('Connecting...');
      console.log('Connecting to WebSocket server...');
      
      // Initialize audio player
      if (audioPlayerRef.current) {
        try {
          await audioPlayerRef.current.start();
          console.log("Audio player started successfully");
        } catch (err) {
          console.error("Failed to start audio player:", err);
          setStatus(`Audio player error: ${err.message}`);
        }
      }
      
      // Use the real WebSocket endpoint from the HTML file
      const SERVER_URL = 'wss://flamingos-cluster-backend-us-east-1.cluster.integration.pegaservice.net/ap-redis/v2/isolations/iso-pega/speech-to-speech/ws';
      
      console.log(`Connecting to WebSocket server at ${SERVER_URL}...`);
      
      // Create WebSocket connection
      websocketRef.current = new WebSocket(SERVER_URL);
      console.log("WebSocket instance created");
      
      // Set up event handlers
      websocketRef.current.onopen = handleWebSocketOpen;
      websocketRef.current.onmessage = handleWebSocketMessage;
      websocketRef.current.onerror = handleWebSocketError;
      websocketRef.current.onclose = handleWebSocketClose;
      
      // Add a timeout to detect connection issues
      setTimeout(() => {
        if (websocketRef.current && websocketRef.current.readyState !== WebSocket.OPEN) {
          console.error("WebSocket connection timeout");
          setStatus("Connection timeout. Make sure the server is running.");
        }
      }, 5000);
      
    } catch (err) {
      console.error("Error connecting to WebSocket server:", err);
      setStatus(`Connection error: ${err.message}`);
    }
  };
  
  // Disconnect from the WebSocket server
  const disconnect = () => {
    if (websocketRef.current) {
      // Send end_session command before closing
      try {
        if (websocketRef.current.readyState === WebSocket.OPEN) {
          sendCommand('end_session');
        }
      } catch (err) {
        console.error("Error sending end_session command:", err);
      }
      
      websocketRef.current.close();
      websocketRef.current = null;
    }
    
    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }
    
    // Stop audio player
    if (audioPlayerRef.current) {
      audioPlayerRef.current.stop();
    }
    
    setIsConnected(false);
    setStatus('Disconnected');
    console.log("Disconnected from speech-to-speech service");
  };

  // Trigger barge-in (interrupt)
  const bargeIn = () => {
    if (isConnected) {
      // Send barge-in command to server
      sendCommand('barge_in');
      
      // Trigger barge-in in the audio player
      if (audioPlayerRef.current) {
        audioPlayerRef.current.bargeIn();
      }
      
      console.log('Barge-in triggered');
    }
  };

  const toggleRecording = async () => {
    // First check if we need to connect
    if (!isConnected) {
      await connect();
      return;
    }
    
    // If connected, toggle recording
    if (!isRecording) {
      await startRecording();
    } else {
      await stopRecording();
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
          <Button variant="ghost" size="sm" className="p-1" onClick={handleClose}>
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
              title="Attach file"
            >
              <Paperclip size={16} className="text-gray-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`p-2 transition-colors ${
                isRecording 
                  ? "bg-red-100 hover:bg-red-200 text-red-600" 
                  : isConnected
                  ? "bg-green-50 hover:bg-green-100 text-green-600"
                  : "hover:bg-gray-100 text-gray-600"
              }`}
              onClick={toggleRecording}
              title={
                !isConnected 
                  ? "Connect to speech service" 
                  : isRecording 
                  ? "Stop recording" 
                  : "Start voice recording"
              }
            >
              {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
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
        
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs text-gray-500">
            Verify AI-generated content for accuracy.
          </div>
          {(isRecording || isProcessing) && (
            <div className="flex items-center space-x-1 text-xs">
              <div className={`w-2 h-2 rounded-full ${
                isRecording ? 'bg-red-500 animate-pulse' : 'bg-blue-500 animate-spin'
              }`}></div>
              <span className={`${
                isRecording ? 'text-red-600' : 'text-blue-600'
              }`}>
                {status}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default SpeechToSpeechChat;
