"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "../../components/providers/AuthProvider";
import { Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import gsap from "gsap";

const schema = yup.object().shape({
  email: yup
    .string()
    .email("Please enter a valid email address")
    .required("Email address is required"),
  password: yup
    .string()
    .required("Password is required")
    .min(6, "Password must be at least 6 characters"),
  confirmPassword: yup
    .string()
    .required("Please confirm your password")
    .oneOf([yup.ref("password")], "Passwords must match"),
});

type SignupFormInputs = yup.InferType<typeof schema>;

export default function SignupPage() {
  const { register: registerUser } = useAuth();
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<SignupFormInputs>({
    resolver: yupResolver(schema),
    mode: "onChange",
  });

  // GSAP Entrance Animation
  useEffect(() => {
    if (containerRef.current && formRef.current) {
      const tl = gsap.timeline();
      tl.fromTo(
        containerRef.current.querySelector(".bg-glow"),
        { scale: 0.5, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1.5, ease: "power3.out" }
      );
      tl.fromTo(
        formRef.current.childNodes,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: "power2.out" },
        "-=1.0"
      );
    }
  }, []);

  const onSubmit = async (data: SignupFormInputs) => {
    setBackendError(null);
    setIsSubmitting(true);

    try {
      await registerUser(data.email, data.password);
    } catch (err: any) {
      setIsSubmitting(false);
      setBackendError(
        err.response?.data?.detail || "Registration failed. Email might already be taken."
      );
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex min-h-screen items-center justify-center bg-[#070708] px-4 relative overflow-hidden"
    >
      {/* Background Glow */}
      <div className="bg-glow absolute w-[300px] h-[300px] bg-emerald-400/10 rounded-full blur-[80px]" />

      <div className="max-w-md w-full z-10">
        <form
          ref={formRef}
          onSubmit={handleSubmit(onSubmit)}
          className="bg-[#0c0c0e] border border-zinc-900 rounded-2xl p-8 shadow-2xl flex flex-col space-y-6"
        >
          {/* Logo / Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div
                className="w-12 h-12 rounded-full blur-[0.5px] shadow-[0_0_30px_5px_rgba(52,211,153,0.3)] border border-emerald-300/30 flex items-center justify-center"
                style={{
                  background:
                    "radial-gradient(circle, rgba(16,185,129,1) 0%, rgba(5,150,105,0.75) 45%, rgba(4,120,87,0.2) 100%)",
                }}
              >
                <span className="text-white font-bold text-lg font-heading">O</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold font-heading text-white tracking-tight">
              Create an account
            </h1>
            <p className="text-zinc-500 text-xs font-light">
              Get started with your custom OliveBot assistant
            </p>
          </div>

          {/* Error Message */}
          {backendError && (
            <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-3 flex items-start space-x-2 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{backendError}</span>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-zinc-400 text-[10px] uppercase tracking-wider font-semibold">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-600" />
                <input
                  type="email"
                  {...register("email")}
                  placeholder="name@gmail.com"
                  className="w-full bg-[#070708] border border-zinc-900 rounded-xl py-3 pl-11 pr-4 text-sm text-zinc-200 outline-none focus:border-emerald-500/50 transition-colors placeholder:text-zinc-700 font-light"
                />
              </div>
              {errors.email && (
                <span className="text-[10px] text-red-400 mt-1 block pl-1">
                  {errors.email.message}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-400 text-[10px] uppercase tracking-wider font-semibold">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-600" />
                <input
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  placeholder="••••••••"
                  className="w-full bg-[#070708] border border-zinc-900 rounded-xl py-3 pl-11 pr-11 text-sm text-zinc-200 outline-none focus:border-emerald-500/50 transition-colors placeholder:text-zinc-700 font-light"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-zinc-600 hover:text-zinc-400 outline-none transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <span className="text-[10px] text-red-400 mt-1 block pl-1">
                  {errors.password.message}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-400 text-[10px] uppercase tracking-wider font-semibold">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-600" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  {...register("confirmPassword")}
                  placeholder="••••••••"
                  className="w-full bg-[#070708] border border-zinc-900 rounded-xl py-3 pl-11 pr-11 text-sm text-zinc-200 outline-none focus:border-emerald-500/50 transition-colors placeholder:text-zinc-700 font-light"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-3.5 text-zinc-600 hover:text-zinc-400 outline-none transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <span className="text-[10px] text-red-400 mt-1 block pl-1">
                  {errors.confirmPassword.message}
                </span>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !isValid}
            className="w-full bg-emerald-950 hover:bg-emerald-900 border border-emerald-900/60 text-emerald-400 font-medium py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {isSubmitting ? "Creating account..." : "Sign up"}
            {!isSubmitting && (
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            )}
          </button>

          {/* Switch page link */}
          <div className="text-center text-xs text-zinc-500 font-light">
            Already have an account?{" "}
            <Link href="/login" className="text-emerald-400 hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
