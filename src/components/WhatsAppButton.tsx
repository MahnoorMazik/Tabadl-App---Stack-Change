'use client'

import { Button } from '@/components/ui/button'
import { useLocale } from '@/contexts/LocaleContext'

// WhatsApp Icon SVG Component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
)

interface WhatsAppButtonProps {
  phoneNumber?: string
  message?: string
  className?: string
  variant?: 'floating' | 'inline'
}

export function WhatsAppButton({ 
  phoneNumber = '+923189108310', // Default phone number
  message = 'Hello, I would like to get more information about your services.',
  className = '',
  variant = 'floating'
}: WhatsAppButtonProps) {
  const { t } = useLocale()
  
  // Format phone number for WhatsApp (remove spaces, dashes, and +)
  const formattedPhone = phoneNumber.replace(/[\s\-+]/g, '')
  
  // Create URLs for both desktop app and web version
  const whatsappDesktopUrl = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`
  const whatsappWebUrl = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    
    // Try to open desktop app first, then fall back to web if needed
    let appOpened = false
    let fallbackTimeout: NodeJS.Timeout | null = null
    
    // Listen for window blur event - when desktop app opens, window loses focus
    const handleBlur = () => {
      appOpened = true
      if (fallbackTimeout) {
        clearTimeout(fallbackTimeout)
      }
      window.removeEventListener('blur', handleBlur)
    }
    
    window.addEventListener('blur', handleBlur)
    
    // Try to open desktop app using protocol handler
    try {
      // Create a temporary link element and click it
      // This is the most reliable way to trigger protocol handlers
      const link = document.createElement('a')
      link.href = whatsappDesktopUrl
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      
      // Remove the link immediately
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link)
        }
      }, 100)
      
      // Set a timeout to fall back to web if app doesn't open
      // If the app opens, the blur event will fire and cancel this timeout
      fallbackTimeout = setTimeout(() => {
        if (!appOpened) {
          // Desktop app didn't open, use web version
          window.open(whatsappWebUrl, '_blank', 'noopener,noreferrer')
        }
        window.removeEventListener('blur', handleBlur)
      }, 1000) // Wait 1 second to see if app opens
      
    } catch (error) {
      // If protocol handler fails immediately, use web version
      if (fallbackTimeout) {
        clearTimeout(fallbackTimeout)
      }
      window.removeEventListener('blur', handleBlur)
      window.open(whatsappWebUrl, '_blank', 'noopener,noreferrer')
    }
  }
  
  if (variant === 'floating') {
    return (
      <a
        href={whatsappWebUrl}
        onClick={handleClick}
        target="_blank"
        rel="noopener noreferrer"
        className={`fixed bottom-20 right-4 md:bottom-[88px] md:right-6 z-[200] flex items-center justify-center shrink-0 pointer-events-auto ${className}`}
        aria-label={t('common.contactWhatsApp') || 'Contact via WhatsApp'}
      >
        <Button
          size="lg"
          className="h-14 w-14 rounded-full p-0 gap-0 bg-[#25D366] hover:bg-[#20BA5A] text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center ring-2 ring-white/20 dark:ring-black/20 [&_svg]:size-10"
        >
          <WhatsAppIcon className="h-10 w-10 shrink-0" />
        </Button>
      </a>
    )
  }
  
  // Inline variant
  return (
    <a
      href={whatsappWebUrl}
      onClick={handleClick}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      <Button
        className="bg-[#25D366] hover:bg-[#20BA5A] text-white"
      >
        <WhatsAppIcon className="h-6 w-6 mr-2" />
        {t('common.contactWhatsApp') || 'Contact via WhatsApp'}
      </Button>
    </a>
  )
}
