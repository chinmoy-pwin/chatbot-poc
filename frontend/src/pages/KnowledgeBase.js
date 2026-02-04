import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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

  const loadFiles = async (customerId) => {
    try {
      const response = await axios.get(`${API}/knowledge/${customerId}`);
      setFiles(response.data);
    } catch (error) {
      toast.error("Failed to load knowledge files");
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

        await axios.post(`${API}/knowledge/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        
        toast.success(`${file.name} uploaded successfully`);
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
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
    }
  });

  const deleteFile = async (fileId) => {
    try {
      await axios.delete(`${API}/knowledge/${fileId}`);
      toast.success("File deleted successfully");
      loadFiles(customerId);
    } catch (error) {
      toast.error("Failed to delete file");
    }
  };

  return (
    <div className="p-6 md:p-12 space-y-8" data-testid="knowledge-base-page">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2" data-testid="kb-title">Knowledge Base</h1>
        <p className="text-muted-foreground">Upload documents to train your chatbot</p>
      </div>

      {/* Upload Area */}
      <Card data-testid="upload-card">
        <CardHeader>
          <CardTitle>Upload Files</CardTitle>
          <CardDescription>Supported formats: PDF, DOCX, TXT, JSON, CSV, MD</CardDescription>
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
          <CardDescription>{files.length} files in knowledge base</CardDescription>
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
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium" data-testid={`filename-${file.id}`}>{file.filename}</p>
                      <p className="text-sm text-muted-foreground">
                        {file.file_type.toUpperCase()} • Uploaded {new Date(file.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid={`delete-file-${file.id}`}
                    onClick={() => deleteFile(file.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}