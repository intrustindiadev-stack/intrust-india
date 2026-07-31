'use client'

import { useState, useEffect } from 'react'
import { getDocumentRequirements, getEmployeeSubmissions, generateUploadUrl, createDraftSubmission, registerUploadedFile, finalizeKycSubmission, retryKycSubmission } from '@/app/actions/employee-docs'
import { Loader2, CheckCircle, AlertCircle, UploadCloud, FileText, Trash2, RotateCcw } from 'lucide-react'

export default function EmployeeDocumentsPage() {
  const [requirements, setRequirements] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    const [reqsRes, subsRes] = await Promise.all([
      getDocumentRequirements(),
      getEmployeeSubmissions()
    ])
    
    if (reqsRes.success) setRequirements(reqsRes.data)
    if (subsRes.success) setSubmissions(subsRes.data)
    
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const getSubmission = (reqId) => {
    return submissions.find(s => s.requirement_id === reqId)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">My Documents (KYC)</h1>
        <p className="text-slate-500 mt-2">Upload your required verification documents below. Only PDF, JPEG, or PNG formats are accepted (max 5MB).</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin text-slate-400 w-8 h-8" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {requirements.map(req => (
            <DocumentRequirementCard 
              key={req.id} 
              requirement={req} 
              submission={getSubmission(req.id)}
              onRefresh={loadData}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DocumentRequirementCard({ requirement, submission, onRefresh }) {
  const [documentNumber, setDocumentNumber] = useState(submission?.document_number || '')
  const [localFiles, setLocalFiles] = useState([]) // currently selected files not yet uploaded
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const status = submission?.status || 'not_uploaded'
  const isAadhaarOrPan = requirement.doc_type === 'aadhaar' || requirement.doc_type === 'pan'

  const uploadedFilesCount = submission?.kyc_submission_files?.length || 0
  const maxFiles = requirement.max_files

  const StatusBadge = () => {
    if (status === 'approved') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1"/> Approved</span>
    if (status === 'pending') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending Verification</span>
    if (status === 'rejected') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1"/> Rejected</span>
    if (status === 'draft') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Draft (Incomplete)</span>
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">Not Uploaded</span>
  }

  const handleFileChange = (e) => {
    setError(null)
    const selected = Array.from(e.target.files)
    
    // Check constraints
    const totalFilesAfterAdd = uploadedFilesCount + localFiles.length + selected.length
    if (totalFilesAfterAdd > maxFiles) {
      setError(`Maximum ${maxFiles} file(s) allowed.`)
      return
    }

    const invalidFiles = selected.filter(f => f.size > requirement.max_file_size_bytes)
    if (invalidFiles.length > 0) {
      setError(`Files must be under ${Math.round(requirement.max_file_size_bytes / 1024 / 1024)}MB.`)
      return
    }

    setLocalFiles(prev => [...prev, ...selected])
  }

  const removeLocalFile = (index) => {
    setLocalFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUploadAndSubmit = async () => {
    if (localFiles.length === 0 && uploadedFilesCount === 0) {
      setError('Please select at least one file.')
      return
    }
    
    setUploading(true)
    setError(null)

    try {
      // 1. Create or get Draft Submission
      let subId = submission?.id
      if (!subId || status === 'rejected') {
        const res = await createDraftSubmission(requirement.id)
        if (!res.success) throw new Error(res.error)
        subId = res.submissionId
      }

      // 2. Upload local files using signed URLs
      for (const file of localFiles) {
        const urlRes = await generateUploadUrl(requirement.doc_type, subId, file.name)
        if (!urlRes.success) throw new Error(urlRes.error)
        
        // Upload via signed URL
        const uploadResponse = await fetch(urlRes.url, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
            'Authorization': `Bearer ${urlRes.token}`
          }
        })
        
        if (!uploadResponse.ok) throw new Error('Failed to upload file to storage.')

        // Register in DB
        const regRes = await registerUploadedFile(subId, urlRes.path, file.name, file.type, file.size)
        if (!regRes.success) throw new Error(regRes.error)
      }

      // 3. Finalize if we hit requirement or user is done
      const finalizeRes = await finalizeKycSubmission(subId, documentNumber)
      if (!finalizeRes.success) throw new Error(finalizeRes.error)

      setLocalFiles([])
      onRefresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleRetry = async () => {
    setUploading(true)
    const res = await retryKycSubmission(submission.id)
    if (res.success) {
      onRefresh()
    } else {
      setError(res.error)
    }
    setUploading(false)
  }

  const isEditable = status === 'not_uploaded' || status === 'draft'

  // Masking logic for Sensitive Document Numbers
  const maskedDocNumber = () => {
    if (!submission?.document_number) return 'Not Provided'
    const len = submission.document_number.length
    if (len <= 4) return submission.document_number
    return 'X'.repeat(len - 4) + submission.document_number.slice(-4)
  }

  return (
    <div className={`border rounded-lg p-5 flex flex-col justify-between transition-colors ${status === 'approved' ? 'bg-green-50/50 border-green-200' : 'bg-white'}`}>
      <div>
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-slate-800">{requirement.label} {requirement.is_required && <span className="text-red-500">*</span>}</h3>
          <StatusBadge />
        </div>
        <p className="text-xs text-slate-500 mb-4">{requirement.description}</p>
        
        {/* Only show reject reason if currently rejected OR if we are re-drafting and want to remind them */}
        {status === 'rejected' && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-100 flex flex-col">
            <span><strong>Reason for rejection:</strong> {submission?.kyc_document_reviews?.[0]?.rejection_reason || 'See HR'}</span>
            <button 
              onClick={handleRetry}
              disabled={uploading}
              className="mt-2 text-xs font-medium text-red-800 bg-red-100 px-3 py-1.5 rounded w-max flex items-center hover:bg-red-200"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Upload Again
            </button>
          </div>
        )}
      </div>

      {isEditable ? (
        <div className="mt-2 space-y-4">
          {isAadhaarOrPan && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Document Number</label>
              <input 
                type="text" 
                value={documentNumber} 
                onChange={e => setDocumentNumber(e.target.value)}
                className="w-full border border-slate-200 px-3 py-2 rounded-md text-sm shadow-sm focus:border-slate-500 focus:ring-slate-500 outline-none"
                placeholder={`Enter ${requirement.label} Number`}
              />
            </div>
          )}
          
          <div className="space-y-2">
            {/* Display already uploaded files (from draft) */}
            {submission?.kyc_submission_files?.map(f => (
              <div key={f.id} className="flex items-center justify-between bg-slate-50 p-2 rounded border text-sm">
                <span className="truncate text-slate-600 font-medium mr-2"><FileText className="inline w-4 h-4 mr-1 text-slate-400"/> {f.original_name}</span>
                <span className="text-green-600 text-xs font-medium bg-green-100 px-2 py-0.5 rounded">Uploaded</span>
              </div>
            ))}

            {/* Display locally selected files */}
            {localFiles.map((f, i) => (
              <div key={i} className="flex items-center justify-between bg-blue-50 p-2 rounded border border-blue-100 text-sm">
                <span className="truncate text-blue-700 font-medium mr-2"><FileText className="inline w-4 h-4 mr-1"/> {f.name}</span>
                <button onClick={() => removeLocalFile(i)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            {(uploadedFilesCount + localFiles.length) < maxFiles && (
              <label className="flex-1 cursor-pointer w-full">
                <div className="flex items-center justify-center px-4 py-2 border-2 border-dashed border-slate-300 rounded-md hover:border-slate-400 transition-colors bg-slate-50">
                  <UploadCloud className="w-5 h-5 text-slate-400 mr-2" />
                  <span className="text-sm text-slate-600 font-medium">
                    Add File ({uploadedFilesCount + localFiles.length}/{maxFiles})
                  </span>
                </div>
                <input type="file" multiple className="hidden" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" />
              </label>
            )}
            
            <button 
              onClick={handleUploadAndSubmit}
              disabled={uploading || (localFiles.length === 0 && uploadedFilesCount === 0)}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center min-w-[120px] justify-center"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit for Review'}
            </button>
          </div>
          
          {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">{error}</p>}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {/* Read-only state for pending or approved */}
          {isAadhaarOrPan && (
            <div className="text-sm">
              <span className="text-slate-500">Document Number:</span> <span className="font-medium text-slate-800 font-mono">{maskedDocNumber()}</span>
            </div>
          )}

          <div className="space-y-1.5">
             {submission?.kyc_submission_files?.map(f => (
                <div key={f.id} className="flex items-center text-sm text-slate-600 bg-slate-50 p-2 rounded border">
                  <FileText className="w-4 h-4 mr-2 text-slate-400" />
                  <span className="truncate">{f.original_name}</span>
                </div>
             ))}
          </div>

          {status === 'pending' && (
            <div className="pt-2 border-t flex items-center text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
              Document submitted and is currently under review by HR.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
