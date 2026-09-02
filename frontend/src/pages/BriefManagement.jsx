import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileCode, Download, Search, Calendar, User, Clock, CheckCircle, FolderOpen } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function BriefManagement() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchSalesWithBriefs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/sales');
      setSales(res.data);
    } catch (e) {
      toast.error('Failed to load project briefs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesWithBriefs();
  }, []);

  const filteredSales = sales.filter(s =>
    s.clientName.toLowerCase().includes(search.toLowerCase()) ||
    s.projectName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-white font-display uppercase flex items-center gap-2">
            <FileCode className="w-5 h-5 text-brand-cyan" />
            Project Brief Repository & Versioning
          </h2>
          <p className="text-xs text-brand-text-soft mt-1">Access all client briefs, DOCX/PDF attachments, and historical version records.</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-brand-text-mute absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by client or project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-brand-border bg-brand-bg-soft/40 text-xs text-white placeholder-brand-text-mute focus:outline-none focus:border-brand-blue"
          />
        </div>
      </div>

      {/* Grid of Brief Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSales.map(sale => {
          const latestBrief = sale.briefs?.[0];

          return (
            <motion.div
              key={sale.id}
              className="p-5 rounded-2xl glass-panel border border-brand-border/40 hover:border-brand-border-strong transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                    sale.briefStatus === 'Uploaded'
                      ? 'bg-brand-green/10 text-brand-green border-brand-green/20'
                      : 'bg-brand-amber/10 text-brand-amber border-brand-amber/20'
                  }`}>
                    {sale.briefStatus}
                  </span>
                  <span className="text-[10px] font-mono text-brand-text-mute">
                    {new Date(sale.saleDate).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-white mt-3">{sale.projectName}</h3>
                <p className="text-xs text-brand-cyan font-semibold mt-0.5">{sale.clientName}</p>

                {/* Brief versions */}
                {latestBrief ? (
                  <div className="mt-4 p-3 rounded-xl bg-brand-bg/40 border border-brand-border space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white truncate max-w-[160px]">{latestBrief.fileName}</span>
                      <span className="px-2 py-0.5 rounded bg-brand-cyan/15 text-brand-cyan font-mono text-[9px] font-bold">
                        v{latestBrief.version}
                      </span>
                    </div>
                    {latestBrief.notes && (
                      <p className="text-[10px] text-brand-text-soft italic">"{latestBrief.notes}"</p>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 p-3 rounded-xl bg-brand-bg/20 border border-dashed border-brand-border text-center">
                    <p className="text-xs text-brand-text-mute italic">No brief uploaded yet</p>
                  </div>
                )}
              </div>

              {/* Version List & Download */}
              <div className="pt-3 border-t border-brand-border/40 flex justify-between items-center text-xs">
                <span className="text-brand-text-mute text-[10px] font-mono">
                  {sale.briefs?.length || 0} total version(s)
                </span>
                {latestBrief && (
                  <a
                    href={latestBrief.fileUrl}
                    download={latestBrief.fileName}
                    className="px-3.5 py-1.5 rounded-full bg-brand-blue/15 border border-brand-blue/30 text-brand-cyan font-bold text-[10px] uppercase flex items-center gap-1.5 hover:bg-brand-blue/30 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Latest
                  </a>
                )}
              </div>
            </motion.div>
          );
        })}

        {filteredSales.length === 0 && (
          <div className="col-span-full py-16 text-center text-brand-text-mute italic border border-dashed border-brand-border rounded-2xl">
            No project briefs found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
