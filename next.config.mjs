/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // The Kusinang Pamana logo (Sidebar/Topbar/login) is hosted here as a
    // ~1.8MB PNG — remotePatterns lets next/image fetch, resize, and
    // recompress it to the small icon sizes it's actually shown at instead
    // of shipping the full file to every page.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.cdn.filesafe.space",
      },
    ],
  },
};

export default nextConfig;
