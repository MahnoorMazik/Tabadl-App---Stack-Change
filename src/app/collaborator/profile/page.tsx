'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Building2, Mail, User } from 'lucide-react'

type ClientInfo = {
  id: string
  name: string
  company: string | null
}

export default function CollaboratorProfilePage() {
  const { data: session } = useSession()
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchClientInfo = async () => {
      try {
        const res = await fetch('/api/collaborator/client-info')
        if (res.ok) {
          const data = await res.json()
          setClientInfo(data.data.client)
        }
      } catch (error) {
        console.error('Failed to fetch client info:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session?.user) {
      fetchClientInfo()
    }
  }, [session])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">My Profile</CardTitle>
          <CardDescription>View your collaborator profile information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User Info */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xl">
                {session?.user?.name ? getInitials(session.user.name) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{session?.user?.name}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {session?.user?.email}
              </p>
            </div>
          </div>

          {/* ✅ Client Information - Shows the client name */}
          {!loading && clientInfo && (
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-5 w-5 text-emerald-600" />
                <p className="font-medium text-emerald-800">Working For:</p>
              </div>
              <p className="text-lg font-semibold text-emerald-900 ml-7">
                {clientInfo.company || clientInfo.name}
              </p>
              <p className="text-sm text-emerald-700 ml-7">
                You are collaborating as a partner for this client
              </p>
            </div>
          )}

          {!loading && !clientInfo && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-yellow-800">
                No client assigned yet. Please accept an invitation to collaborate.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}