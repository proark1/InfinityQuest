
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from "@google/genai";
import { Mic, MicOff, X, Layout } from 'lucide-react';
import { GameState, Language, LiveVoice, CharacterRegistrationHandler, StatUpdateHandler, XpUpdateHandler, SurvivalUpdateHandler, InventoryItem } from '../types';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../utils/audio';
import Sidebar from './Sidebar';

interface LiveSessionProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  language: Language;
  onInventoryUpdate: (items: string[]) => void;
  onQuestUpdate: (quest: string) => void;
  onRegisterCharacter: CharacterRegistrationHandler;
  onStatUpdate: StatUpdateHandler;
  onXpUpdate: XpUpdateHandler;
  onSurvivalUpdate: SurvivalUpdateHandler;
  onInspectItem: (item: InventoryItem) => void;
}

const LiveSession: React.FC<LiveSessionProps> = ({ 
  isOpen, 
  onClose, 
  gameState, 
  language,
  onInventoryUpdate,
  onQuestUpdate,
  onRegisterCharacter,
  onStatUpdate,
  onXpUpdate,
  onSurvivalUpdate,
  onInspectItem
}) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [isMicOn, setIsMicOn] = useState(true);
  const [selectedVoice] = useState<LiveVoice>('Kore');
  const [isNarratorSpeaking, setIsNarratorSpeaking] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null); 
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const mountedRef = useRef(true);
  const isMicOnRef = useRef(true);

  const tools: FunctionDeclaration[] = [
    {
      name: "update_inventory",
      description: "Update the user's inventory list.",
      parameters: { type: Type.OBJECT, properties: { items: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["items"] }
    },
    {
      name: "update_quest",
      description: "Update the current quest.",
      parameters: { type: Type.OBJECT, properties: { quest: { type: Type.STRING } }, required: ["quest"] }
    },
    {
      name: "register_character",
      description: "Register a new character met in the story.",
      parameters: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING } }, required: ["name", "description"] }
    },
    {
      name: "update_stats",
      description: "Update the player's stats.",
      parameters: { type: Type.OBJECT, properties: { health: { type: Type.NUMBER }, maxHealth: { type: Type.NUMBER }, mana: { type: Type.NUMBER }, maxMana: { type: Type.NUMBER }, gold: { type: Type.NUMBER } }, required: ["health", "maxHealth", "mana", "maxMana", "gold"] }
    },
    {
      name: "update_xp",
      description: "Update the player's XP.",
      parameters: { type: Type.OBJECT, properties: { xpAdded: { type: Type.NUMBER }, levelUp: { type: Type.BOOLEAN } }, required: ["xpAdded", "levelUp"] }
    },
    {
      name: "update_survival",
      description: "Update the player's survival stats.",
      parameters: { type: Type.OBJECT, properties: { hungerChange: { type: Type.NUMBER }, thirstChange: { type: Type.NUMBER } }, required: ["hungerChange", "thirstChange"] }
    }
  ];

  useEffect(() => {
    isMicOnRef.current = isMicOn;
  }, [isMicOn]);

  useEffect(() => {
    mountedRef.current = true;
    if (isOpen) {
      startSession();
    }
    return () => {
      mountedRef.current = false;
      stopSession();
    };
  }, [isOpen, selectedVoice]);

  const isIgnorableError = (error: any) => {
    const msg = error instanceof Error ? error.message : String(error);
    const lowerMsg = msg.toLowerCase();
    return lowerMsg.includes("deadline") || lowerMsg.includes("cancelled") || lowerMsg.includes("aborted") || lowerMsg.includes("connection closed");
  };

  const startSession = async () => {
    setStatus('connecting');
    
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key missing");

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      
      inputContextRef.current = inputCtx;
      audioContextRef.current = outputCtx;
      nextStartTimeRef.current = 0;

      // Resuming contexts immediately to ensure they start on user action
      await inputCtx.resume();
      await outputCtx.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const source = inputCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      
      const analyser = inputCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const outputAnalyser = outputCtx.createAnalyser();
      outputAnalyser.fftSize = 256;
      outputAnalyser.connect(outputCtx.destination);
      outputAnalyserRef.current = outputAnalyser;
      
      visualize();

      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      const ai = new GoogleGenAI({ apiKey });
      const sessionPromise = ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        callbacks: {
          onopen: () => {
             if(mountedRef.current) {
                setStatus('connected');
                // Trigger narrator welcome immediately
                sessionPromise.then(session => {
                  session.sendRealtimeInput({
                    text: `SYSTEM: THE PLAYER HAS JUST JOINED VOICE MODE. YOU ARE THE GAME MASTER. IMMEDIATELY SPEAK AND WELCOME THEM BY NAME OR CLASS (${gameState.playerClass}). INTRODUCE THE CURRENT SITUATION AT [[${gameState.location?.name || 'THE START OF THE JOURNEY'}]]. BE ATMOSPHERIC AND MYSTICAL.`
                  });
                });
             }
             processor.onaudioprocess = (e) => {
               if (!isMicOnRef.current || !mountedRef.current) return;
               const pcmBlob = createPcmBlob(e.inputBuffer.getChannelData(0));
               sessionPromise.then(session => session.sendRealtimeInput({ audio: pcmBlob }));
             };
             source.connect(processor);
             processor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (!mountedRef.current) return;

            if (msg.toolCall?.functionCalls) {
              for (const fc of msg.toolCall.functionCalls) {
                let result = { result: "ok" };
                if (fc.name === "update_inventory") onInventoryUpdate((fc.args as any).items);
                else if (fc.name === "update_quest") onQuestUpdate((fc.args as any).quest);
                else if (fc.name === "register_character") onRegisterCharacter((fc.args as any).name, (fc.args as any).description);
                else if (fc.name === "update_stats") onStatUpdate(fc.args as any);
                else if (fc.name === "update_xp") onXpUpdate((fc.args as any).xpAdded, (fc.args as any).levelUp);
                else if (fc.name === "update_survival") onSurvivalUpdate((fc.args as any).hungerChange, (fc.args as any).thirstChange);
                sessionPromise.then(session => session.sendToolResponse({
                  functionResponses: [{ id: fc.id, name: fc.name, response: result }]
                }));
              }
            }

            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current && outputAnalyserRef.current) {
               setIsNarratorSpeaking(true);
               const ctx = audioContextRef.current;
               const buffer = await decodeAudioData(base64ToUint8Array(base64Audio), ctx);
               const src = ctx.createBufferSource();
               src.buffer = buffer;
               src.connect(outputAnalyserRef.current);
               nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
               src.start(nextStartTimeRef.current);
               src.addEventListener('ended', () => {
                  sourcesRef.current.delete(src);
                  if (sourcesRef.current.size === 0) setIsNarratorSpeaking(false);
               });
               nextStartTimeRef.current += buffer.duration;
               sourcesRef.current.add(src);
            }
          },
          onclose: () => setStatus('error'),
          onerror: (err) => !isIgnorableError(err) && setStatus('error')
        },
        config: {
           responseModalities: [Modality.AUDIO],
           speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } },
           systemInstruction: `You are the mystical Game Master of Infinity Quest. Speak with authority, atmosphere, and flavor. Always respond via audio.`,
           tools: [{ functionDeclarations: tools }]
        }
      });
      activeSessionRef.current = sessionPromise;
    } catch (e: any) { setStatus('error'); }
  };

  const visualize = () => {
    if (!canvasRef.current || !analyserRef.current || !outputAnalyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const inputData = new Uint8Array(analyserRef.current.frequencyBinCount);
    const outputData = new Uint8Array(outputAnalyserRef.current.frequencyBinCount);

    const draw = () => {
      if (!mountedRef.current) return;
      animationFrameRef.current = requestAnimationFrame(draw);

      analyserRef.current?.getByteFrequencyData(inputData);
      outputAnalyserRef.current?.getByteFrequencyData(outputData);

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = 80;

      ctx.clearRect(0, 0, width, height);

      // Background ritual circle
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.1)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 20, 0, Math.PI * 2);
      ctx.stroke();

      // Input (Player) Visualization
      if (isMicOnRef.current) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)';
        ctx.lineWidth = 3;
        for (let i = 0; i < inputData.length; i++) {
          const amplitude = inputData[i] / 255.0;
          const angle = (i / inputData.length) * Math.PI * 2;
          const r = radius + (amplitude * 50);
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Output (Narrator) Visualization
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
      ctx.lineWidth = 4;
      for (let i = 0; i < outputData.length; i++) {
        const amplitude = outputData[i] / 255.0;
        const angle = (i / outputData.length) * Math.PI * 2;
        const r = radius + (amplitude * 80);
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.shadowBlur = 0;
    };
    draw();
  };

  const stopSession = async () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    inputContextRef.current?.close();
    audioContextRef.current?.close();
  };

  if (!isOpen) return null;
  const isGerman = language === Language.German;

  return (
    <div className="fixed inset-0 bg-slate-950 z-[90] flex animate-in fade-in duration-500 overflow-hidden">
      <div className={`${isSidebarVisible ? 'w-80 border-r border-slate-800' : 'w-0'} transition-all duration-500 bg-slate-900 shadow-2xl relative z-10 h-full overflow-hidden`}>
         <div className="h-full flex flex-col w-80">
            <Sidebar 
               gameState={gameState} 
               language={language} 
               className="border-r-0 h-full" 
               onInspectItem={onInspectItem}
               isThinking={status === 'connecting' || isNarratorSpeaking}
            />
         </div>
      </div>

      <div className="flex-1 flex flex-col relative">
        <div className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl flex items-center justify-between px-6 relative z-10">
           <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarVisible(!isSidebarVisible)} className="p-2.5 text-slate-400 hover:text-amber-500 bg-slate-800/50 rounded-xl transition-all border border-slate-700/30">
                <Layout size={22} />
              </button>
              <div className="flex items-center gap-3">
                 <div className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-amber-500 animate-pulse'}`} />
                 <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    {status === 'connected' ? 'Established connection' : 'Attuning...'}
                 </span>
              </div>
           </div>
           <button onClick={onClose} className="px-5 py-2 rounded-full bg-red-950/40 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/30 transition-all flex items-center gap-2">
             <span className="text-[10px] font-black uppercase tracking-widest">{isGerman ? 'Link trennen' : 'Sever link'}</span>
             <X size={18} />
           </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-12 relative z-10">
           <div className="relative w-full max-w-lg aspect-square flex items-center justify-center bg-slate-900/20 rounded-[4rem] border border-slate-800/50 shadow-inner">
              <canvas ref={canvasRef} width={600} height={600} className="absolute inset-0 w-full h-full" />
              <div className="relative z-10">
                 <button 
                   onClick={() => setIsMicOn(!isMicOn)}
                   className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 border-4 ${isMicOn ? 'bg-slate-900 border-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.3)]' : 'bg-slate-800 border-slate-600 text-slate-500 grayscale'}`}
                 >
                   {isMicOn ? <Mic size={56} className="text-amber-500" /> : <MicOff size={56} />}
                 </button>
              </div>
           </div>
           <div className="mt-8 text-center space-y-2">
              <h2 className={`text-4xl font-black fantasy-font uppercase tracking-widest transition-all duration-500 ${isNarratorSpeaking ? 'text-amber-500 scale-105' : 'text-slate-700'}`}>
                 {isNarratorSpeaking ? 'The Oracle Speaks' : 'Listening for Destiny'}
              </h2>
           </div>
        </div>
      </div>
    </div>
  );
};

export default LiveSession;
