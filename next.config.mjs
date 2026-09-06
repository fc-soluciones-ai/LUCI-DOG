/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Next.js limita el body de una Server Action a 1 MB por defecto — toda
      // subida de foto/comprobante (hasta 4 MB, ver src/lib/client/imageUpload.ts)
      // rompía con un 413 antes de llegar al código de la acción. 4.5 MB es
      // además el techo real de una Serverless Function en Vercel: subir esto
      // por encima de ese valor no ayudaría, Vercel igual lo rechazaría antes.
      bodySizeLimit: '4.5mb',
    },
  },
}

export default nextConfig
