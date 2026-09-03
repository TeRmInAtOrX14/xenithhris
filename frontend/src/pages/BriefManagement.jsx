import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileCode,
  Download,
  Search,
  User,
  Upload,
  Image as ImageIcon,
  FileText,
  Eye,
  MessageSquare,
  UserPlus,
  X,
  RefreshCw,
  Plus
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const ACCEPTED_TYPES = '.png, .jpeg, .jpg, .webp, .pdf, .docx';

export default function BriefManagement() {
  const [sales, setSales] = useState([]);
  const [designers, setDesigners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDesigner, setFilterDesigner] = useState('');

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const [activeSale, setActiveSale] = useState(null);
  const [activeBrief, setActiveBrief] = useState(null);

  // Form states
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [briefForm, setBriefForm] = useState({
    fileName: '',
    fileUrl: '',
    fileType: 'png',
    designerId: '',
    notes: ''
  });

  const [assignDesignerId, setAssignDesignerId] = useState('');
  const [artistUpdateData, setArtistUpdateData] = useState({
    status: 'In Progress',
    artistUpdate: ''
  });

  const [uploading, setUploading] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('user')) || {};
  const isCEOOrAdmin = ['Admin', 'CEO', 'COO'].includes(currentUser.role);
  const isTL = currentUser.role === 'Team Lead';
  const isDesigner = currentUser.role === 'Designer';

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/sales');
      const salesData = res.data || [];
      setSales(salesData);

      if (salesData.length > 0 && !selectedSaleId) {
        setSelectedSaleId(salesData[0].id);
      }

      const empRes = await api.get('/employees');
      const allEmps = empRes.data || [];
      const artistEmps = allEmps.filter(e =>
        e.user?.role === 'Designer' ||
        e.isArtist ||
        (e.designation || '').toLowerCase().includes('designer') ||
        (e.designation || '').toLowerCase().includes('artist')
      );
      setDesigners(artistEmps);
    } catch (e) {
      toast.error('Failed to load project briefs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = ['png', 'jpeg', 'jpg', 'webp', 'pdf', 'docx'];
    if (!validExts.includes(ext)) {
      return toast.error('Accepted formats: PNG, JPEG, WEBP, PDF, DOCX');
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      setBriefForm({
        ...briefForm,
        fileName: file.name,
        fileUrl: evt.target.result,
        fileType: ext
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBrief = async (e) => {
    e.preventDefault();
    const targetSaleId = activeSale?.id || selectedSaleId;
    if (!targetSaleId || !briefForm.fileName || !briefForm.fileUrl) {
      return toast.error('Please select a project and a brief file.');
    }
    try {
      setUploading(true);
      await api.post(`/sales/${targetSaleId}/briefs`, briefForm);
      toast.success(`Brief "${briefForm.fileName}" uploaded successfully!`);
      setUploadModalOpen(false);
      setBriefForm({ fileName: '', fileUrl: '', fileType: 'png', designerId: '', notes: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload brief file');
    } finally {
      setUploading(false);
    }
  };

  const handleAssignArtist = async (e) => {
    e.preventDefault();
    if (!activeSale) return;
    try {
      await api.patch(`/sales/${activeSale.id}/assign-artist`, { designerId: assignDesignerId });
      toast.success('Artist assigned to project & briefs');
      setAssignModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign artist');
    }
  };

  const handleArtistUpdate = async (e) => {
    e.preventDefault();
    if (!activeBrief) return;
    try {
      await api.patch(`/sales/briefs/${activeBrief.id}/artist-update`, artistUpdateData);
      toast.success('Brief status & updates saved!');
      setUpdateModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update brief');
    }
  };

  const filteredSales = sales.filter(s => {
    if (isDesigner && s.designerId !== currentUser.employee?.id) {
      return false;
    }
    if (filterDesigner && s.designerId !== filterDesigner) {
      return false;
    }
    const q = search.toLowerCase();
    return (
      s.clientName?.toLowerCase().includes(q) ||
      s.projectName?.toLowerCase().includes(q) ||
      s.projectNumber?.toLowerCase().includes(q) ||
      s.designer?.fullName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-[#111111] p-6 rounded-2xl border border-[#262626]">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-white font-display uppercase flex items-center gap-2">
            <FileCode className="w-5 h-5 text-[#D7F000]" />
            Project Briefs & Artwork Repository
          </h2>
          <p className="text-xs text-brand-text-gray mt-1">
            Upload & assign PNG, JPEG, WEBP, PDF & DOCX briefs to Artists. Track progress notes and deliverable updates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* TOP LEVEL PROMINENT UPLOAD BRIEF BUTTON */}
          <button
            onClick={() => {
              setActiveSale(sales[0] || null);
              if (sales[0]) setSelectedSaleId(sales[0].id);
              setBriefForm({ fileName: '', fileUrl: '', fileType: 'png', designerId: sales[0]?.designerId || '', notes: '' });
              setUploadModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#D7F000] text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-[#E8F52A] transition-all shadow-md shadow-[#D7F000]/20 cursor-pointer"
          >
            <Upload className="w-4 h-4" /> + Upload Project Brief
          </button>

          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-brand-text-mute absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search project, brief..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-[#262626] bg-black text-xs text-white placeholder-brand-text-mute focus:outline-none focus:border-[#D7F000]"
            />
          </div>

          {(isCEOOrAdmin || isTL) && (
            <select
              value={filterDesigner}
              onChange={(e) => setFilterDesigner(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#262626] bg-black text-xs text-white cursor-pointer focus:outline-none focus:border-[#D7F000]"
            >
              <option value="">All Assigned Artists</option>
              {designers.map(d => (
                <option key={d.id} value={d.id}>{d.fullName}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Grid of Project Cards with Briefs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-16 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#D7F000] mb-2" />
            <p className="text-xs text-brand-text-mute">Loading project briefs...</p>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="col-span-full py-16 text-center text-brand-text-mute italic border border-dashed border-[#262626] rounded-2xl space-y-3">
            <p>No project briefs found matching your search.</p>
            <button
              onClick={() => {
                setActiveSale(null);
                setBriefForm({ fileName: '', fileUrl: '', fileType: 'png', designerId: '', notes: '' });
                setUploadModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#D7F000] text-black font-extrabold text-xs uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" /> Upload Brief Now
            </button>
          </div>
        ) : (
          filteredSales.map(sale => {
            const briefsList = sale.briefs || [];
            const latestBrief = briefsList[0];

            return (
              <motion.div
                key={sale.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl bg-[#111111] border border-[#262626] hover:border-[#383838] transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-[#262626] pb-2">
                    <span className="px-2.5 py-0.5 rounded bg-black text-[#D7F000] border border-[#262626] font-mono text-[10px] font-extrabold">
                      {sale.projectNumber}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                      sale.briefStatus === 'Uploaded'
                        ? 'bg-[#D7F000]/15 text-[#D7F000] border border-[#D7F000]/30'
                        : 'bg-[#E8F52A]/15 text-[#E8F52A] border border-[#E8F52A]/30'
                    }`}>
                      {sale.briefStatus} ({briefsList.length} v)
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-white font-display">{sale.projectName}</h3>
                    <p className="text-xs text-brand-text-gray">Client: {sale.clientName}</p>
                  </div>

                  {/* Assigned Artist Badge */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-black border border-[#262626]">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-[#D7F000]" />
                      <div>
                        <p className="text-[8px] text-brand-text-mute uppercase font-bold">Assigned Artist</p>
                        <p className="text-xs font-bold text-white">{sale.designer?.fullName || 'Unassigned'}</p>
                      </div>
                    </div>
                    {(isCEOOrAdmin || isTL) && (
                      <button
                        onClick={() => { setActiveSale(sale); setAssignDesignerId(sale.designerId || ''); setAssignModalOpen(true); }}
                        className="px-2.5 py-1 rounded bg-[#171717] hover:bg-black text-[#D7F000] border border-[#262626] text-[9px] font-bold uppercase flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <UserPlus className="w-3 h-3" /> Assign
                      </button>
                    )}
                  </div>

                  {/* Brief File Display / Image Preview */}
                  {latestBrief ? (
                    <div className="p-3 rounded-xl bg-black border border-[#262626] space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          {['png', 'jpeg', 'jpg', 'webp'].includes(latestBrief.fileType) ? (
                            <ImageIcon className="w-4 h-4 text-[#D7F000] shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-[#E8F52A] shrink-0" />
                          )}
                          <span className="font-bold text-white truncate text-xs">{latestBrief.fileName}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-[#171717] text-[#D7F000] border border-[#262626] font-mono text-[9px] font-bold shrink-0">
                          {latestBrief.fileType.toUpperCase()} v{latestBrief.version}
                        </span>
                      </div>

                      {/* Image Thumbnail Preview for PNG, JPEG, WEBP */}
                      {['png', 'jpeg', 'jpg', 'webp'].includes(latestBrief.fileType) && latestBrief.fileUrl && (
                        <div className="relative rounded-lg overflow-hidden border border-[#262626] max-h-36 bg-black group">
                          <img
                            src={latestBrief.fileUrl}
                            alt={latestBrief.fileName}
                            className="w-full h-36 object-contain group-hover:scale-105 transition-transform"
                          />
                          <button
                            onClick={() => { setActiveBrief(latestBrief); setPreviewModalOpen(true); }}
                            className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-1.5 transition-opacity"
                          >
                            <Eye className="w-4 h-4" /> Full View
                          </button>
                        </div>
                      )}

                      {latestBrief.notes && (
                        <p className="text-[10px] text-brand-text-gray italic">Notes: "{latestBrief.notes}"</p>
                      )}

                      {/* Artist Update Note */}
                      {latestBrief.artistUpdate && (
                        <div className="p-2 rounded bg-[#171717] border border-[#262626] text-[10px]">
                          <p className="font-bold text-[#D7F000]">Artist Progress Update:</p>
                          <p className="text-white italic">"{latestBrief.artistUpdate}"</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-black/40 border border-dashed border-[#262626] text-center">
                      <p className="text-xs text-brand-text-mute italic">No brief file uploaded yet</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-[#262626] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setActiveSale(sale);
                        setSelectedSaleId(sale.id);
                        setBriefForm({ fileName: '', fileUrl: '', fileType: 'png', designerId: sale.designerId || '', notes: '' });
                        setUploadModalOpen(true);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#D7F000] text-black font-extrabold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-[#E8F52A] cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload Brief File
                    </button>

                    {latestBrief && (
                      <a
                        href={latestBrief.fileUrl}
                        download={latestBrief.fileName}
                        className="py-2 px-3 rounded-xl bg-black border border-[#262626] text-white font-bold text-[10px] uppercase flex items-center gap-1.5 hover:border-[#D7F000]"
                      >
                        <Download className="w-3.5 h-3.5 text-[#D7F000]" /> Download
                      </a>
                    )}
                  </div>

                  {/* Artist Update Button */}
                  {latestBrief && (
                    <button
                      onClick={() => {
                        setActiveBrief(latestBrief);
                        setArtistUpdateData({ status: latestBrief.status || 'In Progress', artistUpdate: latestBrief.artistUpdate || '' });
                        setUpdateModalOpen(true);
                      }}
                      className="w-full py-1.5 px-3 rounded-xl bg-[#171717] hover:bg-black text-[#E8F52A] border border-[#262626] font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Post Brief Status Update
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Brief Upload Modal */}
      <AnimatePresence>
        {uploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111111] border border-[#262626] rounded-2xl p-6 max-w-md w-full text-left space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#262626] pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-white font-display flex items-center gap-2">
                    <Upload className="w-4 h-4 text-[#D7F000]" /> Upload Project Brief
                  </h3>
                  <p className="text-[10px] text-brand-text-gray">Attach artwork specification brief to project</p>
                </div>
                <button onClick={() => setUploadModalOpen(false)} className="text-brand-text-mute hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveBrief} className="space-y-4">
                {/* Project Selector if opening top-level modal */}
                <div>
                  <label className="block text-[10px] font-bold text-brand-text-gray uppercase mb-1">Target Project *</label>
                  <select
                    value={activeSale?.id || selectedSaleId}
                    onChange={(e) => {
                      const found = sales.find(s => s.id === e.target.value);
                      setActiveSale(found || null);
                      setSelectedSaleId(e.target.value);
                    }}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#262626] bg-black text-xs text-white focus:outline-none focus:border-[#D7F000] cursor-pointer"
                  >
                    <option value="">Select Target Project...</option>
                    {sales.map(s => (
                      <option key={s.id} value={s.id}>#{s.projectNumber} — {s.projectName} ({s.clientName})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-brand-text-gray uppercase mb-1">Select File (PNG, JPEG, WEBP, PDF, DOCX) *</label>
                  <input
                    type="file"
                    accept={ACCEPTED_TYPES}
                    onChange={handleFileUpload}
                    required
                    className="w-full text-xs text-brand-text-gray file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-[#D7F000] file:text-black hover:file:bg-[#E8F52A] cursor-pointer"
                  />
                  <p className="text-[9px] text-brand-text-mute mt-1">Accepts PNG, JPEG, JPG, WEBP, PDF & DOCX</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-brand-text-gray uppercase mb-1">Assign Artist (Optional)</label>
                  <select
                    value={briefForm.designerId}
                    onChange={e => setBriefForm({ ...briefForm, designerId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#262626] bg-black text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="">Keep Current / Unassigned</option>
                    {designers.map(d => (
                      <option key={d.id} value={d.id}>{d.fullName} ({d.designation})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-brand-text-gray uppercase mb-1">Brief Notes / Requirements</label>
                  <textarea
                    rows={3}
                    value={briefForm.notes}
                    onChange={e => setBriefForm({ ...briefForm, notes: e.target.value })}
                    placeholder="Specific artwork instructions, dimensions, color schemes..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#262626] bg-black text-xs text-white focus:outline-none focus:border-[#D7F000]"
                  />
                </div>

                <div className="flex gap-3 pt-2 border-t border-[#262626]">
                  <button
                    type="button"
                    onClick={() => setUploadModalOpen(false)}
                    className="flex-1 py-2 rounded-xl border border-[#262626] text-xs text-brand-text-gray hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 py-2 rounded-xl bg-[#D7F000] text-black font-extrabold text-xs uppercase tracking-wider hover:bg-[#E8F52A] disabled:opacity-50 cursor-pointer"
                  >
                    {uploading ? 'Uploading...' : 'Upload Brief'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CEO Assign Artist Modal */}
      <AnimatePresence>
        {assignModalOpen && activeSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111111] border border-[#262626] rounded-2xl p-6 max-w-sm w-full text-left space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#262626] pb-3">
                <div>
                  <span className="text-[10px] font-bold text-[#D7F000] uppercase font-mono">{activeSale.projectNumber}</span>
                  <h3 className="text-sm font-extrabold text-white font-display">Assign Artist to Project</h3>
                </div>
                <button onClick={() => setAssignModalOpen(false)} className="text-brand-text-mute hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAssignArtist} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-brand-text-gray uppercase mb-1">Select Artist</label>
                  <select
                    value={assignDesignerId}
                    onChange={e => setAssignDesignerId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#262626] bg-black text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="">Select Artist...</option>
                    {designers.map(d => (
                      <option key={d.id} value={d.id}>{d.fullName} ({d.designation})</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-2 border-t border-[#262626]">
                  <button
                    type="button"
                    onClick={() => setAssignModalOpen(false)}
                    className="flex-1 py-2 rounded-xl border border-[#262626] text-xs text-brand-text-gray hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-[#D7F000] text-black font-extrabold text-xs uppercase hover:bg-[#E8F52A] cursor-pointer"
                  >
                    Assign Artist
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Brief Status Update Modal */}
      <AnimatePresence>
        {updateModalOpen && activeBrief && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111111] border border-[#262626] rounded-2xl p-6 max-w-md w-full text-left space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#262626] pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-white font-display">Post Brief Status Update</h3>
                  <p className="text-[10px] text-brand-text-mute">{activeBrief.fileName}</p>
                </div>
                <button onClick={() => setUpdateModalOpen(false)} className="text-brand-text-mute hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleArtistUpdate} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-brand-text-gray uppercase mb-1">Brief Status</label>
                  <select
                    value={artistUpdateData.status}
                    onChange={e => setArtistUpdateData({ ...artistUpdateData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#262626] bg-black text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Feedback">Feedback Requested</option>
                    <option value="Approved">Approved / Finished</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-brand-text-gray uppercase mb-1">Update / Deliverable Notes</label>
                  <textarea
                    rows={3}
                    value={artistUpdateData.artistUpdate}
                    onChange={e => setArtistUpdateData({ ...artistUpdateData, artistUpdate: e.target.value })}
                    placeholder="e.g. Completed line art sketch, working on base colors..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#262626] bg-black text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2 border-t border-[#262626]">
                  <button
                    type="button"
                    onClick={() => setUpdateModalOpen(false)}
                    className="flex-1 py-2 rounded-xl border border-[#262626] text-xs text-brand-text-gray hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-[#D7F000] text-black font-extrabold text-xs uppercase hover:bg-[#E8F52A] cursor-pointer"
                  >
                    Post Update
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full Image Preview Modal */}
      <AnimatePresence>
        {previewModalOpen && activeBrief && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-4xl w-full text-center space-y-3"
            >
              <div className="flex justify-between items-center text-white px-2">
                <p className="text-sm font-bold">{activeBrief.fileName}</p>
                <button onClick={() => setPreviewModalOpen(false)} className="text-brand-text-mute hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <img src={activeBrief.fileUrl} alt={activeBrief.fileName} className="max-h-[80vh] mx-auto rounded-xl border border-[#262626] object-contain" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
