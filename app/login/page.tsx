import type { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";

const LOGO_IMAGE =
  "https://assets.cdn.filesafe.space/xALi9D5ZQRYrKD8SoD6y/media/6a734833329b76ca7b4b64e0.png";

export const metadata: Metadata = {
  title: "Sign In — Kusinang Pamana",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-brand-900 ring-1 ring-brand-900/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_IMAGE} alt="" className="h-full w-full object-cover" />
          </div>
          <h1 className="font-display text-xl font-bold text-brand-900">Kusinang Pamana</h1>
          <p className="text-sm text-gray-500">Sign in to the business dashboard</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <LoginForm />
        </div>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          Demo build — sign in with any active account from User Access (e.g.{" "}
          <span className="font-medium">marites@kusinangpamana.ph</span>) using the password{" "}
          <span className="font-medium">Kusinang2026!</span>
        </div>
      </div>
    </div>
  );
}
