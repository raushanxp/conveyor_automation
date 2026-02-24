import { useState } from "react";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  return (
    <div className="min-h-screen bg-slate-200 flex items-center justify-center font-sans">
      <div className="flex w-[780px] min-h-[510px] rounded-2xl overflow-hidden shadow-2xl">

        {/* Left Panel — SVG image fills the entire panel */}
        <div className="relative w-[320px] flex-shrink-0">
          <img
            src="/Side-image.png"
            alt="LUXWarehouse"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Right Panel */}
        <div className="flex-1 bg-white flex flex-col px-10 py-11">
          <h2 className="text-[26px] font-bold text-gray-900 mb-1">Log In</h2>
          <p className="text-[13px] text-gray-400 mb-7">
            Enter your details to access your workspace.
          </p>

          {/* Username field */}
          <div className="mb-5">
            <label className="block text-[13px] font-medium text-gray-700 mb-2">
              Username or Email
            </label>
            <div className="relative flex items-center">
              <svg
                className="absolute left-3.5 w-4 h-4 text-gray-400 pointer-events-none"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <input
                type="text"
                placeholder="Enter your username"
                className="w-full pl-10 pr-4 py-[11px] bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-700 outline-none focus:border-blue-400 transition-colors"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="mb-5">
            <label className="block text-[13px] font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative flex items-center">
              <svg
                className="absolute left-3.5 w-4 h-4 text-gray-400 pointer-events-none"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type={showPassword ? "text" : "password"}
               placeholder="password"
                className="w-full pl-10 pr-10 py-[11px] bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-700 outline-none focus:border-blue-400 transition-colors"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Remember me + Forgot password */}
          <div className="flex items-center justify-between mb-6">
            <label className="flex items-center gap-2 text-[13px] text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={() => setRemember(!remember)}
                className="w-4 h-4 accent-blue-600 cursor-pointer"
              />
              Remember me
            </label>
            <a href="#" className="text-[13px] text-[#155DFC] font-medium hover:underline">
              Forgot Password?
            </a>
          </div>

          {/* Login button */}
        <button className="w-full py-[15px] bg-[#155DFC] hover:bg-blue-700 text-white font-semibold text-[15px] rounded-xl transition-colors tracking-wide shadow-[0_8px_24px_rgba(37,99,235,0.45)] flex items-center justify-center gap-2">
  Log In
  {/* Added translate-y-px here to nudge it down 1 pixel */}
  <img src="/rightarrow.svg" alt="" className="w-4 h-4 translate-y-px" />
</button>
        </div>

      </div>
    </div>
  );
}