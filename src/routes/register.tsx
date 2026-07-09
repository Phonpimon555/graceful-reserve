import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero-riverside.jpg";

export const Route = createFileRoute("/register")({
  component: Register,
});

function Register() {
  return (
    <div className="relative min-h-screen overflow-hidden">

      {/* Background */}
      <img
        src={heroImg}
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Register Card */}
      <div className="relative flex items-center justify-center min-h-screen px-5 py-10">

        <div className="w-full max-w-lg rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-8">

          {/* Logo */}
          <div className="text-center mb-8">

            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center mx-auto text-4xl shadow-lg">
              🍽️
            </div>

            <h1 className="mt-5 text-4xl font-bold text-white">
              สมัครสมาชิก
            </h1>

            <p className="text-yellow-300 tracking-[4px] uppercase">
              Riverside Kitchen
            </p>

            <p className="text-gray-300 mt-4">
              สมัครสมาชิกเพื่อสะดวกในการจองโต๊ะ
              และติดตามประวัติการจองของคุณ
            </p>

          </div>

          {/* Form */}

          <div className="space-y-4">

            <input
              type="text"
              placeholder="ชื่อ - นามสกุล"
              className="w-full rounded-xl bg-white/20 border border-white/30 text-white placeholder:text-gray-300 px-4 py-4 outline-none focus:border-yellow-400"
            />

            <input
              type="tel"
              placeholder="เบอร์โทรศัพท์"
              className="w-full rounded-xl bg-white/20 border border-white/30 text-white placeholder:text-gray-300 px-4 py-4 outline-none focus:border-yellow-400"
            />

            <input
              type="email"
              placeholder="อีเมล"
              className="w-full rounded-xl bg-white/20 border border-white/30 text-white placeholder:text-gray-300 px-4 py-4 outline-none focus:border-yellow-400"
            />

            <input
              type="password"
              placeholder="รหัสผ่าน"
              className="w-full rounded-xl bg-white/20 border border-white/30 text-white placeholder:text-gray-300 px-4 py-4 outline-none focus:border-yellow-400"
            />

            <Link to="/login">
                <button
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold text-lg hover:scale-105 transition"
                >
                    สมัครสมาชิก
                </button>
            </Link>

          </div>

          {/* Bottom */}

          <div className="mt-8 text-center">

            <span className="text-gray-300">
              มีบัญชีอยู่แล้ว?
            </span>

            <Link
              to="/login"
              className="text-yellow-300 font-semibold ml-2 hover:underline"
            >
              เข้าสู่ระบบ
            </Link>

          </div>

        </div>

      </div>

    </div>
  );
}