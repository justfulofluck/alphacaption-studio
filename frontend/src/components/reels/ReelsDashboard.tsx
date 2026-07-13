import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { 
  Upload, 
  Search, 
  Play, 
  MoreVertical, 
  Trash2, 
  Video, 
  Clock, 
  Sparkles,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { API_BASE_URL } from '@/api/config';

interface Project {
  id: number;
  name: string;
  video_filename: string | null;
  video_url: string | null;
  duration: number;
  language: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function ReelsDashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 16;
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<'upload' | 'processing'>('upload');
  
  // User info state
  const [username, setUsername] = useState('bhavan badhe');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  // Settings modal states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [writingScript, setWritingScript] = useState<'native_language' | 'native_english' | 'english'>('native_language');
  const [translateToEnglish, setTranslateToEnglish] = useState(false);

  // Fetch current user and projects
  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('auth_token');
      try {
        const res = await axios.get(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data) {
          setUsername(res.data.name || 'User');
          setUserAvatar(res.data.avatar || null);
        }
      } catch (err) {
        console.error('Error fetching user info:', err);
      }
    };

    fetchUserData();
    fetchProjects();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, projects]);

  const fetchProjects = async () => {
    const token = localStorage.getItem('auth_token');
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter only reels projects (those with video) and sort strictly by creation date/time descending (newest first)
      const videoProjects = res.data
        .filter((p: any) => p.video_filename || p.video_url)
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setProjects(videoProjects);
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.mov'))) {
      setSelectedFile(file);
      setShowSettingsModal(true);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowSettingsModal(true);
    }
  };

  const uploadVideoFile = async (file: File) => {
    const token = localStorage.getItem('auth_token');
    const formData = new FormData();
    formData.append('video', file);
    formData.append('name', file.name.replace(/\.[^/.]+$/, ""));

    setUploading(true);
    setUploadProgress(0);
    setUploadStage('upload');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/api/projects/upload-video`);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
        if (percent === 100) {
          setUploadStage('processing');
        }
      }
    };

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          console.log('Video uploaded successfully:', data);

          if (data.audio_filename) {
            setUploadStage('processing');
            const mode = writingScript;
            
            const transcribeResponse = await fetch(`${API_BASE_URL}/api/captions/${data.id}/transcribe`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify({ mode })
            });

            if (!transcribeResponse.ok) {
              throw new Error('Transcription failed');
            }
            console.log('Transcription started/finished successfully!');
          }

          setUploading(false);
          navigate(`/reels/editor?projectId=${data.id}`);
        } catch (err) {
          console.error('Error during upload/processing:', err);
          alert('Upload completed but AI transcription processing failed.');
          setUploading(false);
        }
      } else {
        alert('Upload failed. Please try again.');
        setUploading(false);
      }
    };

    xhr.onerror = () => {
      alert('Network error occurred during upload.');
      setUploading(false);
    };

    xhr.send(formData);
  };

  const deleteProject = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project?')) return;
    const token = localStorage.getItem('auth_token');
    try {
      await axios.delete(`${API_BASE_URL}/api/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting project:', err);
      alert('Failed to delete project.');
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timeAgo = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProjects = filteredProjects.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="min-h-screen bg-[#0F0F11] text-white p-6 select-none font-sans">

      {/* Upload Drag & Drop Area */}
      <div 
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="w-full h-[220px] bg-[#161618] border border-dashed border-[#2A2A2D] rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-[#1A1A1C] hover:border-[#ff7800]/50 transition-all group"
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          accept="video/mp4,video/quicktime,video/webm" 
          className="hidden" 
        />
        <div className="w-12 h-12 rounded-full bg-[#1A1A1C] border border-[#2A2A2D] flex items-center justify-center text-[#ff7800] mb-4 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(255,120,0,0.1)]">
          <Upload className="w-5 h-5" />
        </div>
        <p className="text-xs font-bold text-[#e0e0e0] mb-1">Drop your videos here or click to upload</p>
        <p className="text-[10px] text-[#8a8a8e] mb-0.5">Max: 2:00 minutes, 1GB</p>
        <p className="text-[10px] text-[#8a8a8e]">Supports: MP4, MOV</p>
      </div>

      {/* Upload progress Modal */}
      {uploading && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#161618] border border-[#2A2A2D] rounded-2xl p-6 w-[400px] text-center shadow-2xl">
            <Loader2 className="w-10 h-10 text-[#ff7800] animate-spin mx-auto mb-4" />
            <h3 className="text-sm font-bold text-white mb-2">
              {uploadStage === 'upload' ? 'Uploading Video...' : 'Extracting Audio & Processing...'}
            </h3>
            <p className="text-xs text-[#8a8a8e] mb-4">
              {uploadStage === 'upload' ? `Uploading ${uploadProgress}%` : 'This might take a minute, please wait...'}
            </p>
            {uploadStage === 'upload' && (
              <div className="w-full bg-[#2A2A2D] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#ff7800] h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Language & Writing Script settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#161618] border border-[#2A2A2D] rounded-2xl p-6 w-[400px] shadow-2xl flex flex-col gap-6 text-[#e0e0e0]">
            <div>
              <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wider">Language and writing system</h3>
              <p className="text-[11px] text-[#8a8a8e]">Configure transcription settings for your video.</p>
            </div>

            {/* Writing System dropdown */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-[#8a8a8e] font-semibold uppercase tracking-wider">Writing system used?</label>
              <select
                value={writingScript}
                onChange={(e) => setWritingScript(e.target.value as 'native_language' | 'native_english' | 'english')}
                className="w-full bg-[#2A2A2D] border border-[#3A3A3D] text-white px-4 py-3 rounded-xl text-xs font-semibold outline-none focus:border-[#ff7800] cursor-pointer"
              >
                <option value="native_language">Native</option>
                <option value="native_english">Native+English</option>
                <option value="english">Roman</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSettingsModal(false);
                  setSelectedFile(null);
                }}
                className="flex-1 py-2.5 bg-[#2A2A2D] hover:bg-[#3A3A3D] text-white font-semibold text-xs rounded-xl transition-colors focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowSettingsModal(false);
                  if (selectedFile) {
                    uploadVideoFile(selectedFile);
                  }
                }}
                className="flex-1 py-2.5 bg-[#ff7800] hover:bg-[#ff8c24] text-black font-semibold text-xs rounded-xl transition-colors focus:outline-none"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Videos List */}
      <div className="mt-8">
        <h2 className="text-sm font-bold text-[#e0e0e0] tracking-wide mb-5">Recent Videos</h2>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#8a8a8e] gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#ff7800]" />
            <span className="text-xs">Loading projects...</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#8a8a8e] gap-2 bg-[#161618]/50 rounded-2xl border border-[#2A2A2D]">
            <Video className="w-8 h-8 text-[#2A2A2D]" />
            <span className="text-xs">No video projects found. Upload a video above to start.</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-8 gap-3">
              {currentProjects.map((project) => (
              <div 
                key={project.id}
                onClick={() => navigate(`/reels/editor?projectId=${project.id}`)}
                className="group cursor-pointer bg-[#161618] border border-[#2A2A2D] rounded-xl overflow-hidden hover:border-[#ff7800]/50 transition-all flex flex-col"
              >
                {/* Media Thumbnail Container */}
                <div className="relative aspect-[9/16] bg-[#0A0A0C] flex items-center justify-center overflow-hidden">
                  {project.video_url ? (
                    <img 
                      src={`${API_BASE_URL}${project.video_url.replace(/^https?:\/\/[^\/]+/, '')}?thumbnail=true`} 
                      alt={project.name}
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-[#2A2A2D]">
                      <Video className="w-8 h-8" />
                    </div>
                  )}
                  {/* Play Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-[#ff7800] border border-[#ff8c24] flex items-center justify-center text-white opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300 shadow-[0_0_15px_rgba(255,120,0,0.4)]">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                  {/* Duration tag */}
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-bold text-white tracking-wider border border-white/10">
                    {formatDuration(project.duration)}
                  </div>
                </div>

                {/* Footer Info */}
                <div className="p-2.5 flex flex-col gap-0.5 relative">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-bold text-[#e0e0e0] truncate group-hover:text-white transition-colors">{project.name}</span>
                    <div className="relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === project.id ? null : project.id);
                        }}
                        className="p-1 hover:bg-[#2A2A2D] rounded-full text-[#8a8a8e] hover:text-white transition-colors"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                      
                      {activeMenuId === project.id && (
                        <div className="absolute right-0 bottom-full mb-1 bg-[#1A1A1C] border border-[#2A2A2D] rounded-lg shadow-xl py-1 z-30 w-[110px]">
                          <button
                            onClick={(e) => deleteProject(project.id, e)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-red-500 hover:bg-red-500/10 font-medium transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#8a8a8e]">
                    <span>{timeAgo(project.created_at)}</span>
                    <span className="w-1 h-1 rounded-full bg-[#2A2A2D]" />
                    <span>{project.language ? `${project.language} (Native)` : 'English (Native)'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8 pt-6 border-t border-[#2A2A2D]">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-[#2A2A2D] text-xs font-semibold text-[#8a8a8e] hover:text-white hover:border-[#ff7800] disabled:opacity-50 disabled:hover:border-[#2A2A2D] disabled:hover:text-[#8a8a8e] transition-all"
              >
                Previous
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                    currentPage === pageNum
                      ? 'bg-[#ff7800] text-white shadow-[0_0_15px_rgba(255,120,0,0.3)]'
                      : 'border border-[#2A2A2D] text-[#8a8a8e] hover:text-white hover:border-[#ff7800]'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-[#2A2A2D] text-xs font-semibold text-[#8a8a8e] hover:text-white hover:border-[#ff7800] disabled:opacity-50 disabled:hover:border-[#2A2A2D] disabled:hover:text-[#8a8a8e] transition-all"
              >
                Next
              </button>
            </div>
          )}
        </>
        )}
      </div>
    </div>
  );
}
