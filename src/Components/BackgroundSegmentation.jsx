import React, { useRef, useEffect, useState, useCallback } from "react";
import { SelfieSegmentation } from "@mediapipe/selfie_segmentation";
import "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";
import QRCode from "qrcode.react";
import { saveCurrentCapture } from "../Utils/firebase";

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

  //Video Recording
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const [loadModels, setLoadModels] = useState(false);
  const [isSegmenting, setIsSegmenting] = useState(false);

  const [thumbsUp, setThumbsUp] = useState(null);
  const [indexUp, setIndexUp] = useState(null);
  const [isCaptureActive, setIsCaptureActive] = useState(false);

  const [currentScene, setCurrentScene] = useState(1);
  const [captureId, setCaptureId] = useState(null);

  const [triggerCounter, setTriggerCounter] = useState(4);
  const [loadingState, setLoadingState] = useState("initial");
  const [error, setError] = useState(null);

  useEffect(() => {
    //Setting Background Video
    if (backgroundVideoRef.current) {
      currentScene == 1
        ? (backgroundVideoRef.current.src = CountrysideBackground)
        : (backgroundVideoRef.current.src = InterviewBackground);
      backgroundVideoRef.current.loop = true;
      backgroundVideoRef.current.muted = true;
      backgroundVideoRef.current.play().catch((error) => {});
    }

    //Setting Layer Video
    if (currentScene == 1) {
      if (layerVideoRef.current) {
        layerVideoRef.current.src = CountrysideLayer;
        layerVideoRef.current.loop = true;
        layerVideoRef.current.muted = true;
        layerVideoRef.current.play().catch((error) => {});
      }
    }

    //Setting Logo Image
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
    const updateOverlaySize = () => {
      if (canvasRef.current && overlayRef.current) {
        const { width, height } = canvasRef.current.getBoundingClientRect();
        overlayRef.current.style.width = `${width}px`;
        overlayRef.current.style.height = `${height}px`;
      }
    };

    updateOverlaySize();
    window.addEventListener("resize", updateOverlaySize);

    return () => window.removeEventListener("resize", updateOverlaySize);
  }, []);

  useEffect(() => {
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);

  // const createBlobFromCanvas = useCallback(() => {
  //   if (canvasRef.current) {
  //     canvasRef.current.toBlob(async (blob) => {
  //       if (blob) {
  //         console.log("Blob created:", URL.createObjectURL(blob));
  //         const uniqueId = await saveCurrentCapture(blob);

  //         const url = new URL(window.location.href);
  //         const newPath = url.origin + "/photo" + "/" + uniqueId;

  //         setCaptureId(newPath);

  //         console.log("newPath", newPath);
  //       } else {
  //         console.error("Failed to create blob from canvas");
  //       }
  //     }, "image/png");
  //   }
  // }, []);

  const startRecording = useCallback(() => {
    //Setups Media Recording
    if (canvasRef.current) {
      //Video stream is created from the canvas (Canvas API)
      const stream = canvasRef.current.captureStream(60); //30 FPS

      //Initializes MediaRecorder and assigns Media Stream
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: "video/webm; codecs=vp9",
        videoBitsPerSecond: 8000000, // 8 Mbps for high quality
      });

      //Pushes frame to Video Chunk (Video Clip)
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      //Async method triggered when the streaming stops.
      mediaRecorderRef.current.onstop = async () => {
        //Creates videoclip from chunk
        const blob = new Blob(chunksRef.current, { type: "video/webm" });

        //Cleans chunksRef
        chunksRef.current = [];

        //Saves the video in storage and gets the ID.
        console.log("Video recorded:", URL.createObjectURL(blob));
        const uniqueId = await saveCurrentCapture(blob);

        //Builds the URL to generate the QR Code
        const url = new URL(window.location.href);
        const newPath = url.origin + "/video" + "/" + uniqueId;
        setCaptureId(newPath);
        console.log("newPath", newPath);
      };

      //Starts the Recording
      mediaRecorderRef.current.start();

      //Stop recording after 5 seconds
      setTimeout(() => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === "recording"
        ) {
          mediaRecorderRef.current.stop();
        }
      }, 5000);

      //Erase QR after 20 sec
      setTimeout(() => {
        console.log("QR DELETED!")
        setCaptureId(null);
      }, 60000);

    }
  }, []);

  useEffect(() => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const runCountdown = async () => {
      console.log(" COUNTDOWN CALLED");

      // Countdown starts
      for (let i = 4; i >= 0; i--) {
        await sleep(2000);
        setTriggerCounter(i);
      }

      // Start recording
      startRecording();

      // Wait for 5 seconds of recording
      await sleep(5000);

      //Experience Restarts
      await sleep(2000);

      //Experience Restarts
      setIsCaptureActive(false);
    };

    if (isCaptureActive == true) {
      console.log("Capture Active");

      //Start Countdown
      runCountdown();
    }

    return () => {
      //When Capture finishes restart countdown
      setTriggerCounter(4);
    };
  }, [isCaptureActive]);

  useEffect(() => {
    console.log("triggerCounter", triggerCounter);
  }, [triggerCounter]);

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
    };
  }, [loadModels]);

  const updateCanvasSize = () => {
    if (videoRef.current && canvasRef.current) {
      const aspectRatio = 9 / 16; // For vertical 1080p
      const width = 1080;
      const height = width / aspectRatio;

      canvasRef.current.width = width;
      canvasRef.current.height = height;
      canvasRef.current.style.width = `${width}px`;
      canvasRef.current.style.height = `${height}px`;
    }
  };

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

    // Calculate scale to fit height
    const scale = canvasHeight / imageHeight;
    const scaledWidth = imageWidth * scale;

    // Calculate x-offset to center horizontally
    const xOffset = (canvasWidth - scaledWidth) / 2;

    // Draw the segmentation mask (already inverted due to selfieMode: true)
    canvasCtx.drawImage(
      results.segmentationMask,
      xOffset,
      0,
      scaledWidth,
      canvasHeight
    );

    // Set composite operation to only draw where the mask is
    canvasCtx.globalCompositeOperation = "source-in";

    // Draw the camera feed (now flipped)
    canvasCtx.drawImage(
      results.image, // Changed from results.segmentationMask to results.image
      xOffset,
      0,
      scaledWidth,
      canvasHeight
    );

    // Reset the transform
    canvasCtx.setTransform(1, 0, 0, 1, 0, 0);

    // Draw the background video behind everything
    canvasCtx.globalCompositeOperation = "destination-over";
    canvasCtx.drawImage(
      backgroundVideoRef.current,
      0,
      0,
      canvasWidth,
      canvasHeight
    );

    // Draw Layer

    if(currentScene == 1){
      canvasCtx.globalCompositeOperation = "source-over";
      canvasCtx.drawImage(layerVideoRef.current, 0, 0, canvasWidth, canvasHeight);
    }

    // Draw Logo
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

  const changeScene = async () => {
    currentScene == 1 ? setCurrentScene(2) : setCurrentScene(1);
  };

  useEffect(() => {
    console.log("currentScene", currentScene);
  }, [currentScene]);

  useEffect(() => {
    if (thumbsUp) {
      timerRef.current = setTimeout(() => {
        if (isCaptureActive == false) {
          setIsCaptureActive(true);
        }
      }, 1500);
    } else if (indexUp) {
      timerRef.current = setTimeout(() => {
        if (isCaptureActive == false) {
          changeScene();
        }
      }, 1500);
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [thumbsUp, indexUp]);

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

  const startSegmentation = useCallback(async () => {
    setIsSegmenting(true);
  }, [initializeSegmenter]);

  const stopSegmentation = useCallback(() => {
    setIsSegmenting(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
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

      {thumbsUp && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-red-500 text-white rounded z-20">
          Thumbs up
        </div>
      )}

      {indexUp && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-red-500 text-white rounded z-20">
          indexUp
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

      <div className="h-full flex items-center justify-center absolute top-0 left-1/2 transform -translate-x-1/2">
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10"
        />

        <div
          ref={overlayRef}
          className="w-full h-full flex items-center justify-center pointer-events-none z-50"
        >
          {isCaptureActive && (
            <div
              className="text-white text-9xl font-bold text-center"
              style={{
                textShadow: "0 0 10px rgba(0,0,0,0.5)",
                transition: "opacity 0.3s ease-in-out",
                opacity: triggerCounter >= 0 ? 1 : 0,
              }}
            >
              {triggerCounter !== 0 ? triggerCounter : "¡Foto Tomada!"}
            </div>
          )}
          {captureId && <QRCode value={captureId} size={500} />}
        </div>
      </div>
    </div>
  );
};

export default BackgroundSegmentation;
