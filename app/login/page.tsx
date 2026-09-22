import type { Metadata } from "next";
import Image from "next/image";
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
            <Image src={LOGO_IMAGE} alt="" width={48} height={48} priority className="h-full w-full object-cover" />
          </div>
          <h1 className="font-display text-xl font-bold text-brand-900">Kusinang Pamana</h1>
          <p className="text-sm text-gray-500">Sign in to the business dashboard</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
