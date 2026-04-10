import React, { useEffect, useRef, useState } from "react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

const Dictaphone = () => {
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const [word, setWord] = useState("palabra");
  const [audioVolume, setAudioVolume] = useState(100);
  const [audioToPlay, setAudioToPlay] = useState("./No.mp3");
  const audioControl = useRef(new Audio(audioToPlay));

  const handleFileSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (files?.length == 0) return;

    setAudioToPlay(
      URL.createObjectURL(
        files?.[0] ?? (await fetch("./No.mp3").then((r) => r.blob())),
      ),
    );
  };

  const forceStopAudioPlayback = () => {
    if (audioControl.current) {
      audioControl.current.pause();
      audioControl.current.currentTime = 0;
    }
  };

  const startListening = () => {
    if (listening) SpeechRecognition.stopListening();

    SpeechRecognition.startListening({
      language: "es",
      continuous: true,
      interimResults: false,
    });
  };

  const stopListening = () => {
    SpeechRecognition.stopListening();
    resetTranscript();
    forceStopAudioPlayback();
  };

  useEffect(() => {
    if (transcript.includes(word)) {
      forceStopAudioPlayback();

      audioControl.current = new Audio(audioToPlay);
      audioControl.current.volume = audioVolume * 0.01;
      audioControl.current.play();

      resetTranscript();
    }
  }, [transcript, resetTranscript, word, audioVolume, audioToPlay]);

  if (!browserSupportsSpeechRecognition) {
    return <span>Browser doesn't support speech recognition.</span>;
  }

  return (
    <div>
      <label htmlFor="txtWord">Word to be detected: </label>
      <input
        id="txtWord"
        type="text"
        onChange={(event) => {
          setWord(event.target.value);
        }}
        value={word}
      />
      <br />
      <label htmlFor="rngVolume">Volume of sound: </label>
      <input
        id="rngVolume"
        type="range"
        onChange={(event) => {
          setAudioVolume(Number(event.target.value));
        }}
        value={audioVolume}
        min={1}
        max={100}
      />
      <p>Microphone: {listening ? "on" : "off"}</p>
      <button onClick={listening ? stopListening : startListening}>
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
