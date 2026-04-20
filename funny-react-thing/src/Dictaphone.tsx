import React, { useEffect, useRef, useState, useCallback } from "react";

const CHUNK_INTERVAL_MS = 2000;

const Dictaphone = () => {
  const [word, setWord] = useState("palabra");
  const [audioVolume, setAudioVolume] = useState(100);
  const [audioToPlay, setAudioToPlay] = useState("./No.mp3");
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState("Click Start to load model");
  const [modelReady, setModelReady] = useState(false);

  const audioControl = useRef(new Audio(audioToPlay));
  const workerRef = useRef<Worker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isListeningRef = useRef(false);
  const wordRef = useRef(word);
  const audioToPlayRef = useRef(audioToPlay);
  const audioVolumeRef = useRef(audioVolume);

  useEffect(() => { wordRef.current = word; }, [word]);
  useEffect(() => { audioToPlayRef.current = audioToPlay; }, [audioToPlay]);
  useEffect(() => { audioVolumeRef.current = audioVolume; }, [audioVolume]);

  const forceStopAudioPlayback = () => {
    audioControl.current.pause();
    audioControl.current.currentTime = 0;
  };

  const playSound = useCallback(() => {
    forceStopAudioPlayback();
    audioControl.current = new Audio(audioToPlayRef.current);
    audioControl.current.volume = audioVolumeRef.current * 0.01;
    audioControl.current.play();
  }, []);

  useEffect(() => {
    const worker = new Worker(new URL("./whisper.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const { type, message, text } = e.data;
      if (type === "status") setStatus(message);
      if (type === "ready") { setModelReady(true); setStatus("Model ready — click Start"); }
      if (type === "result" && text) {
        const cleaned = text.trim().toLowerCase();
        setTranscript(cleaned);
        setStatus("Listening...");
        if (cleaned.includes(wordRef.current.toLowerCase())) playSound();
      }
    };

    worker.postMessage({ type: "load" });
    return () => worker.terminate();
  }, [playSound]);

  const activeRecorderRef = useRef<MediaRecorder | null>(null);

  const recordChunk = useCallback((stream: MediaStream) => {
    if (!isListeningRef.current) return;

    const recorder = new MediaRecorder(stream);
    activeRecorderRef.current = recorder;
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    recorder.onstop = async () => {
      // check immediately before any async work
      if (!isListeningRef.current || chunks.length === 0) return;

      const blob = new Blob(chunks, { type: recorder.mimeType });
      const arrayBuffer = await blob.arrayBuffer();

      // check again after async gap
      if (!isListeningRef.current) return;

      const audioCtx = new AudioContext({ sampleRate: 16000 });
      const decoded = await audioCtx.decodeAudioData(arrayBuffer);
      const float32 = decoded.getChannelData(0);
      await audioCtx.close();

      if (!isListeningRef.current) return;

      workerRef.current?.postMessage({ type: "transcribe", audio: float32 }, [float32.buffer]);
      recordChunk(stream);
    };

    recorder.start();
    setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, CHUNK_INTERVAL_MS);
  }, []);

  const startListening = useCallback(async () => {
    if (!modelReady) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    isListeningRef.current = true;
    setListening(true);
    setStatus("Listening...");
    recordChunk(stream);
  }, [modelReady, recordChunk]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    activeRecorderRef.current?.stop();
    activeRecorderRef.current = null;
    workerRef.current?.postMessage({ type: "abort" });
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setListening(false);
    setTranscript("");
    setStatus("Stopped");
    forceStopAudioPlayback();
  }, []);

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    setAudioToPlay(URL.createObjectURL(files[0]));
  };

  return (
    <div>
      <p><em>{status}</em></p>

      <label htmlFor="txtWord">Word to be detected: </label>
      <input
        id="txtWord"
        type="text"
        onChange={(e) => setWord(e.target.value)}
        value={word}
      />
      <br />

      <label htmlFor="rngVolume">Volume of sound: </label>
      <input
        id="rngVolume"
        type="range"
        onChange={(e) => setAudioVolume(Number(e.target.value))}
        value={audioVolume}
        min={1}
        max={100}
      />

      <p>Microphone: {listening ? "on" : "off"}</p>
      <button onClick={listening ? stopListening : startListening} disabled={!modelReady && !listening}>
        {listening ? "Stop" : "Start"}
      </button>

      <p>Transcription:</p>
      <p>{transcript}</p>

      <br />
      <label htmlFor="filAudio">Sound to play: </label>
      <input
        id="filAudio"
        onChange={handleFileSelected}
        type="file"
        multiple={false}
        accept=".mp3,audio/*"
      />
    </div>
  );
};

export default Dictaphone;
