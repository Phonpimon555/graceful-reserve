//import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero-riverside.jpg";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  return (
    <div className="relative min-h-screen overflow-hidden">

      {/* Background */}
      <img
        src={heroImg}
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Login Card */}
      <div className="relative flex items-center justify-center min-h-screen px-5">

        <div className="w-full max-w-md rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-8">

          <div className="text-center mb-8">

            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center mx-auto text-4xl shadow-lg">
              🍽️
            </div>

            <h1 className="mt-5 text-4xl font-bold text-white">
              ครัวริมบึง
            </h1>

            <p className="text-yellow-300 tracking-[4px] uppercase">
              Riverside Kitchen
            </p>

            <p className="text-gray-300 mt-4">
              เข้าสู่ระบบเพื่อจองโต๊ะและดูประวัติการจอง
            </p>

          </div>

          <input
            type="tel"
            placeholder="เบอร์โทรศัพท์"
            className="w-full rounded-xl bg-white/20 border border-white/30 text-white placeholder:text-gray-300 px-4 py-4 outline-none focus:border-yellow-400 mb-5"
          />

          <input
            type="tel"
            placeholder="รหัสผ่าน"
            className="w-full rounded-xl bg-white/20 border border-white/30 text-white placeholder:text-gray-300 px-4 py-4 outline-none focus:border-yellow-400 mb-5"
          />

          <Link to="/home">
            <button className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold hover:scale-105 transition">
              เข้าสู่ระบบ
            </button>
          </Link>

          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-white/20"></div>
            <span className="px-4 text-gray-300 text-sm">หรือ</span>
            <div className="flex-1 h-px bg-white/20"></div>
          </div>

          <Link
            to="/register"
            className="block text-center w-full py-4 rounded-xl border border-yellow-400 text-yellow-300 font-semibold hover:bg-yellow-500 hover:text-black transition mb-3"
          >
            สมัครสมาชิก
          </Link>

        </div>

      </div>
    </div>
  );
}