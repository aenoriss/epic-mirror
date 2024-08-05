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

  const updateCanvasSize = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const aspectRatio = 9 / 16; // For vertical 1080p
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

    const scale = canvasHeight / imageHeight;
    const scaledWidth = imageWidth * scale;

    const xOffset = (canvasWidth - scaledWidth) / 2;

    canvasCtx.drawImage(
      results.segmentationMask,
      xOffset,
      0,
      scaledWidth,
      canvasHeight
    );

    canvasCtx.globalCompositeOperation = "source-in";

    canvasCtx.drawImage(
      results.image,
      xOffset,
      0,
      scaledWidth,
      canvasHeight
    );

    canvasCtx.setTransform(1, 0, 0, 1, 0, 0);

    canvasCtx.globalCompositeOperation = "destination-over";
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
            currentThumbsUp = gestureResults.gestures[0].some(
              (gesture) => gesture.categoryName === "Thumb_Up"
            );
            currentIndexUp = gestureResults.gestures[0].some(
              (gesture) => gesture.categoryName === "Pointing_Up"
            );
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
    if (canvasRef.current) {
      const stream = canvasRef.current.captureStream(30);
  
      const mimeTypes = [
        'video/mp4; codecs=h264,aac',
      ];
  
      let selectedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
  
      if (!selectedMimeType) {
        console.error('No supported MIME types found');
        alert('Your browser does not support any of the required video formats. Please try a different browser.');
        return;
      }
  
      console.log(`Using MIME type: ${selectedMimeType}`);
  
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 2500000
      });
  
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
  
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: selectedMimeType.split(';')[0] });
        chunksRef.current = [];
  
        console.log(`Recorded video MIME type: ${blob.type}`);
  
        const uniqueId = await saveCurrentCapture(blob);
  
        const newPath = "https://sigmaagro-8488e.web.app/video" + "/" + uniqueId;
        setCaptureId(newPath);
      };
  
      mediaRecorderRef.current.start();
  
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, 5000);
    }
  }, []);

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