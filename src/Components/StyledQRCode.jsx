import React, { useEffect, useState } from "react";
import QRCode from "qrcode.react";

const StyledQRCode = ({ value, stage, size = 700 }) => {
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prevCount) => (prevCount > 0 ? prevCount - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-screen h-screen flex items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <div
          className="absolute inset-0 bg-sky-400 rounded-full flex items-center justify-center"
          style={{ padding: size * 0.1 }} // 10% padding
        >
          {stage == 0 ? (
            <QRCode
              value={value}
              size={size * 0.6}
              fgColor="#FFFFFF"
              bgColor="transparent"
            />
          ) : (
            <div>
              <p className="text-white text-[3rem] font-bold">
                GRABACION INICIADA
              </p>
            </div>
          )}

          {stage == 0 && <div className="absolute bottom-14 left-1/2 transform -translate-x-1/2 text-white text-4xl font-bold">
            {String(Math.floor(countdown / 60)).padStart(2, "0")}:
            {String(countdown % 60).padStart(2, "0")}
          </div>}
        </div>
      </div>
    </div>
  );
};

export default StyledQRCode;
