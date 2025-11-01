import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { apiFetch } from '@/lib/api'
import { useNDAList, useCreateNDA } from '@/hooks/use-nda'
import type { NDA } from '@/types/nda'
import { Folder, FileText, FileSearch, CheckCircle2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

type DocumentReference = {
  id: number
  person_id: number
  title: string
  document_type: string
  description?: string | null
  issued_date?: string | null
  location?: string | null
  status: string
}

export function SecurityFolderCard({ personId }: { personId: number }) {
  const { data: ndas, isLoading: ndasLoading } = useNDAList({ person_id: personId })
  const [documents, setDocuments] = useState<DocumentReference[] | null>(null)
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const createNDA = useCreateNDA()

  useEffect(() => {
    const load = async () => {
      setDocumentsLoading(true)
      try {
        const params = new URLSearchParams({ person_id: String(personId) })
        const res = await apiFetch<{ data: DocumentReference[] }>(`/document-references?${params.toString()}`)
        setDocuments(res.data || [])
      } catch {
        setDocuments([])
      } finally {
        setDocumentsLoading(false)
      }
    }
    load()
  }, [personId])

  const formatDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : undefined)

  const pendingNDAs = (ndas || []).filter((n: NDA) => n.status === 'PENDING' || n.status === 'ACTIVE')
  const signedNDAs = (ndas || []).filter((n: NDA) => n.status === 'SIGNED')

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-primary" />
            <CardTitle>Security Folder</CardTitle>
          </div>
          <Button
            size="sm"
            onClick={async () => {
              try {
                const today = new Date().toISOString().slice(0, 10)
                await createNDA.mutateAsync({
                  person_id: personId,
                  title: `NDA ${today}`,
                  content: 'Please review and sign this Non-Disclosure Agreement.',
                  version: '1.0',
                })
              } catch (e) {
                // no-op
              }
            }}
            disabled={createNDA.isPending}
          >
            <Plus className="h-3 w-3 mr-1" />
            {createNDA.isPending ? 'Sending…' : 'Send NDA'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {(ndasLoading || documentsLoading) ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingNDAs.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Pending Documents</h3>
                <div className="space-y-2">
                  {pendingNDAs.map((nda: NDA) => (
                    <div key={nda.id} className="flex items-center justify-between p-3 rounded-md border bg-card">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{nda.title}</span>
                        <span className="text-xs text-muted-foreground">v{nda.version}</span>
                        {nda.sent_at && (
                          <span className="text-xs text-muted-foreground">• Sent {formatDate(nda.sent_at)}</span>
                        )}
                      </div>
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800">{nda.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {signedNDAs.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Signed Documents</h3>
                <div className="space-y-2">
                  {signedNDAs.map((nda: NDA) => (
                    <div key={nda.id} className="flex items-center justify-between p-3 rounded-md border bg-card">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">{nda.title}</span>
                        <span className="text-xs text-muted-foreground">v{nda.version}</span>
                        {nda.sent_at && (
                          <span className="text-xs text-muted-foreground">• Sent {formatDate(nda.sent_at)}</span>
                        )}
                      </div>
                      <Badge className="bg-green-100 text-green-800">{nda.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {documents && documents.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Physical Documents</h3>
                <div className="space-y-2">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-md border bg-card">
                      <div className="flex items-center gap-2">
                        <FileSearch className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">{doc.title}</span>
                        <span className="text-xs text-muted-foreground capitalize">{doc.document_type.replace('_', ' ')}</span>
                        {formatDate(doc.issued_date) && (
                          <span className="text-xs text-muted-foreground">• {formatDate(doc.issued_date)}</span>
                        )}
                      </div>
                      <Badge variant="outline">{doc.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pendingNDAs.length === 0 && signedNDAs.length === 0 && (!documents || documents.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No security documents</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}


