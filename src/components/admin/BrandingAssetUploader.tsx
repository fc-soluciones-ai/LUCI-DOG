'use client'

import { useActionState } from 'react'
import { ImageUploader } from './ImageUploader'
import { uploadBrandingAssetAction, type BrandingAssetState } from '@/modules/config/actions'

interface Props {
  kind: 'logo' | 'favicon' | 'appIcon'
  label: string
  hint: string
  currentUrl: string | null
}

const initialState: BrandingAssetState = { ok: false }

export function BrandingAssetUploader({ kind, label, hint, currentUrl }: Props) {
  const [state, formAction, pending] = useActionState(uploadBrandingAssetAction.bind(null, kind), initialState)

  return (
    <div>
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className="text-xs text-slate-500">{hint}</p>
      <form action={formAction} className="mt-2 max-w-xs">
        <ImageUploader initialImageUrl={currentUrl} />
        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? 'Guardando...' : 'Guardar'}
        </button>
        {state.message && !state.ok && <p className="mt-1 text-xs text-red-600">{state.message}</p>}
      </form>
    </div>
  )
}
