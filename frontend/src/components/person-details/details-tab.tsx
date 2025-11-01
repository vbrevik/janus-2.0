import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUpdatePerson } from '@/hooks/use-person'
import { Edit2, Check, X } from 'lucide-react'

interface DetailsTabProps {
  personnel: any
}

export function DetailsTab({ personnel }: DetailsTabProps) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    first_name: personnel.first_name,
    last_name: personnel.last_name,
    email: personnel.email,
    phone: personnel.phone || '',
    department: personnel.department || '',
    position: personnel.position || '',
  })
  const updateMutation = useUpdatePerson(personnel.id) // Changed from useUpdatePersonnel

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone || undefined,
        department: form.department,
        position: form.position,
      })
      setEditing(false)
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to update')
    }
  }

  const handleCancel = () => {
    setForm({
      first_name: personnel.first_name,
      last_name: personnel.last_name,
      email: personnel.email,
      phone: personnel.phone || '',
      department: personnel.department || '',
      position: personnel.position || '',
    })
    setEditing(false)
  }

  return (
    <Card className={editing ? 'border-primary' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Personal Information</CardTitle>
          {!editing ? (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="h-6 w-6 p-0">
              <Edit2 className="h-3 w-3" />
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={handleSave} disabled={updateMutation.isPending} className="h-6 w-6 p-0">
                <Check className="h-3 w-3 text-green-600" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancel} className="h-6 w-6 p-0">
                <X className="h-3 w-3 text-red-600" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">First Name</Label>
            {editing ? (
              <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="h-7 text-xs" />
            ) : (
              <p className="text-xs font-medium mt-1">{personnel.first_name}</p>
            )}
          </div>
          <div>
            <Label className="text-xs">Last Name</Label>
            {editing ? (
              <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="h-7 text-xs" />
            ) : (
              <p className="text-xs font-medium mt-1">{personnel.last_name}</p>
            )}
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            {editing ? (
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-7 text-xs" />
            ) : (
              <p className="text-xs font-medium mt-1">{personnel.email}</p>
            )}
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            {editing ? (
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-7 text-xs" />
            ) : (
              <p className="text-xs font-medium mt-1">{personnel.phone || 'N/A'}</p>
            )}
          </div>
          <div>
            <Label className="text-xs">Department</Label>
            {editing ? (
              <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="h-7 text-xs" />
            ) : (
              <p className="text-xs font-medium mt-1">{personnel.department || 'N/A'}</p>
            )}
          </div>
          <div>
            <Label className="text-xs">Position</Label>
            {editing ? (
              <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="h-7 text-xs" />
            ) : (
              <p className="text-xs font-medium mt-1">{personnel.position || 'N/A'}</p>
            )}
          </div>
          <div>
            <Label className="text-xs">Clearance Level</Label>
            <Badge className="mt-1 text-[10px]">{personnel.clearance_level}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
