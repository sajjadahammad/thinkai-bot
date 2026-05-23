"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../../components/providers/AuthProvider";
import { ChevronRight, ChevronLeft, Sparkles, User, Settings, Check } from "lucide-react";
import gsap from "gsap";

export default function OnboardingPage() {
  const { onboard } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [preferredModel, setPreferredModel] = useState("mistral-large-latest");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const slideRef = useRef<HTMLDivElement | null>(null);

  // Animate slide when step changes
  useEffect(() => {
    if (slideRef.current) {
      gsap.fromTo(
        slideRef.current,
        { opacity: 0, x: 50 },
        { opacity: 1, x: 0, duration: 0.6, ease: "power2.out" }
      );
    }
  }, [step]);

  const handleNext = () => {
    if (step === 1 && !name.trim()) return;
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
  };

  const handleFinish = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      // Store preferences locally or just complete onboarding
      if (typeof window !== "undefined") {
        localStorage.setItem("preferred_model", preferredModel);
      }
      await onboard(name);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex min-h-screen items-center justify-center bg-[#070708] px-4 relative overflow-hidden"
    >
      {/* Background Glow */}
      <div className="absolute w-[400px] h-[400px] bg-emerald-400/5 rounded-full blur-[100px]" />

      {/* Onboarding Box */}
      <div className="max-w-xl w-full bg-[#0c0c0e] border border-zinc-900 rounded-3xl p-8 md:p-10 shadow-2xl relative z-10 flex flex-col min-h-[450px] justify-between">
        
        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 rounded-full transition-all duration-300 ${
                  s === step
                    ? "w-8 bg-emerald-400"
                    : s < step
                    ? "w-4 bg-emerald-700"
                    : "w-4 bg-zinc-900"
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
            Step {step} of 3
          </span>
        </div>

        {/* Slides Wrapper */}
        <div ref={slideRef} className="flex-1 flex flex-col justify-center">
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="inline-flex p-3 bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 rounded-2xl mb-2">
                  <User className="w-6 h-6" />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold font-heading text-white tracking-tight">
                  Let's customize your companion
                </h1>
                <p className="text-zinc-500 text-sm font-light">
                  How should OliveBot address you? Let's start with your name.
                </p>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={50}
                  className="w-full bg-[#070708] border border-zinc-900 rounded-2xl py-4 px-5 text-zinc-200 outline-none focus:border-emerald-500/50 transition-colors placeholder:text-zinc-700 text-lg font-light"
                  autoFocus
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="inline-flex p-3 bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 rounded-2xl mb-2">
                  <Settings className="w-6 h-6" />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold font-heading text-white tracking-tight">
                  Choose a model
                </h1>
                <p className="text-zinc-500 text-sm font-light">
                  Select your default LLM configuration. You can always change this later in the chat panel.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                {[
                  {
                    name: "Mistral Large (Smart)",
                    desc: "High-capability Mistral Large model, best for complex logic & brainstorming.",
                    value: "mistral-large-latest",
                  },
                  {
                    name: "Gemini 2.5 Flash (Fast)",
                    desc: "Gemini 2.5 Flash model, highly responsive and best for fast queries.",
                    value: "gemini-2.5-flash",
                  },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setPreferredModel(item.value)}
                    className={`text-left p-4 rounded-2xl border transition-all relative ${
                      preferredModel === item.value
                        ? "bg-emerald-950/10 border-emerald-500/50"
                        : "bg-[#070708] border-zinc-900 hover:border-zinc-800"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-zinc-200 text-sm">{item.name}</span>
                      {preferredModel === item.value && (
                        <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-black stroke-[3px]" />
                        </div>
                      )}
                    </div>
                    <p className="text-zinc-500 text-[11px] leading-relaxed font-light">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="inline-flex p-3 bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 rounded-2xl mb-2">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold font-heading text-white tracking-tight">
                  You're all set, {name}!
                </h1>
                <p className="text-zinc-500 text-sm font-light">
                  Your customized conversational companion is configured and ready. Click launch below to open the chat dashboard.
                </p>
              </div>

              <div className="bg-[#070708] border border-zinc-900/60 rounded-2xl p-4 flex flex-col space-y-2.5">
                <div className="flex justify-between text-xs font-light">
                  <span className="text-zinc-500">Name</span>
                  <span className="text-zinc-300 font-semibold">{name}</span>
                </div>
                <div className="flex justify-between text-xs font-light">
                  <span className="text-zinc-500">Default Model</span>
                  <span className="text-zinc-300 font-semibold">
                    {preferredModel === "mistral-large-latest" ? "Mistral Large" : "Gemini 2.5 Flash"}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-light">
                  <span className="text-zinc-500">Telemetry Logs</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                    Ingesting
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between border-t border-zinc-900/40 pt-6 mt-8">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 text-sm transition-colors py-2 px-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={step === 1 && !name.trim()}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 hover:bg-zinc-800 font-medium py-2.5 px-5 rounded-xl text-sm transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:hover:bg-zinc-900"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={isSubmitting}
              className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-900/60 text-emerald-400 font-semibold py-2.5 px-6 rounded-xl text-sm transition-colors flex items-center gap-2"
            >
              {isSubmitting ? "Launching..." : "Launch OliveBot"}
              <Sparkles className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
