import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Layout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X } from 'lucide-react'
import { useGrantComputerAccess, useGrantDataAccess, useGrantPhysicalAccess } from '@/hooks/use-access'
import { usePersonnelList } from '@/hooks/use-personnel'
import { useInfoSystemsList } from '@/hooks/use-info-systems'
import { Computer, Database, Key } from 'lucide-react'
import type { CreateComputerAccessRequest, CreateDataAccessRequest, CreatePhysicalAccessRequest } from '@/types/access'
import type { InfoSystem } from '@/types/info-system'

export const Route = createFileRoute('/admin/access/')({
  component: AccessControl,
})

type AccessType = 'computer' | 'data' | 'physical'

function AccessControl() {
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<number>(0)
  const [openSection, setOpenSection] = useState<AccessType | null>(null)
  const { data: personnelPage } = usePersonnelList(1, 100)
  
  const grantComputerAccess = useGrantComputerAccess()
  const grantDataAccess = useGrantDataAccess()
  const grantPhysicalAccess = useGrantPhysicalAccess()

  const handleSubmit = async (type: AccessType, formData: CreateComputerAccessRequest | CreateDataAccessRequest | CreatePhysicalAccessRequest) => {
    try {
      if (type === 'computer') {
        await grantComputerAccess.mutateAsync(formData as CreateComputerAccessRequest)
      } else if (type === 'data') {
        await grantDataAccess.mutateAsync(formData as CreateDataAccessRequest)
      } else if (type === 'physical') {
        await grantPhysicalAccess.mutateAsync(formData as CreatePhysicalAccessRequest)
      }
      setOpenSection(null)
      // TODO: Show success message
    } catch (error) {
      console.error('Failed to grant access:', error)
      // TODO: Show error message
    }
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <Layout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Access Control</h1>
          
          {/* Personnel Selector - Moved to top */}
          <Card>
            <CardHeader>
              <CardTitle>Select Personnel</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="personnel">Personnel</Label>
              <Select value={selectedPersonnelId > 0 ? String(selectedPersonnelId) : ''} onValueChange={(v) => setSelectedPersonnelId(parseInt(v))}>
                <SelectTrigger id="personnel">
                  <SelectValue placeholder="Choose personnel" />
                </SelectTrigger>
                <SelectContent>
                  {personnelPage?.items.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.first_name} {p.last_name} (#{p.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          
          <div className="grid gap-4 md:grid-cols-3">
            {/* Grant Computer Access */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Computer className="h-5 w-5" />
                  <CardTitle>Information Systems</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Grant information systems access (READ, WRITE, ADMIN)
                </p>
                {openSection === 'computer' ? (
                  <div className="space-y-4">
                    <ComputerAccessForm 
                      personnelId={selectedPersonnelId}
                      onSubmit={(data) => handleSubmit('computer', data)}
                      isLoading={grantComputerAccess.isPending}
                    />
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setOpenSection(null)}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button className="w-full" onClick={() => setOpenSection('computer')}>Grant Information Systems Access</Button>
                )}
              </CardContent>
            </Card>

            {/* Grant Data Access */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  <CardTitle>Data Access</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Grant classification-based access (UNCLASSIFIED to TOP_SECRET)
                </p>
                {openSection === 'data' ? (
                  <div className="space-y-4">
                    <DataAccessForm 
                      personnelId={selectedPersonnelId}
                      onSubmit={(data) => handleSubmit('data', data)}
                      isLoading={grantDataAccess.isPending}
                    />
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setOpenSection(null)}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button className="w-full" onClick={() => setOpenSection('data')}>Grant Data Access</Button>
                )}
              </CardContent>
            </Card>

            {/* Grant Physical Access */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  <CardTitle>Physical Access</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Grant zone-based physical access (VISITOR to FULL)
                </p>
                {openSection === 'physical' ? (
                  <div className="space-y-4">
                    <PhysicalAccessForm 
                      personnelId={selectedPersonnelId}
                      onSubmit={(data) => handleSubmit('physical', data)}
                      isLoading={grantPhysicalAccess.isPending}
                    />
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setOpenSection(null)}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button className="w-full" onClick={() => setOpenSection('physical')}>Grant Physical Access</Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}

// Computer Access Form Component
function ComputerAccessForm({ personnelId, onSubmit, isLoading }: { 
  personnelId: number
  onSubmit: (data: CreateComputerAccessRequest) => void
  isLoading: boolean 
}) {
  const { data: systemsPage } = useInfoSystemsList(1, 100)
  const [systemName, setSystemName] = useState('')
  const [accessLevel, setAccessLevel] = useState<'READ' | 'WRITE' | 'ADMIN'>('READ')
  const [expiresAt, setExpiresAt] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      personnel_id: personnelId,
      system_name: systemName,
      access_level: accessLevel,
      expires_at: expiresAt || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="system_name">Information System</Label>
        <Select value={systemName} onValueChange={setSystemName} required>
          <SelectTrigger id="system_name">
            <SelectValue placeholder="Choose system" />
          </SelectTrigger>
          <SelectContent>
            {systemsPage?.items.map((system: InfoSystem) => (
              <SelectItem key={system.id} value={system.system_name}>
                {system.system_name} ({system.environment})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="access_level">Access Level</Label>
        <Select value={accessLevel} onValueChange={(value) => setAccessLevel(value as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="READ">READ</SelectItem>
            <SelectItem value="WRITE">WRITE</SelectItem>
            <SelectItem value="ADMIN">ADMIN</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expires_at">Expires At (optional)</Label>
        <Input
          id="expires_at"
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Granting...' : 'Grant Access'}
      </Button>
    </form>
  )
}

// Data Access Form Component
function DataAccessForm({ personnelId, onSubmit, isLoading }: { 
  personnelId: number
  onSubmit: (data: CreateDataAccessRequest) => void
  isLoading: boolean 
}) {
  const [classification, setClassification] = useState<'UNCLASSIFIED' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET'>('UNCLASSIFIED')
  const [accessLevel, setAccessLevel] = useState<'READ' | 'WRITE' | 'DELETE'>('READ')
  const [expiresAt, setExpiresAt] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      personnel_id: personnelId,
      data_classification: classification,
      access_level: accessLevel,
      expires_at: expiresAt || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="classification">Data Classification</Label>
        <Select value={classification} onValueChange={(value) => setClassification(value as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UNCLASSIFIED">UNCLASSIFIED</SelectItem>
            <SelectItem value="CONFIDENTIAL">CONFIDENTIAL</SelectItem>
            <SelectItem value="SECRET">SECRET</SelectItem>
            <SelectItem value="TOP_SECRET">TOP_SECRET</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="access_level">Access Level</Label>
        <Select value={accessLevel} onValueChange={(value) => setAccessLevel(value as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="READ">READ</SelectItem>
            <SelectItem value="WRITE">WRITE</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expires_at">Expires At (optional)</Label>
        <Input
          id="expires_at"
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Granting...' : 'Grant Access'}
      </Button>
    </form>
  )
}

// Physical Access Form Component
function PhysicalAccessForm({ personnelId, onSubmit, isLoading }: { 
  personnelId: number
  onSubmit: (data: CreatePhysicalAccessRequest) => void
  isLoading: boolean 
}) {
  const [zoneName, setZoneName] = useState('')
  const [accessLevel, setAccessLevel] = useState<'VISITOR' | 'STANDARD' | 'RESTRICTED' | 'FULL'>('VISITOR')
  const [validUntil, setValidUntil] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      personnel_id: personnelId,
      zone_name: zoneName,
      access_level: accessLevel,
      valid_until: validUntil || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="zone_name">Zone Name</Label>
        <Input
          id="zone_name"
          required
          value={zoneName}
          onChange={(e) => setZoneName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="access_level">Access Level</Label>
        <Select value={accessLevel} onValueChange={(value) => setAccessLevel(value as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="VISITOR">VISITOR</SelectItem>
            <SelectItem value="STANDARD">STANDARD</SelectItem>
            <SelectItem value="RESTRICTED">RESTRICTED</SelectItem>
            <SelectItem value="FULL">FULL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="valid_until">Valid Until (optional)</Label>
        <Input
          id="valid_until"
          type="datetime-local"
          value={validUntil}
          onChange={(e) => setValidUntil(e.target.value)}
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Granting...' : 'Grant Access'}
      </Button>
    </form>
  )
}
