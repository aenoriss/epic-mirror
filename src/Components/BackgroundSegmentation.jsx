import React, { useRef, useEffect, useState, useCallback } from "react";
import { SelfieSegmentation } from "@mediapipe/selfie_segmentation";
import "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";
import QRCode from "qrcode.react";
import { saveCurrentCapture } from "../Utils/firebase";
import Controls from "./Controls";
import RecordingBar from "./RecordingBar";
import StyledQRCode from "./StyledQRCode";

//Assets
import Logo from "../assets/logo.png";
import CountrysideBackground from "../assets/countryside/background.mp4";
import CountrysideLayer from "../assets/countryside/layer_webm.webm";
import InterviewBackground from "../assets/interview/background.mp4";

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const BackgroundSegmentation = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const backgroundVideoRef = useRef(null);
  const layerVideoRef = useRef(null);
  const logoRef = useRef(null);
  const overlayRef = useRef(null);
  const segmentationPromiseRef = useRef(null);
  const segmenterRef = useRef(null);
  const gestureRecognizerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const captureTimeoutRef = useRef(null);

  const [loadModels, setLoadModels] = useState(false);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [thumbsUp, setThumbsUp] = useState(null);
  const [indexUp, setIndexUp] = useState(null);
  const [isCaptureActive, setIsCaptureActive] = useState(false);
  const [currentScene, setCurrentScene] = useState(1);
  const [captureId, setCaptureId] = useState(null);
  const [triggerCounter, setTriggerCounter] = useState(null);
  const [loadingState, setLoadingState] = useState("initial");
  const [error, setError] = useState(null);
  const [circleUI, setCircleUI] = useState(false);
  const [leftControlValue, setLeftControlValue] = useState(0);
  const [rightControlValue, setRightControlValue] = useState(0);
  const [UIStage, setUIStage] = useState(1);

  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const ffmpegRef = useRef(new FFmpeg());
  const messageRef = useRef(null);

  const loadFFmpeg = async () => {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
    const ffmpeg = ffmpegRef.current;
    ffmpeg.on('log', ({ message }) => {
      console.log("FFmpeg log:", message);
      if (messageRef.current) {
        messageRef.current.innerHTML = message;
      }
    });
  
    try {
      console.log("Starting to load FFmpeg...");
      const loadStart = Date.now();
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      const loadTime = Date.now() - loadStart;
      console.log(`FFmpeg loaded successfully in ${loadTime}ms`);
      setFfmpegLoaded(true);
    } catch (error) {
      console.error("Failed to load FFmpeg:", error);
      console.error("Error stack:", error.stack);
      setFfmpegLoaded(false);
      setError("Failed to load video processing. Please refresh and try again.");
    }
  };

  useEffect(() => {
    loadFFmpeg().catch(error => {
      console.error("Failed to load FFmpeg:", error);
      setError("Failed to load video processing. Please refresh and try again.");
    });
  }, []);

  const updateCanvasSize = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const aspectRatio = 9 / 16; 
      const width = 1080;
      const height = width / aspectRatio;

      canvasRef.current.width = width;
      canvasRef.current.height = height;
      canvasRef.current.style.width = `${width}px`;
      canvasRef.current.style.height = `${height}px`;
    }
  }, []);

  useEffect(() => {
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, [updateCanvasSize]);

  useEffect(() => {
    if (backgroundVideoRef.current) {
      backgroundVideoRef.current.src = currentScene === 1 ? CountrysideBackground : InterviewBackground;
      backgroundVideoRef.current.loop = true;
      backgroundVideoRef.current.muted = true;
      backgroundVideoRef.current.play().catch((error) => {});
    }

    if (currentScene === 1 && layerVideoRef.current) {
      layerVideoRef.current.src = CountrysideLayer;
      layerVideoRef.current.loop = true;
      layerVideoRef.current.muted = true;
      layerVideoRef.current.play().catch((error) => {});
    }

    if (logoRef.current) {
      logoRef.current.src = Logo;
    }

    return () => {
      if (backgroundVideoRef.current) {
        backgroundVideoRef.current.pause();
        backgroundVideoRef.current.src = "";
      }
    };
  }, [currentScene]);

  useEffect(() => {
    let intervalId;
    const fillDuration = 1500;
    const updateInterval = 50;
    const incrementAmount = fillDuration / updateInterval;

    if (thumbsUp || indexUp) {
      intervalId = setInterval(() => {
        if (thumbsUp) {
          setLeftControlValue(prev => Math.min(100, prev + incrementAmount));
        }
        if (indexUp) {
          setRightControlValue(prev => Math.min(100, prev + incrementAmount));
        }
      }, updateInterval);
    } else {
      setLeftControlValue(0);
      setRightControlValue(0);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [thumbsUp, indexUp]);

  useEffect(() => {
    if (thumbsUp || indexUp) {
      timerRef.current = setTimeout(() => {
        if (!isCaptureActive) {
          if (thumbsUp) {
            setIsCaptureActive(true);
          } else if (indexUp) {
            changeScene();
          }
        }
      }, 1500);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [thumbsUp, indexUp]);

  const initializeSegmenter = useCallback(async () => {
    try {
      const segmenter = new SelfieSegmentation({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/${file}`,
      });

      await segmenter.initialize();

      segmenter.setOptions({
        modelSelection: 0,
        selfieMode: true,
      });

      segmenter.onResults((results) => {
        if (segmentationPromiseRef.current) {
          segmentationPromiseRef.current.resolve(results);
          segmentationPromiseRef.current = null;
        }
      });

      segmenterRef.current = segmenter;
    } catch (error) {
      setError(
        "Failed to initialize segmentation. Please refresh and try again."
      );
      setLoadingState("error");
    }
  }, []);

  const initializePoseLandmarker = useCallback(async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );

      const gestureRecognizer = await GestureRecognizer.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU",
          },
          numHands: 2,
          runningMode: "VIDEO",
        }
      );

      gestureRecognizerRef.current = gestureRecognizer;
    } catch (error) {
      console.error("Failed to initialize pose landmarker:", error);
    }
  }, []);

  useEffect(() => {
    const loadSegmentation = async () => {
      setLoadingState("loading");
      try {
        await initializeSegmenter();
        await initializePoseLandmarker();

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: true,
            });

            if (videoRef.current) {
              videoRef.current.srcObject = stream;

              videoRef.current.onloadedmetadata = () => {
                updateCanvasSize();
                videoRef.current.play();
              };
            }

            setLoadingState("ready");
          } catch (error) {
            setError(
              "Failed to access camera. Please ensure you have granted camera permissions."
            );
            setLoadingState("error");
            return;
          }
        }
      } catch (error) {
        setError("Failed to load segmentation. Please refresh and try again.");
        setLoadingState("error");
      }
    };

    if (loadModels) {
      loadSegmentation();
    }

    return () => {
      if (segmenterRef.current) {
        segmenterRef.current.close();
      }
      if (gestureRecognizerRef.current) {
        gestureRecognizerRef.current.close();
      }
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [loadModels, initializeSegmenter, initializePoseLandmarker, updateCanvasSize]);

  const onResults = useCallback((results) => {
    if (!canvasRef.current || !backgroundVideoRef.current) {
      return;
    }
  
    const canvasCtx = canvasRef.current.getContext("2d");
  
    const canvasWidth = canvasRef.current.width;
    const canvasHeight = canvasRef.current.height;
  
    const imageWidth = results.image.width;
    const imageHeight = results.image.height;
  
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);
  
    // Calculate the scaling factor to cover the entire canvas
    const scale = Math.max(canvasWidth / imageWidth, canvasHeight / imageHeight);
    const scaledWidth = (imageWidth * scale) * 0.8;
    const scaledHeight = (imageHeight * scale) * 0.8;;
  
    // Calculate offsets to center the image
    const offsetX = (canvasWidth - scaledWidth) / 2;
    const offsetY = (canvasHeight - scaledHeight) / 2;
  
    // Draw segmentation mask
    canvasCtx.drawImage(
      results.segmentationMask,
      offsetX - 200,
      offsetY,
      scaledWidth + 340,
      scaledHeight + 600
    );
  
    canvasCtx.globalCompositeOperation = "source-in";
  
    // Draw the original image
    canvasCtx.drawImage(
      results.image,
      offsetX - 200,
      offsetY,
      scaledWidth + 340,
      scaledHeight + 600
    );
  
    canvasCtx.globalCompositeOperation = "destination-over";
  
    // Draw the background video
    canvasCtx.drawImage(
      backgroundVideoRef.current,
      0,
      0,
      canvasWidth,
      canvasHeight
    );
  
    if(currentScene === 1){
      canvasCtx.globalCompositeOperation = "source-over";
      canvasCtx.drawImage(layerVideoRef.current, 0, 0, canvasWidth, canvasHeight);
    }
  
    canvasCtx.globalCompositeOperation = "source-over";
    canvasCtx.drawImage(logoRef.current, 0, 0, canvasWidth, canvasHeight);
  
    canvasCtx.restore();
  }, [currentScene]);

  const sendToSegmenter = useCallback(async () => {
    if (
      videoRef.current &&
      videoRef.current.videoWidth > 0 &&
      segmenterRef.current &&
      gestureRecognizerRef.current
    ) {
      try {
        const segmentationPromise = new Promise((resolve) => {
          segmentationPromiseRef.current = { resolve };
        });

        let gestureResults = null;

        if (!isCaptureActive) {
          const [_, gestureRecognizerResult] = await Promise.all([
            segmenterRef.current.send({ image: videoRef.current }),
            gestureRecognizerRef.current.recognizeForVideo(
              videoRef.current,
              performance.now()
            ),
            segmentationPromise,
          ]);

          gestureResults = gestureRecognizerResult;

          let currentThumbsUp = false;
          let currentIndexUp = false;

          if (gestureResults.gestures && gestureResults.gestures.length > 0) {

            for (let i = 0; i < Math.min(gestureResults.gestures.length, 2); i++) {
              const handGestures = gestureResults.gestures[i];
              
              if (handGestures.some((gesture) => gesture.categoryName === "Thumb_Up")) {
                currentThumbsUp = true;
              }
              
              if (handGestures.some((gesture) => gesture.categoryName === "Pointing_Up")) {
                currentIndexUp = true;
              }
            }
          }

          setThumbsUp(currentThumbsUp);
          setIndexUp(currentIndexUp);

        } else {
          await Promise.all([
            segmenterRef.current.send({ image: videoRef.current }),
            segmentationPromise,
          ]);
        }

        const segmentationResults = await segmentationPromise;

        onResults({
          segmentationMask: segmentationResults.segmentationMask,
          image: segmentationResults.image,
        });

      } catch (error) {
        console.error("Error in sendToSegmenter:", error);
        if (error.name === "BindingError") {
          console.log(
            "Attempting to reinitialize segmenter and gesture recognizer..."
          );
          await initializeSegmenter();
          await initializePoseLandmarker();
        } else {
          setError(`Processing error: ${error.message}. Please try again.`);
          stopSegmentation();
          return;
        }
      }
    }

    if (isSegmenting) {
      animationFrameRef.current = requestAnimationFrame(sendToSegmenter);
    }

  }, [
    isSegmenting,
    onResults,
    initializeSegmenter,
    initializePoseLandmarker,
    isCaptureActive,
  ]);

  const changeScene = useCallback(() => {
    setCurrentScene(prevScene => prevScene === 1 ? 2 : 1);
  }, []);

  useEffect(() => {
    if (loadingState === "ready" && isSegmenting) {
      sendToSegmenter();
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [loadingState, isSegmenting, sendToSegmenter]);

  const startSegmentation = useCallback(() => {
    setIsSegmenting(true);
  }, []);

  const stopSegmentation = useCallback(() => {
    setIsSegmenting(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const startRecording = useCallback(() => {
    console.log("Starting recording process...");
    
    if (!ffmpegLoaded) {
      console.error('FFmpeg is not loaded. Cannot start recording.');
      alert('Video processing is not ready. Please wait or refresh the page.');
      return;
    }
  
    if (canvasRef.current) {
      console.log("Capturing stream from canvas...");
      const stream = canvasRef.current.captureStream(30);
  
      const mimeType = 'video/webm;codecs=vp9,opus';
  
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        console.error('WebM with VP9 and Opus codecs not supported');
        alert('Your browser does not support the required video format. Please try a different browser.');
        return;
      }
  
      console.log(`Using MIME type: ${mimeType}`);
  
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 2500000
      });
  
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
  
      mediaRecorderRef.current.onstop = async () => {
        console.log("MediaRecorder stopped. Processing recorded data...");
        try {
          const webmBlob = new Blob(chunksRef.current, { type: mimeType });
          chunksRef.current = [];
  
          console.log(`Recorded video MIME type: ${webmBlob.type}`);
          console.log(`Recorded video size: ${webmBlob.size} bytes`);
  
          const ffmpeg = ffmpegRef.current;
  
          console.log("Writing input file to FFmpeg...");
          await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));
  
          console.log("Starting FFmpeg conversion...");
          const conversionStart = Date.now();
          const conversionTimeout = 60000; // 1 minute timeout
  
          let lastProgressTime = 0;
          ffmpeg.on('progress', ({ time }) => {
            if (time - lastProgressTime > 1000) { // Log progress every second
              console.log(`Conversion progress: ${time}ms`);
              lastProgressTime = time;
            }
          });
  
          const conversionPromise = ffmpeg.exec([
            '-i', 'input.webm',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '28',
            '-vf', 'scale=640:-2,fps=15',  // Reduce resolution to 640p width and 15 fps
            '-c:a', 'aac',
            '-b:a', '64k',
            '-movflags', '+faststart',
            'output.mp4'
          ]);
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("FFmpeg conversion timed out")), conversionTimeout)
          );
  
          await Promise.race([conversionPromise, timeoutPromise]);
  
          const conversionTime = Date.now() - conversionStart;
          console.log(`FFmpeg conversion completed in ${conversionTime}ms`);
  
          console.log("Reading output file...");
          const data = await ffmpeg.readFile('output.mp4');
          console.log(`Converted video size: ${data.byteLength} bytes`);
  
          const mp4Blob = new Blob([data.buffer], { type: 'video/mp4' });
          console.log("MP4 Blob created:", mp4Blob);
          console.log(`MP4 Blob size: ${mp4Blob.size} bytes`);
  
          // Clean up
          console.log("Cleaning up temporary files...");
          await ffmpeg.deleteFile('input.webm');
          await ffmpeg.deleteFile('output.mp4');
  
          console.log("Saving to storage...");
          const uniqueId = await saveCurrentCapture(mp4Blob);
  
          if (!uniqueId) {
            throw new Error("Failed to save video to storage");
          }
  
          const newPath = "https://sigmaagro-8488e.web.app/video" + "/" + uniqueId;
          setCaptureId(newPath);
          console.log("Capture saved with ID:", uniqueId);
        } catch (error) {
          console.error('Error in video processing:', error);
          console.error('Error stack:', error.stack);
          alert('An error occurred while processing the video. Please check the console for details and try again.');
        }
      };
  
      console.log("Starting MediaRecorder...");
      mediaRecorderRef.current.start();
  
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          console.log("Stopping MediaRecorder after 5 seconds...");
          mediaRecorderRef.current.stop();
        }
      }, 5000);
    } else {
      console.error("Canvas reference is not available");
    }
  }, [ffmpegLoaded]);

  useEffect(() => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const runCountdown = async () => {
      setUIStage(1);

      for (let i = 5; i >= 0; i--) {
        await sleep(1000);
        setTriggerCounter(i);
      }

      setTriggerCounter(5);
      setCircleUI(true);
      await sleep(2000);

      setUIStage(2);
      setCircleUI(false);

      startRecording();

      for (let i = 5; i >= 0; i--) {
        await sleep(1000);
        setTriggerCounter(i);
      }
      
      await sleep(1000);
      setTriggerCounter(5);

      setUIStage(0);
      setCircleUI(true);
    
      captureTimeoutRef.current = setTimeout(() => {
        setCaptureId(null);
        setCircleUI(false);
        setIsCaptureActive(false);
      }, 60000);
    };

    if (isCaptureActive) {
      runCountdown();
    }

    return () => {
      setTriggerCounter(5);
      if (captureTimeoutRef.current) {
        clearTimeout(captureTimeoutRef.current);
      }
    };
  }, [isCaptureActive, startRecording]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      chunksRef.current = [];
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {loadingState === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white z-30">
          Loading...
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-red-500 z-30">
          {error}
        </div>
      )}

      {!isSegmenting && (
        <button
          onClick={
            loadModels
              ? isSegmenting
                ? stopSegmentation
                : startSegmentation
              : () => setLoadModels(true)
          }
          className={`
          absolute bottom-4 left-1/2 transform -translate-x-1/2 
          px-4 py-2 rounded transition-colors z-20
          ${
            loadingState === "loading"
              ? "bg-yellow-500 text-white cursor-wait"
              : loadingState === "ready"
              ? "bg-green-500 text-white hover:bg-green-600"
              : "bg-blue-500 text-white hover:bg-blue-600"
          }
          ${loadingState === "error" ? "opacity-50 cursor-not-allowed" : ""}
        `}
          disabled={loadingState === "loading" || loadingState === "error"}
        >
          {loadingState === "loading"
            ? "Loading Models..."
            : !loadModels
            ? "Load Models"
            : isSegmenting
            ? "Stop Segmentation"
            : "Start Segmentation"}
        </button>
      )}

      <video ref={videoRef} className="hidden" autoPlay playsInline />
      <video
        ref={backgroundVideoRef}
        className="hidden"
        loop
        muted
        playsInline
        autoPlay
      />

      <video
        ref={layerVideoRef}
        className="hidden"
        loop
        muted
        playsInline
        autoPlay
      />

      <img
        ref={logoRef}
        src={Logo}
        alt="Logo"
        className="hidden"
      />    

      <div className="w-full h-full flex items-center justify-center absolute top-0 left-1/2 transform -translate-x-1/2">
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10"
        />

        <div
          ref={overlayRef}
          className="w-full h-full flex items-center justify-center pointer-events-none z-50"
        >
        {circleUI && <StyledQRCode stage={UIStage} value={captureId} />}
        </div>
        {isSegmenting && <div className="absolute bottom-0 w-full h-auto z-50">
          {!isCaptureActive && <Controls leftControlValue={leftControlValue} rightControlValue={rightControlValue} />}
          {isCaptureActive && UIStage !== 0 && <RecordingBar stage={UIStage} countdown={triggerCounter}/>}
        </div>}

        {UIStage === 0 && circleUI && (
        <div className="absolute bottom-0 left-0 right-0 h-32 flex items-center justify-center text-white text-7xl font-bold z-50">
          <div className="text-center mt-[-8rem]">
            ¡Escanea el QR para<br />compartir el video!
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default BackgroundSegmentation;