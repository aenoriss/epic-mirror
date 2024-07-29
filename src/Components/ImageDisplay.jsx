import React, { useEffect, useState, useRef } from "react";
import { getVideoBlob } from '../Utils/firebase';
import { saveAs } from "file-saver";

const VideoDisplay = ({downloadURL, id}) => {
  const [videoBlob, setVideoBlob] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const blobCreation = async (downloadURL) => {
      try {
        const blob = await getVideoBlob(downloadURL);
        setVideoBlob(blob);
      } catch (error) {
        console.error("Error fetching video blob:", error);
      }
    };

    if (downloadURL) {
      blobCreation(downloadURL);
    }
  }, [downloadURL]);

  useEffect(() => {
    if (videoRef.current && videoBlob) {
      videoRef.current.src = URL.createObjectURL(videoBlob);
    }
  }, [videoBlob]);

  const handleDownload = async () => {
    if (downloadURL && videoBlob) {
      try {
        saveAs(videoBlob, `sigmaAgro_video-${id}.webm`);
      } catch (error) {
        console.error("Error downloading the video:", error);
      }
    }
  };

  const handleShare = async () => {
    if (downloadURL && videoBlob) {
      try {
        if (navigator.share) {
          await navigator.share({
            files: [
              new File([videoBlob], `sigmaAgro_video-${id}.webm`, {
                type: videoBlob.type,
              }),
            ],
            title: "Check out this video!",
            text: "Shared from SigmaAgro",
          });
        } else {
          console.log("Web Share API not supported");
          // Implement a fallback sharing method here
        }
      } catch (error) {
        console.error("Error sharing the video:", error);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div className="flex space-x-4 mb-4">
        <button
          onClick={handleDownload}
          disabled={!downloadURL || !videoBlob}
          className="px-4 py-2 font-semibold text-white bg-blue-500 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 active:bg-blue-700"
        >
          Descargar Video
        </button>
        <button
          onClick={handleShare}
          disabled={!downloadURL || !videoBlob}
          className="px-4 py-2 font-semibold text-white bg-green-500 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 active:bg-green-700"
        >
          Compartir
        </button>
      </div>
      <h1 className="text-xl font-bold mb-4">CLIENT {id}</h1>
      {downloadURL ? (
        <video 
          ref={videoRef}
          className="max-w-full h-auto"
          autoPlay 
          loop 
          muted 
          playsInline
          controls
        >
          Your browser does not support the video tag.
        </video>
      ) : (
        <p>Loading video...</p>
      )}
    </div>
  );
};

export default VideoDisplay;