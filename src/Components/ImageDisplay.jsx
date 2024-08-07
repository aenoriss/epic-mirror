import React, { useEffect, useState, useRef } from "react";
import { getVideoBlob } from '../Utils/firebase';
import { saveAs } from "file-saver";

const VideoDisplay = ({downloadURL, id}) => {
  const [videoBlob, setVideoBlob] = useState(null);
  const [canShare, setCanShare] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const blobCreation = async (downloadURL) => {
      try {
        const blob = await getVideoBlob(downloadURL);
        setVideoBlob(blob);
        checkShareability(blob);
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

  const checkShareability = (blob) => {
    if (navigator.canShare && blob) {
      const file = new File([blob], `video-${id}.mp4`, { type: 'video/mp4' });
      setCanShare(navigator.canShare({ files: [file] }));
    } else {
      setCanShare(false);
    }
  };

  const handleDownload = () => {
    if (videoBlob) {
      saveAs(videoBlob, `sigmaAgro_video-${id}.mp4`);
    }
  };

  const handleShare = async () => {
    if (videoBlob && canShare) {
      try {
        const file = new File([videoBlob], `sigmaAgro_video-${id}.mp4`, { type: 'video/mp4' });
        await navigator.share({
          files: [file],
          title: "Check out this video!",
          text: "Shared from SigmaAgro",
        });
        console.log("Video shared successfully");
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log("Sharing was aborted");
        } else {
          console.error("Error sharing the video:", error);
          alert("There was an error sharing the video. You may need to download and share it manually.");
        }
      }
    } else {
      alert("Sharing is not supported on this device or for this file. You can download the video and share it manually.");
    }
  };

  return (
    <div className="flex flex-col items-center bg-black justify-center w-full h-full">
      <div className="flex flex-col mb-4 w-full p-5 mb-5">
        <div className="text-[#26C1D8] font-bold text-[1.5rem] ">
          ¡Comparti tu video!
        </div>
        <div className="text-white text-[1.2rem] mt-2">
        Podes mandarlo por Whatsapp o usarlo en una historia de Instagram, entre otras alternativas.
        </div>
        <button
          onClick={handleShare}
          disabled={!canShare}
          className="w-full px-6 py-3 text-sm mt-[2rem] font-medium text-white bg-[#26C1D8] rounded-md">
          Compartir
        </button>
      </div>
      {!canShare && videoBlob && (
        <p className="text-yellow-600 mb-2">Sharing may not be supported on this device or for this file.</p>
      )}
      {videoBlob ? (
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