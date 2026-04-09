import { useState } from 'react'

function IconUpload() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function UploadModal({ 
  isOpen, 
  onClose, 
  onUpload,
  title = "Upload File",
  description = "Upload a file to continue. Supported formats: PDF, TXT",
  accept = ".pdf,.txt",
  maxSizeMB = 10
}) {
  const [uploadFile, setUploadFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)

  if (!isOpen) return null

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size
      const fileSizeMB = file.size / (1024 * 1024)
      if (fileSizeMB > maxSizeMB) {
        alert(`File size exceeds ${maxSizeMB}MB limit. Please choose a smaller file.`)
        e.target.value = ''
        return
      }
      setUploadFile(file)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile) return

    setIsUploading(true)
    try {
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (onUpload) {
        await onUpload(uploadFile)
      }
      
      // Reset and close
      setUploadFile(null)
      onClose()
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setUploadFile(null)
    onClose()
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  return (
    <>
      <div className="upload-modal-backdrop" onClick={handleClose} role="presentation" />
      <div className="upload-modal">
        <div className="upload-modal-header">
          <h3 className="upload-modal-title">{title}</h3>
          <button 
            type="button" 
            className="upload-modal-close" 
            onClick={handleClose} 
            aria-label="Close"
            disabled={isUploading}
          >
            ×
          </button>
        </div>
        <div className="upload-modal-body">
          <div className="upload-modal-content">
            <div className="upload-modal-icon">
              <IconUpload />
            </div>
            <p className="upload-modal-description">
              {description}
            </p>
            <div className="upload-modal-area">
              <input
                type="file"
                id="upload-modal-input"
                accept={accept}
                className="upload-modal-file-input"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
              <label htmlFor="upload-modal-input" className="upload-modal-label">
                {uploadFile ? (
                  <span className="upload-modal-file-name">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                      <polyline points="13 2 13 9 20 9" />
                    </svg>
                    {uploadFile.name}
                  </span>
                ) : (
                  <>
                    <IconUpload />
                    <span>Choose file or drag and drop</span>
                  </>
                )}
              </label>
            </div>
            {uploadFile && (
              <div className="upload-modal-file-info">
                <span>File: {uploadFile.name}</span>
                <span>Size: {formatFileSize(uploadFile.size)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="upload-modal-footer">
          <button
            type="button"
            className="btn-upload btn-upload--secondary"
            onClick={handleClose}
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-upload btn-upload--primary"
            onClick={handleUpload}
            disabled={!uploadFile || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </>
  )
}

export default UploadModal
