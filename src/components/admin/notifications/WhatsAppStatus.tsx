'use client';

import { CheckCircle2, AlertCircle, Loader2, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WhatsAppStatusProps {
  status: 'idle' | 'sending' | 'sent' | 'failed';
  error?: string;
  recipient?: string;
  className?: string;
}

export function WhatsAppStatus({ 
  status, 
  error, 
  recipient,
  className 
}: WhatsAppStatusProps) {
  return (
    <div className={cn("flex items-center gap-3 text-sm", className)}>
      <MessageCircle className="h-4 w-4 text-green-600" />
      
      {status === 'idle' && (
        <span className="text-gray-500">Ready to send WhatsApp</span>
      )}
      
      {status === 'sending' && (
        <span className="flex items-center gap-2 text-blue-600">
          <Loader2 className="h-3 w-3 animate-spin" />
          Sending WhatsApp...
        </span>
      )}
      
      {status === 'sent' && (
        <span className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-3 w-3" />
          WhatsApp sent {recipient && `to ${recipient}`}
        </span>
      )}
      
      {status === 'failed' && (
        <span className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-3 w-3" />
          WhatsApp failed: {error || 'Unknown error'}
        </span>
      )}
    </div>
  );
}