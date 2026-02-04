import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, MicOff, Send, Volume2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ChatTest() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    const savedCustomerId = localStorage.getItem('selectedCustomerId');
    if (savedCustomerId) {
      setCustomerId(savedCustomerId);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    if (!customerId) {
      toast.error("Please select a customer first from the Dashboard");
      return;
    }

    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await axios.post(`${API}/chat`, {
        customer_id: customerId,
        message: input,
        session_id: sessionId
      });

      setSessionId(response.data.session_id);
      const assistantMessage = { 
        role: "assistant", 
        content: response.data.response,
        sources: response.data.sources 
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast.error("Failed to send message");
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Recording started");
    } catch (error) {
      toast.error("Failed to start recording");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success("Recording stopped");
    }
  };

  const transcribeAudio = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.webm');

      const response = await axios.post(`${API}/voice/stt`, formData);

      setInput(response.data.transcribed_text);
      toast.success("Audio transcribed");
    } catch (error) {
      toast.error("Failed to transcribe audio");
    }
  };

  const speakText = async (text) => {
    setIsSpeaking(true);
    try {
      const response = await axios.post(`${API}/voice/tts`, {
        text: text,
        voice_id: "21m00Tcm4TlvDq8ikWAM"
      });

      const audio = new Audio(response.data.audio_url);
      audio.onended = () => setIsSpeaking(false);
      await audio.play();
    } catch (error) {
      toast.error("Failed to generate speech");
      setIsSpeaking(false);
    }
  };

  return (
    <div className="p-6 md:p-12 space-y-8" data-testid="chat-test-page">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2" data-testid="chat-title">Test Chat</h1>
        <p className="text-muted-foreground">Test your chatbot with text and voice</p>
      </div>

      <Card data-testid="chat-card" className="h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle>Chatbot Interface</CardTitle>
          <CardDescription>Ask questions based on your knowledge base</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4" data-testid="messages-container">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground" data-testid="no-messages">
                Start a conversation by typing a message below
              </div>
            ) : (
              messages && messages.length > 0 ? messages.map((message, index) => {
                const msgRole = message.role;
                const msgContent = message.content;
                const msgSources = message.sources;
                const msgKey = `msg-${index}`;
                return (
                  <div
                    key={msgKey}
                    data-testid={`message-${index}`}
                    className={`flex ${msgRole === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                        msgRole === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground"
                      }`}
                    >
                      <p className="whitespace-pre-wrap" data-testid={`message-content-${index}`}>{msgContent}</p>
                      {msgSources && msgSources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <p className="text-xs opacity-70">Sources:</p>
                          <ul className="text-xs opacity-70 mt-1">
                            {msgSources.map((source, i) => (
                              <li key={i}>• {source}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {msgRole === "assistant" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`speak-btn-${index}`}
                          onClick={() => speakText(msgContent)}
                          disabled={isSpeaking}
                          className="mt-2 h-6 px-2"
                        >
                          <Volume2 className="h-3 w-3 mr-1" />
                          Speak
                        </Button>
                      )}
                    </div>
                  </div>
                );
              }) : null
            )}
            {loading && (
              <div className="flex justify-start" data-testid="loading-indicator">
                <div className="bg-secondary rounded-2xl px-4 py-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              data-testid="record-btn"
              onClick={isRecording ? stopRecording : startRecording}
              className={`rounded-full ${isRecording ? 'bg-destructive text-destructive-foreground' : ''}`}
            >
              {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Input
              data-testid="chat-input"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={loading}
              className="flex-1"
            />
            <Button
              data-testid="send-btn"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="rounded-full"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}