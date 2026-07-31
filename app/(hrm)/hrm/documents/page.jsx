'use client'

import { useState, useEffect } from 'react'
import { getEmployeeSubmissionsForHR, approveKycSubmission, rejectKycSubmission, getDocumentSignedUrl } from '@/app/actions/employee-docs'
import { Loader2, Eye, Check, X, User, FileText, ChevronRight, Filter } from 'lucide-react'

export default function HRDocumentsVerificationPage() {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [statusFilter, setStatusFilter] = useState('pending') // all, pending, approved, rejected
  
  const loadData = async () => {
    const res = await getEmployeeSubmissionsForHR()
    if (res.success) {
      setSubmissions(res.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filter submissions
  const filteredSubmissions = submissions.filter(s => {
    if (statusFilter === 'all') return true
    return s.status === statusFilter
  })

  // Group by user
  const groupedDocs = filteredSubmissions.reduce((acc, sub) => {
    if (!acc[sub.user_id]) {
      acc[sub.user_id] = {
        user_id: sub.user_id,
        user: sub.user_profiles,
        submissions: [],
        pendingCount: 0
      }
    }
    acc[sub.user_id].submissions.push(sub)
    if (sub.status === 'pending') acc[sub.user_id].pendingCount++
    return acc
  }, {})

  const users = Object.values(groupedDocs).sort((a, b) => b.pendingCount - a.pendingCount)

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6 shrink-0 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Document Verification (KYC)</h1>
          <p className="text-slate-500">Review and verify employee KYC and educational documents.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select 
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setSelectedUser(null)
            }}
            className="text-sm border-slate-300 rounded-md shadow-sm focus:ring-slate-500 focus:border-slate-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
        {/* Left column: List of employees */}
        <div className="w-full md:w-1/3 bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col h-[calc(100vh-160px)]">
          <div className="px-4 py-3 border-b bg-slate-50 font-medium text-slate-700 shrink-0">
            Employees ({users.length})
          </div>
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No submissions found.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {users.map(u => (
                  <li key={u.user_id}>
                    <button 
                      onClick={() => setSelectedUser(u)}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between ${selectedUser?.user_id === u.user_id ? 'bg-indigo-50 hover:bg-indigo-50 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'}`}
                    >
                      <div className="flex items-center min-w-0">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 mr-3 shrink-0">
                          <User className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 pr-2">
                          <p className="font-medium text-slate-900 truncate">{u.user?.full_name || 'Unknown User'}</p>
                          <p className="text-xs text-slate-500 truncate">{u.user?.role || 'No Role'}</p>
                        </div>
                      </div>
                      <div className="flex items-center pl-2 shrink-0">
                        {u.pendingCount > 0 && (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold mr-2">
                            {u.pendingCount}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right column: Document Viewer Drawer equivalent */}
        <div className="w-full md:w-2/3 bg-white border border-slate-200 rounded-lg h-[calc(100vh-160px)] flex flex-col overflow-hidden shadow-sm">
          {selectedUser ? (
            <SubmissionViewer 
              userGroup={selectedUser} 
              onUpdate={() => {
                loadData()
              }} 
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <FileText className="w-16 h-16 mb-4 text-slate-200" />
              <p className="text-lg font-medium text-slate-600">Select an employee</p>
              <p className="text-sm mt-1">Choose an employee from the list to review their submissions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SubmissionViewer({ userGroup, onUpdate }) {
  const [activeSub, setActiveSub] = useState(userGroup.submissions[0])
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectPrompt, setShowRejectPrompt] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  // When selected user or submissions change, reset active document
  useEffect(() => {
    // try to retain active if still exists
    const stillExists = userGroup.submissions.find(s => s.id === activeSub?.id)
    if (stillExists) setActiveSub(stillExists)
    else setActiveSub(userGroup.submissions[0])
  }, [userGroup.submissions])

  const handleApprove = async () => {
    setActionLoading(true)
    setErrorMsg(null)
    const res = await approveKycSubmission(activeSub.id, activeSub.version)
    if (res.success) {
      onUpdate()
    } else {
      setErrorMsg(res.error)
    }
    setActionLoading(false)
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setErrorMsg('Please enter a rejection reason.')
      return
    }
    setActionLoading(true)
    setErrorMsg(null)
    const res = await rejectKycSubmission(activeSub.id, activeSub.version, rejectReason)
    if (res.success) {
      setShowRejectPrompt(false)
      setRejectReason('')
      onUpdate()
    } else {
      setErrorMsg(res.error)
    }
    setActionLoading(false)
  }

  if (!activeSub) return null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b bg-slate-50 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-bold text-slate-800">{userGroup.user?.full_name}</h2>
          <p className="text-sm text-slate-500">{userGroup.user?.phone || 'No phone'} • {userGroup.submissions.length} submissions</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Document Tabs */}
        <div className="w-1/3 border-r overflow-y-auto bg-white p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Submissions</h3>
          <div className="space-y-2">
            {userGroup.submissions.map(sub => (
              <button
                key={sub.id}
                onClick={() => {
                  setActiveSub(sub)
                  setShowRejectPrompt(false)
                  setErrorMsg(null)
                }}
                className={`w-full text-left px-3 py-3 rounded-md border transition-all ${activeSub.id === sub.id ? 'border-slate-800 ring-1 ring-slate-800 bg-slate-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-medium text-sm text-slate-800 capitalize truncate">{sub.kyc_document_requirements?.label}</span>
                  <div className="shrink-0 ml-2">
                    {sub.status === 'pending' && <span className="block w-2 h-2 rounded-full bg-yellow-400 mt-1.5"></span>}
                    {sub.status === 'approved' && <span className="block w-2 h-2 rounded-full bg-green-500 mt-1.5"></span>}
                    {sub.status === 'rejected' && <span className="block w-2 h-2 rounded-full bg-red-500 mt-1.5"></span>}
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold mr-2 ${
                    sub.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    sub.status === 'approved' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {sub.status}
                  </span>
                  {new Date(sub.updated_at).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Viewer Area */}
        <div className="w-2/3 flex flex-col bg-slate-100 relative overflow-hidden">
          {/* Header Actions */}
          <div className="bg-white px-4 py-3 border-b flex justify-between items-center shrink-0 shadow-sm z-10">
            <div className="min-w-0 pr-4">
              <p className="text-sm font-semibold text-slate-800 capitalize truncate">{activeSub.kyc_document_requirements?.label}</p>
              {activeSub.document_number && (
                <p className="text-xs text-slate-500 truncate font-mono bg-slate-100 px-1 py-0.5 rounded inline-block mt-1">Num: {activeSub.document_number}</p>
              )}
            </div>
            
            <div className="shrink-0 flex items-center">
              {activeSub.status === 'pending' && !showRejectPrompt && (
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setShowRejectPrompt(true)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 border border-red-200 text-red-600 rounded text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    Reject
                  </button>
                  <button 
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors flex items-center"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1"/> : <Check className="w-4 h-4 mr-1"/>}
                    Approve
                  </button>
                </div>
              )}
              
              {activeSub.status === 'approved' && (
                <div className="flex items-center text-green-600 text-sm font-medium">
                  <Check className="w-5 h-5 mr-1" /> Approved
                </div>
              )}
              
              {activeSub.status === 'rejected' && (
                <div className="flex items-center text-red-600 text-sm font-medium">
                  <X className="w-5 h-5 mr-1" /> Rejected
                </div>
              )}
            </div>
          </div>

          {errorMsg && (
             <div className="bg-red-50 border-b border-red-200 p-3 text-red-700 text-sm flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                {errorMsg}
             </div>
          )}

          {/* Reject Prompt */}
          {showRejectPrompt && (
            <div className="absolute top-14 left-0 right-0 bg-white border-b p-4 shadow-md z-20 animate-in slide-in-from-top-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Rejection</label>
              <textarea 
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Image is blurry, name does not match..."
                className="w-full border border-slate-300 rounded-md shadow-sm text-sm p-2 mb-3 focus:ring-red-500 focus:border-red-500 outline-none"
                rows={2}
              />
              <div className="flex justify-end space-x-2">
                <button 
                  onClick={() => setShowRejectPrompt(false)}
                  className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 flex items-center"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1"/> : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          )}

          {/* Document Files Display (Supports Multi-File) */}
          <div className="flex-1 overflow-auto p-4 space-y-4">
             {activeSub.kyc_submission_files?.map(file => (
               <FileViewer key={file.id} file={file} />
             ))}
             {(!activeSub.kyc_submission_files || activeSub.kyc_submission_files.length === 0) && (
                <div className="text-slate-500 flex flex-col items-center justify-center h-full">
                  <FileText className="w-12 h-12 mb-2 text-slate-300" />
                  <p>No files attached to this submission</p>
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FileViewer({ file }) {
  const [signedUrl, setSignedUrl] = useState(null)
  const [loadingUrl, setLoadingUrl] = useState(true)

  useEffect(() => {
    let isMounted = true;
    async function loadUrl() {
      setLoadingUrl(true)
      const res = await getDocumentSignedUrl(file.file_path)
      if (res.success && isMounted) {
        setSignedUrl(res.signedUrl)
      }
      if (isMounted) setLoadingUrl(false)
    }
    loadUrl()
    return () => { isMounted = false }
  }, [file.file_path])

  return (
    <div className="bg-white border rounded-lg overflow-hidden shadow-sm flex flex-col">
       <div className="px-3 py-2 bg-slate-50 border-b text-xs font-medium text-slate-600 flex justify-between">
         <span>{file.original_name}</span>
         <span className="text-slate-400">{(file.size_bytes / 1024 / 1024).toFixed(2)} MB</span>
       </div>
       <div className="flex justify-center items-center p-2" style={{ minHeight: '300px' }}>
          {loadingUrl ? (
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          ) : signedUrl ? (
            file.file_path.toLowerCase().endsWith('.pdf') ? (
              <iframe src={signedUrl} className="w-full rounded border bg-white h-[500px]" />
            ) : (
              <img src={signedUrl} alt="Document" className="max-w-full rounded bg-white object-contain max-h-[600px]" />
            )
          ) : (
            <div className="text-slate-500 flex flex-col items-center">
              <Eye className="w-8 h-8 mb-2 text-slate-300" />
              <p className="text-sm">Unable to load document preview</p>
            </div>
          )}
       </div>
    </div>
  )
}
