import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero-riverside.jpg";

export const Route = createFileRoute("/profile")({
  component: Profile,
});

function Profile() {
  return (
    <div className="relative min-h-screen overflow-hidden">

      {/* Background */}
      <img
        src={heroImg}
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative flex items-center justify-center min-h-screen px-5 py-10">

        <div className="w-full max-w-lg rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-8">

          {/* Avatar */}
          <div className="flex flex-col items-center">

            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-5xl shadow-lg">
              👤
            </div>

            <h1 className="text-3xl font-bold text-white mt-5">
              โปรไฟล์สมาชิก
            </h1>

            <p className="text-yellow-300 tracking-[3px] uppercase">
              Riverside Kitchen
            </p>

          </div>

          {/* Form */}

          <div className="space-y-4 mt-8">

            <div>
              <label className="text-white text-sm">
                ชื่อ - นามสกุล
              </label>

              <input
                type="text"
                defaultValue="คุณครีม"
                className="mt-2 w-full rounded-xl bg-white/20 border border-white/30 text-white placeholder:text-gray-300 px-4 py-3 outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="text-white text-sm">
                เบอร์โทรศัพท์
              </label>

              <input
                type="tel"
                defaultValue="0812345678"
                className="mt-2 w-full rounded-xl bg-white/20 border border-white/30 text-white px-4 py-3 outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="text-white text-sm">
                อีเมล
              </label>

              <input
                type="email"
                placeholder="example@gmail.com"
                className="mt-2 w-full rounded-xl bg-white/20 border border-white/30 text-white px-4 py-3 outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="text-white text-sm">
                วันเกิด
              </label>

              <input
                type="date"
                className="mt-2 w-full rounded-xl bg-white/20 border border-white/30 text-white px-4 py-3 outline-none focus:border-yellow-400"
              />
            </div>

          </div>

          {/* Buttons */}

          <div className="mt-8 space-y-3">

            <button
              className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold hover:scale-105 transition"
            >
              💾 บันทึกข้อมูล
            </button>

            <Link
              to="/home"
              className="block w-full text-center py-4 rounded-xl border border-white/30 text-white hover:bg-white/20 transition"
            >
              ← กลับหน้าหลัก
            </Link>

          </div>

        </div>

      </div>

    </div>
  );
}