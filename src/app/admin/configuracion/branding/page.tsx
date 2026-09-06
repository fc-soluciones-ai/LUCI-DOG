import Link from 'next/link'
import { getBranding } from '@/modules/config/branding'
import { updateBrandingAction, updateWhatsappTemplateOverrideAction } from '@/modules/config/actions'
import { BrandingAssetUploader } from '@/components/admin/BrandingAssetUploader'

export const dynamic = 'force-dynamic'

const WHATSAPP_TEMPLATES: { name: string; label: string }[] = [
  { name: 'PRE_ALERT_5_DAYS', label: 'Aviso 5 días antes de la cita' },
  { name: 'REMINDER_24H', label: 'Recordatorio 24 horas antes' },
  { name: 'LOCATION_22H', label: 'Ubicación del salón (22 horas antes)' },
  { name: 'DEPARTURE_15MIN', label: 'Aviso de salida (15 min antes)' },
  { name: 'RECEIPT', label: 'Recibo de cobro (con link de pago)' },
  { name: 'DELAY_ALERT', label: 'Aviso de retraso' },
]

export default async function BrandingPage() {
  const branding = await getBranding()

  return (
    <div className="space-y-10">
      <div>
        <Link href="/admin/configuracion" className="text-sm text-slate-500 hover:text-slate-900">
          ← Configuración
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Marca (White Label)</h1>
        <p className="text-slate-600">
          Personaliza el nombre, logo, colores y mensajes que ven tus clientes en el Portal del Cliente, el
          Dashboard TV y el panel de administración.
        </p>
      </div>

      <section>
        <h2 className="text-lg font-medium text-slate-900">Identidad visual</h2>
        <div className="mt-3 grid gap-6 sm:grid-cols-3">
          <BrandingAssetUploader
            kind="logo"
            label="Logo"
            hint="Se muestra en el header de Admin, Portal del Cliente y Dashboard TV."
            currentUrl={branding.logoUrl}
          />
          <BrandingAssetUploader
            kind="favicon"
            label="Favicon"
            hint="Ícono de la pestaña del navegador."
            currentUrl={branding.faviconUrl}
          />
          <BrandingAssetUploader
            kind="appIcon"
            label="Ícono de la app (PWA)"
            hint="Ícono al instalar el Portal del Cliente en el celular."
            currentUrl={branding.appIconUrl}
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-900">Identidad, contacto y colores</h2>
        <form action={updateBrandingAction} className="mt-3 grid max-w-2xl gap-3 sm:grid-cols-2">
          <label className="text-sm text-slate-700 sm:col-span-2">
            Nombre comercial
            <input name="businessName" required defaultValue={branding.businessName} className="input mt-1 w-full" />
          </label>
          <label className="text-sm text-slate-700 sm:col-span-2">
            Eslogan
            <input name="slogan" defaultValue={branding.slogan ?? ''} className="input mt-1 w-full" />
          </label>
          <label className="text-sm text-slate-700">
            Teléfono oficial
            <input name="officialPhone" defaultValue={branding.officialPhone ?? ''} className="input mt-1 w-full" />
          </label>
          <label className="text-sm text-slate-700">
            Moneda (código ISO 4217)
            <input name="currencyCode" defaultValue={branding.currencyCode} maxLength={3} className="input mt-1 w-full" />
          </label>
          <label className="text-sm text-slate-700 sm:col-span-2">
            Dirección
            <input name="address" defaultValue={branding.address ?? ''} className="input mt-1 w-full" />
          </label>

          <label className="text-sm text-slate-700">
            Instagram
            <input name="instagram" defaultValue={branding.socialLinks.instagram ?? ''} placeholder="https://instagram.com/..." className="input mt-1 w-full" />
          </label>
          <label className="text-sm text-slate-700">
            Facebook
            <input name="facebook" defaultValue={branding.socialLinks.facebook ?? ''} placeholder="https://facebook.com/..." className="input mt-1 w-full" />
          </label>
          <label className="text-sm text-slate-700">
            TikTok
            <input name="tiktok" defaultValue={branding.socialLinks.tiktok ?? ''} placeholder="https://tiktok.com/@..." className="input mt-1 w-full" />
          </label>
          <label className="text-sm text-slate-700">
            WhatsApp de contacto
            <input name="whatsapp" defaultValue={branding.socialLinks.whatsapp ?? ''} placeholder="+506..." className="input mt-1 w-full" />
          </label>

          <label className="text-sm text-slate-700">
            Color primario
            <input name="primaryColor" type="color" defaultValue={branding.primaryColor} className="input mt-1 h-10 w-full p-1" />
          </label>
          <label className="text-sm text-slate-700">
            Color secundario
            <input name="secondaryColor" type="color" defaultValue={branding.secondaryColor} className="input mt-1 h-10 w-full p-1" />
          </label>
          <label className="text-sm text-slate-700">
            Color de acento
            <input name="accentColor" type="color" defaultValue={branding.accentColor} className="input mt-1 h-10 w-full p-1" />
          </label>

          <label className="text-sm text-slate-700 sm:col-span-2">
            Pie de página de recibos
            <textarea
              name="invoiceFooterText"
              defaultValue={branding.invoiceFooterText ?? ''}
              rows={2}
              placeholder="Ej. Gracias por confiar en nosotros — síguenos en @tuestudio"
              className="input mt-1 w-full"
            />
          </label>

          <button type="submit" className="col-span-full w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Guardar
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-900">Plantillas de mensajes de WhatsApp</h2>
        <p className="mt-1 text-sm text-slate-500">
          Deja un mensaje en blanco para usar el texto por defecto. Variables disponibles:{' '}
          <code className="text-xs">{'{nombre_cliente}'}</code> <code className="text-xs">{'{nombre_perro}'}</code>{' '}
          <code className="text-xs">{'{fecha_cita}'}</code> <code className="text-xs">{'{link_pago}'}</code> (no todas
          aplican a todas las plantillas).
        </p>
        <div className="mt-3 space-y-4">
          {WHATSAPP_TEMPLATES.map((template) => (
            <form
              key={template.name}
              action={updateWhatsappTemplateOverrideAction.bind(null, template.name)}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <label className="text-sm font-medium text-slate-700">
                {template.label}
                <textarea
                  name="template"
                  defaultValue={branding.whatsappTemplates[template.name] ?? ''}
                  rows={2}
                  placeholder="Texto por defecto del sistema"
                  className="input mt-1 w-full"
                />
              </label>
              <button type="submit" className="mt-2 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white">
                Guardar plantilla
              </button>
            </form>
          ))}
        </div>
      </section>
    </div>
  )
}
