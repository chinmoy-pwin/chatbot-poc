import { useState, useEffect, useCallback } from "react";
import api from '@/lib/api';
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Trash2, Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function KnowledgeBase() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [customerId, setCustomerId] = useState(null);

  useEffect(() => {
    const savedCustomerId = localStorage.getItem('selectedCustomerId');
    if (savedCustomerId) {
      setCustomerId(savedCustomerId);
      loadFiles(savedCustomerId);
    }
  }, []);

  // Auto-refresh to check status updates
  useEffect(() => {
    if (!customerId) return;
    
    const interval = setInterval(() => {
      // Only refresh if there are pending/processing files
      if (files.some(f => f.status === 'pending' || f.status === 'processing')) {
        loadFiles(customerId);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [customerId, files]);

  const loadFiles = async (customerId) => {
    try {
      const response = await api.get(`/knowledge/${customerId}`);
      setFiles(response.data);
    } catch (error) {
      console.error("Failed to load knowledge files", error);
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    if (!customerId) {
      toast.error("Please select a customer first from the Dashboard");
      return;
    }

    setUploading(true);

    for (const file of acceptedFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('customer_id', customerId);

        const response = await api.post('/knowledge/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        
        toast.success(response.data.message || `${file.name} uploaded! Processing in background...`);
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
        console.error(error);
      }
    }

    setUploading(false);
    loadFiles(customerId);
  }, [customerId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'application/json': ['.json'],
      'text/csv': ['.csv'],
      'text/markdown': ['.md']
    },
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const deleteFile = async (fileId) => {
    try {
      await api.delete(`/knowledge/${fileId}`);
      toast.success("File deleted successfully");
      loadFiles(customerId);
    } catch (error) {
      toast.error("Failed to delete file");
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      processing: 'bg-blue-100 text-blue-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };
    const text = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status] || 'bg-gray-100 text-gray-800'}`}>
        {text}
      </span>
    );
  };

  const hasProcessingFiles = files.some(f => f.status === 'pending' || f.status === 'processing');

  return (
    <div className="p-6 md:p-12 space-y-8" data-testid="knowledge-base-page">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2" data-testid="kb-title">Knowledge Base</h1>
        <p className="text-muted-foreground">
          Upload documents to train your chatbot. Files process in the background.
        </p>
      </div>

      {/* Upload Area */}
      <Card data-testid="upload-card">
        <CardHeader>
          <CardTitle>Upload Files</CardTitle>
          <CardDescription>
            Supported formats: PDF, DOCX, TXT, JSON, CSV, MD (max 10MB)
            {hasProcessingFiles && ' • Auto-refreshing every 5s'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            data-testid="dropzone"
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${
              isDragActive
                ? 'border-primary bg-primary/5 scale-[1.02]'
                : 'border-border hover:border-primary hover:bg-secondary/50'
            }`}
          >
            <input {...getInputProps()} data-testid="file-input" />
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="text-muted-foreground">Uploading files...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="h-12 w-12 text-primary" />
                <div>
                  <p className="text-lg font-medium">
                    {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Files List */}
      <Card data-testid="files-list-card">
        <CardHeader>
          <CardTitle>Uploaded Files</CardTitle>
          <CardDescription>
            {files.length} file{files.length !== 1 ? 's' : ''} in knowledge base
          </CardDescription>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="no-files-message">
              No files uploaded yet
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  data-testid={`file-${file.id}`}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors duration-200"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(file.status)}
                    <div className="flex-1">
                      <p className="font-medium">{file.filename}</p>
                      <p className="text-sm text-muted-foreground">
                        {file.file_type?.toUpperCase()} • Uploaded {new Date(file.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(file.status)}
                    {file.status === 'completed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteFile(file.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
