import React, { useRef, useEffect, useState } from 'react';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

const BackgroundSegmentation = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isSegmenting, setIsSegmenting] = useState(false);

  useEffect(() => {
    const loadSegmentation = async () => {
      const segmenter = new SelfieSegmentation({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/${file}`;
        }
      });

      await segmenter.initialize();

      segmenter.setOptions({
        modelSelection: 1,
        selfieMode: true,
      });

      segmenter.onResults(onResults);

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing the camera:', error);
        }
      }

      return segmenter;
    };

    let segmenter;
    loadSegmentation().then(s => {
      segmenter = s;
    });

    return () => {
      if (segmenter) {
        segmenter.close();
      }
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

  const startSegmentation = async () => {
    if (videoRef.current && canvasRef.current) {
      const segmenter = new SelfieSegmentation({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/${file}`;
        }
      });

      await segmenter.initialize();

      segmenter.setOptions({
        modelSelection: 1,
        selfieMode: true,
      });

      segmenter.onResults(onResults);

      const sendToSegmenter = async () => {
        if (videoRef.current.videoWidth > 0) {
          await segmenter.send({image: videoRef.current});
        }
        requestAnimationFrame(sendToSegmenter);
      };

      sendToSegmenter();
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