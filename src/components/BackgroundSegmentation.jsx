import React, { useRef, useEffect, useState } from 'react';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

const BackgroundSegmentation = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isSegmenting, setIsSegmenting] = useState(false);

  useEffect(() => {
    const selfieSegmentation = new SelfieSegmentation({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
      }
    });

    selfieSegmentation.setOptions({
      modelSelection: 1,
      selfieMode: true,
    });

    selfieSegmentation.onResults(onResults);

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((error) => {
          console.error('Error accessing the camera:', error);
        });
    }

    return () => {
      selfieSegmentation.close();
    };
  }, []);

  const onResults = (results) => {
    const canvasCtx = canvasRef.current.getContext('2d');
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    canvasCtx.drawImage(results.segmentationMask, 0, 0,
                        canvasRef.current.width, canvasRef.current.height);
    
    canvasCtx.globalCompositeOperation = 'source-in';
    canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
    
    canvasCtx.globalCompositeOperation = 'destination-atop';
    canvasCtx.fillStyle = '#00FF00';  // Green background
    canvasCtx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    canvasCtx.restore();
  };

  const startSegmentation = () => {
    if (videoRef.current && canvasRef.current) {
      const selfieSegmentation = new SelfieSegmentation({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
        }
      });

      selfieSegmentation.setOptions({
        modelSelection: 1,
        selfieMode: true,
      });

      selfieSegmentation.onResults(onResults);

      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          await selfieSegmentation.send({image: videoRef.current});
        },
        width: 640,
        height: 480
      });
      camera.start();
      setIsSegmenting(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <video ref={videoRef} className="hidden" autoPlay playsInline />
      <canvas ref={canvasRef} className="w-full max-w-lg border-4 border-blue-500 rounded-lg" width="640" height="480" />
      <button 
        onClick={startSegmentation}
        disabled={isSegmenting}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-gray-400"
      >
        {isSegmenting ? 'Segmentation Running' : 'Start Segmentation'}
      </button>
    </div>
  );
};

export default BackgroundSegmentation;