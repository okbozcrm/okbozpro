
import React, { useState, useRef } from 'react';
import { 
  Sparkles, Image as ImageIcon, Video, Mic, BrainCircuit, 
  Upload, Send, Loader2, Download, Play, Square, Wand2, Edit 
} from 'lucide-react';
import { 
  generateImage, editImage, analyzeVideo, 
  transcribeAudio, generateThinkingResponse 
} from '../../services/geminiService';

const ASPECT_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"];

const GenAITools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'image-gen' | 'image-edit' | 'video' | 'audio' | 'think'>('image-gen');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Image Gen State
  const [imgPrompt, setImgPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');

  // Image Edit State
  const [editPrompt, setEditPrompt] = useState('');
  const [editImageFile, setEditImageFile] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Video State
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoFile, setVideoFile] = useState<string | null>(null);
  const [videoMimeType, setVideoMimeType] = useState('');
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // Audio State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Thinking State
  const [thinkPrompt, setThinkPrompt] = useState('');

  // --- Handlers ---

  const handleImageGen = async () => {
    if (!imgPrompt) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const base64 = await generateImage(imgPrompt, aspectRatio);
      if (base64) {
        setResult(`data:image/png;base64,${base64}`);
      } else {
        setError("Failed to generate image.");
      }
    } catch (e) {
      setError("Error generating image.");
    }
    setLoading(false);
  };

  const handleImageEdit = async () => {
    if (!editPrompt || !editImageFile) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      // Assuming PNG input/output for simplicity in this demo context
      const base64 = await editImage(editPrompt, editImageFile, 'image/png');
      if (base64) {
        setResult(`data:image/png;base64,${base64}`);
      } else {
        setError("Failed to edit image.");
      }
    } catch (e) {
      setError("Error editing image.");
    }
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (type === 'image') {
        setEditImageFile(result);
      } else {
        setVideoFile(result);
        setVideoMimeType(file.type);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleVideoAnalysis = async () => {
    if (!videoPrompt || !videoFile) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const text = await analyzeVideo(videoPrompt, videoFile, videoMimeType);
      setResult(text);
    } catch (e) {
      setError("Error analyzing video.");
    }
    setLoading(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          setLoading(true);
          const text = await transcribeAudio(base64Audio, 'audio/wav');
          setResult(text);
          setLoading(false);
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setResult(null);
      setError(null);
    } catch (e) {
      setError("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop all tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleThinking = async () => {
    if (!thinkPrompt) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const text = await generateThinkingResponse(thinkPrompt);
      setResult(text);
    } catch (e) {
      setError("Error in thinking process.");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-emerald-500" />
          GenAI Tools Suite
        </h2>
        <p className="text-gray-500 mt-1">Powered by Google Gemini 2.5 Flash & 3 Pro models</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-1">
        <button 
          onClick={() => { setActiveTab('image-gen'); setResult(null); }}
          className={`px-4 py-2 rounded-t-lg font-medium flex items-center gap-2 transition-colors ${activeTab === 'image-gen' ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          <Wand2 className="w-4 h-4" /> Image Generator
        </button>
        <button 
          onClick={() => { setActiveTab('image-edit'); setResult(null); }}
          className={`px-4 py-2 rounded-t-lg font-medium flex items-center gap-2 transition-colors ${activeTab === 'image-edit' ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          <Edit className="w-4 h-4" /> Image Editor
        </button>
        <button 
          onClick={() => { setActiveTab('video'); setResult(null); }}
          className={`px-4 py-2 rounded-t-lg font-medium flex items-center gap-2 transition-colors ${activeTab === 'video' ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          <Video className="w-4 h-4" /> Video Analyst
        </button>
        <button 
          onClick={() => { setActiveTab('audio'); setResult(null); }}
          className={`px-4 py-2 rounded-t-lg font-medium flex items-center gap-2 transition-colors ${activeTab === 'audio' ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          <Mic className="w-4 h-4" /> Audio Scribe
        </button>
        <button 
          onClick={() => { setActiveTab('think'); setResult(null); }}
          className={`px-4 py-2 rounded-t-lg font-medium flex items-center gap-2 transition-colors ${activeTab === 'think' ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          <BrainCircuit className="w-4 h-4" /> Deep Thinker
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 min-h-[400px]">
        
        {/* Image Generator */}
        {activeTab === 'image-gen' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Prompt</label>
              <textarea 
                value={imgPrompt}
                onChange={(e) => setImgPrompt(e.target.value)}
                placeholder="Describe the image you want to generate..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-24 resize-none"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Aspect Ratio</label>
              <div className="flex flex-wrap gap-2">
                {ASPECT_RATIOS.map(ratio => (
                  <button 
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${aspectRatio === ratio ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'}`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
            <button 
              onClick={handleImageGen} 
              disabled={loading || !imgPrompt}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              Generate
            </button>
          </div>
        )}

        {/* Image Editor */}
        {activeTab === 'image-edit' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div 
                onClick={() => editFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center cursor-pointer transition-all ${editImageFile ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:bg-gray-50'}`}
              >
                <input 
                  type="file" 
                  ref={editFileInputRef} 
                  onChange={(e) => handleFileSelect(e, 'image')} 
                  className="hidden" 
                  accept="image/png, image/jpeg" 
                />
                {editImageFile ? (
                  <img src={editImageFile} alt="To Edit" className="h-full w-full object-contain rounded-lg" />
                ) : (
                  <div className="text-center p-4">
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Click to upload source image</p>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Edit Instruction</label>
                  <textarea 
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="e.g., 'Add a retro filter' or 'Remove the person in background'"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-32 resize-none"
                  />
                </div>
                <button 
                  onClick={handleImageEdit} 
                  disabled={loading || !editPrompt || !editImageFile}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                  Edit Image
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Video Analyst */}
        {activeTab === 'video' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div 
                onClick={() => videoFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center cursor-pointer transition-all ${videoFile ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:bg-gray-50'}`}
              >
                <input 
                  type="file" 
                  ref={videoFileInputRef} 
                  onChange={(e) => handleFileSelect(e, 'video')} 
                  className="hidden" 
                  accept="video/*" 
                />
                {videoFile ? (
                  <video src={videoFile} controls className="h-full w-full object-contain rounded-lg" />
                ) : (
                  <div className="text-center p-4">
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Click to upload video</p>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Analysis Prompt</label>
                  <textarea 
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    placeholder="e.g., 'Summarize the key events in this video'"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-32 resize-none"
                  />
                </div>
                <button 
                  onClick={handleVideoAnalysis} 
                  disabled={loading || !videoPrompt || !videoFile}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Video className="w-5 h-5" />}
                  Analyze Video
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Audio Scribe */}
        {activeTab === 'audio' && (
          <div className="flex flex-col items-center justify-center space-y-8 py-10">
            <div className="relative">
              <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center transition-all ${isRecording ? 'border-red-500 bg-red-50 animate-pulse' : 'border-gray-200 bg-gray-50'}`}>
                <Mic className={`w-12 h-12 ${isRecording ? 'text-red-500' : 'text-gray-400'}`} />
              </div>
              {isRecording && (
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-red-500 font-bold animate-pulse">Recording...</span>
              )}
            </div>
            
            <button 
              onClick={isRecording ? stopRecording : startRecording}
              disabled={loading}
              className={`px-8 py-3 rounded-full font-bold text-lg flex items-center gap-2 shadow-lg transition-transform hover:scale-105 ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              {isRecording ? (
                <> <Square className="w-5 h-5 fill-current" /> Stop Recording </>
              ) : (
                <> <Play className="w-5 h-5 fill-current" /> Start Recording </>
              )}
            </button>
            {loading && <p className="text-gray-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Transcribing audio...</p>}
          </div>
        )}

        {/* Deep Thinker */}
        {activeTab === 'think' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl flex items-start gap-3">
              <BrainCircuit className="w-6 h-6 text-purple-600 shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-purple-900">Thinking Mode Enabled</h4>
                <p className="text-sm text-purple-700">Using Gemini 3 Pro with expanded thinking budget (32k tokens) for complex reasoning tasks.</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Complex Query</label>
              <textarea 
                value={thinkPrompt}
                onChange={(e) => setThinkPrompt(e.target.value)}
                placeholder="Ask a complex question requiring multi-step reasoning..."
                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none h-40 resize-none shadow-sm text-lg"
              />
            </div>
            <button 
              onClick={handleThinking} 
              disabled={loading || !thinkPrompt}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
              Deep Think
            </button>
          </div>
        )}

        {/* Results Area */}
        {(result || error) && (
          <div className="mt-8 pt-8 border-t border-gray-200 animate-in fade-in slide-in-from-bottom-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100 text-center">
                {error}
              </div>
            )}
            {result && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                  <span className="font-bold text-gray-600 text-sm">Output</span>
                  {activeTab === 'image-gen' || activeTab === 'image-edit' ? (
                    <a href={result} download="generated-image.png" className="text-emerald-600 hover:underline text-xs flex items-center gap-1">
                      <Download className="w-3 h-3" /> Download
                    </a>
                  ) : (
                    <button onClick={() => navigator.clipboard.writeText(result)} className="text-emerald-600 hover:underline text-xs">Copy</button>
                  )}
                </div>
                <div className="p-6 flex justify-center">
                  {activeTab === 'image-gen' || activeTab === 'image-edit' ? (
                    <img src={result} alt="Generated" className="max-w-full rounded-lg shadow-md" />
                  ) : (
                    <div className="prose max-w-none whitespace-pre-wrap text-gray-800 leading-relaxed w-full">
                      {result}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default GenAITools;
