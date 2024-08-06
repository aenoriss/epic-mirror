import React, { useState } from "react";
import logoLanding from "../assets/logoLanding.png";
import webBackground from "../assets/web_background.png";

const UserForm = ({ changeStage }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const validateEmail = (email) => {
    const re = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    return re.test(String(email).toLowerCase());
  };

  const validatePhoneNumber = (phoneNumber) => {
    const re = /^\+?[1-9]\d{1,14}$/;
    return re.test(phoneNumber);
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!validateEmail(email)) {
        setEmailError("Por favor, ingresa un correo valido.");
        return;
      }
      setEmailError("");
    }
    setStep(step + 1);
  };

  const handlePreviousStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validatePhoneNumber(phoneNumber)) {
      setPhoneError("Por favor, ingresa un numero de telefono valido.");
      return;
    }
    setPhoneError("");
    changeStage({ email, phoneNumber });
  };

  return (
    <div className="relative flex flex-col items-center justify-top min-h-screen bg-black pt-[15%]">
      <div className="w-full flex flex-col items-center">
        <img src={logoLanding} width="40%" alt="Logo" className="mb-8" />
        <div className="text-white text-[1.3rem] w-[55%] font-bold text-center">
          La <span className="text-blue-300">nueva visión</span> de la
          agricultura
        </div>
      </div>

      <div>
        <div className="text-white flex flex-col items-center mt-[10%] w-[67%]">
          <div className="text-[1rem] font-bold">Procesando tu video...</div>
          <div className="text-[1rem]">
            Mientras tanto dejanos algunos datos para que podamos seguir en
            contacto.
          </div>
        </div>
        <div className="max-w-md w-full p-6 rounded-md shadow-md flex flex-col items-center">
          <form
            onSubmit={handleSubmit}
            className="w-full flex flex-col items-center"
          >
            {step === 1 && (
              <div className="w-full mb-4">
                <label
                  htmlFor="email"
                  className="block mb-2 font-medium text-white"
                >
                  Correo Electronico
                </label>
                <input
                  type="email"
                  id="email"
                  className="w-full px-4 py-2 mb-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                {emailError && (
                  <p className="text-red-500 text-sm mb-2">{emailError}</p>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="w-full mb-4">
                <label
                  htmlFor="phoneNumber"
                  className="block mb-2 font-medium text-gray-700"
                >
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  className="w-full px-4 py-2 mb-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
                {phoneError && (
                  <p className="text-red-500 text-sm mb-2">{phoneError}</p>
                )}
              </div>
            )}

            <div className="w-full flex justify-between">
              {step > 1 && (
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  onClick={handlePreviousStep}
                >
                  Previous
                </button>
              )}

              {step < 2 ? (
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
                  onClick={handleNextStep}
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
                >
                  Submit
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <img
        src={webBackground}
        alt="Background"
        className="absolute bottom-0 w-full"
        style={{ pointerEvents: "none" }}
      />
    </div>
  );
};

export default UserForm;
