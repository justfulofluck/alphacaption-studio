"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Download, Trash2, PlayIcon, PlusCircle, Pencil, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, History } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Column {
  header: string;
  accessorKey: string;
}

interface DashboardTableProps {
  data: any[];
  columns: Column[];
  title?: string;
  section?: string;
  onAction?: (action: string, row: any) => void;
}

export function DashboardTable({ data, columns, title, section, onAction }: DashboardTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;
  const isPayments = section === 'payments';
  const isLedger = section === 'ledger';
  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({});

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const processedData = React.useMemo(() => {
    if (isPayments) {
      const groups: Record<string, any[]> = {};
      data.forEach(item => {
        const email = item.user_email || 'Unknown';
        if (!groups[email]) groups[email] = [];
        groups[email].push(item);
      });
      
      return Object.entries(groups).map(([email, txs]) => ({
        isGroup: true,
        id_key: email,
        user_email: email,
        transactions: txs,
        total_amount: txs.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0),
        latest_date: txs.length > 0 ? txs[0].created_at : ''
      }));
    }
    
    if (isLedger) {
      return data.map(item => ({
        ...item,
        isGroup: true,
        id_key: item.user_email
      }));
    }
    
    return data;
  }, [data, isPayments, isLedger]);
  
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const paginatedData = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset to page 1 if data changes significantly
  React.useEffect(() => {
    setCurrentPage(1);
  }, [processedData.length]);

  return (
    <div className="mt-4">
      <div className="rounded-2xl md:rounded-2xl border border-[#262626] bg-[#1A1A1A] backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar-thin pb-4">
          <Table>
          <TableHeader>
            <TableRow className="border-[#262626] hover:bg-transparent">
              {columns.map((col, i) => (
                <TableHead key={i} className="font-mono font-black uppercase text-[10px] tracking-[0.2em] text-[#A1A1A1] py-6 px-6 whitespace-nowrap">{col.header}</TableHead>
              ))}
              {!isLedger && <TableHead className="text-right font-mono font-black uppercase text-[10px] tracking-[0.2em] text-[#A1A1A1] py-6 px-6 whitespace-nowrap">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? paginatedData.map((row, i) => {
              if (row.isGroup) {
                const isExpanded = expandedGroups[row.id_key];
                return (
                  <React.Fragment key={i}>
                    <TableRow 
                      className="border-[#262626] hover:bg-[#1A1A1A] transition-colors cursor-pointer group"
                      onClick={() => toggleGroup(row.id_key)}
                    >
                      {columns.map((col, k) => (
                        <TableCell key={k} className="py-6 px-6 border-b-0 whitespace-nowrap">
                          {k === 0 ? (
                            <div className="flex items-center gap-3">
                              {isExpanded ? <ChevronUp size={16} className="text-[#A1A1A1]" /> : <ChevronDown size={16} className="text-[#A1A1A1]" />}
                              <span className="text-sm font-bold text-white group-hover:text-[#FF7A00] transition-colors">{row[col.accessorKey]}</span>
                              {!isLedger && (
                                <Badge className="bg-white/10 text-[#A1A1A1] hover:bg-white/20 ml-2 border-0">
                                  {row.transactions.length} Transactions
                                </Badge>
                              )}
                            </div>
                          ) : isPayments && k === 1 ? (
                            <span className="text-sm font-medium text-[#A1A1A1]">Total: ₹{row.total_amount}</span>
                          ) : isPayments && k === 4 ? (
                            <span className="text-[11px] font-bold text-[#A1A1A1]">{row.latest_date}</span>
                          ) : isLedger ? (
                            <span className="text-sm font-medium text-[#A1A1A1] leading-tight block">
                              {String(row[col.accessorKey] || '-').split('\n').map((line, lIdx) => (
                                <React.Fragment key={lIdx}>
                                  {line}
                                  {lIdx < String(row[col.accessorKey] || '-').split('\n').length - 1 && <br />}
                                </React.Fragment>
                              ))}
                            </span>
                          ) : (
                            <span className="text-[#A1A1A1]">-</span>
                          )}
                        </TableCell>
                      ))}
                      {!isLedger && (
                        <TableCell className="text-right py-6 px-6 border-b-0 whitespace-nowrap">
                          <Button variant="ghost" size="icon" className="hover:bg-white/10 rounded-lg" onClick={(e) => { e.stopPropagation(); toggleGroup(row.id_key); }}>
                            <History size={16} className="text-[#A1A1A1]" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                    
                    {isExpanded && row.transactions && row.transactions.map((tx: any, j: number) => {
                      if (isLedger) {
                        return (
                          <TableRow key={`child-${i}-${j}`} className="border-[#262626] bg-black/40 hover:bg-[#1A1A1A] transition-colors group">
                            <TableCell colSpan={2} className="py-4 px-6 pl-16 text-[#A1A1A1] text-[11px] font-bold whitespace-nowrap">
                              {new Date(tx.created_at).toLocaleString()}
                            </TableCell>
                            <TableCell colSpan={2} className="py-4 px-6 text-[#A1A1A1] font-medium capitalize">
                              <Badge className={tx.type === 'credit' ? 'bg-green-500/20 text-green-400 border-0 shadow-none' : 'bg-rose-500/20 text-rose-400 border-0 shadow-none'}>
                                {tx.type}
                              </Badge>
                            </TableCell>
                            <TableCell colSpan={4} className="py-4 px-6 text-[#A1A1A1] font-medium">
                              {tx.description || tx.source}
                            </TableCell>
                            <TableCell colSpan={columns.length - 8} className="py-4 px-6 font-bold text-white text-right">
                              {tx.type === 'credit' ? '+' : '-'}{tx.amount}
                            </TableCell>
                          </TableRow>
                        );
                      } else {
                        return (
                          <TableRow key={`${i}-${j}`} className="border-[#262626] bg-black/40 hover:bg-[#1A1A1A] transition-colors group">
                            {columns.map((col, k) => (
                              <TableCell key={k} className={`py-4 px-6 whitespace-nowrap ${k === 0 ? 'pl-16' : ''}`}>
                                {col.accessorKey === 'status' ? (
                                  <div className="flex">
                                    <Badge 
                                      variant="default" 
                                      className={cn(
                                        "capitalize px-4 py-1.5 border-0 font-black text-[9px] tracking-widest rounded-lg shadow-lg",
                                        tx[col.accessorKey] === 'captured' || tx[col.accessorKey] === 'completed' || tx[col.accessorKey] === 'success'
                                          ? "bg-gradient-to-r from-[#FF7A00] to-[#e66c00] text-white shadow-orange-500/20" 
                                          : "bg-gradient-to-r from-amber-500 to-amber-400 text-white shadow-amber-500/20"
                                      )}
                                    >
                                      {tx[col.accessorKey]}
                                    </Badge>
                                  </div>
                                ) : col.accessorKey === 'name' || col.accessorKey === 'user_email' ? (
                                  <span className="text-sm font-bold text-white/70 transition-colors truncate max-w-[200px] sm:max-w-xs block">{tx[col.accessorKey]}</span>
                                ) : col.accessorKey === 'created_at' ? (
                                  <span className="text-[11px] font-bold text-[#A1A1A1]">
                                    {tx[col.accessorKey]}
                                  </span>
                                ) : (
                                  <span className="text-sm font-medium text-[#A1A1A1]">{tx[col.accessorKey]}</span>
                                )}
                              </TableCell>
                            ))}
                            <TableCell className="text-right py-4 px-6 whitespace-nowrap">
                              <DropdownMenu>
                                <DropdownMenuTrigger>
                                  <button className="inline-flex size-10 items-center justify-center rounded-lg text-[#A1A1A1] hover:text-white hover:bg-white/10 transition-all">
                                    <MoreHorizontal className="size-5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-2xl bg-[#1A1A1A] border-[#262626] text-white">
                                  <DropdownMenuGroup>
                                    <DropdownMenuLabel className="font-mono text-[10px] font-black uppercase tracking-widest text-[#A1A1A1] px-3 py-2">Actions</DropdownMenuLabel>
                                  </DropdownMenuGroup>
                                  <DropdownMenuSeparator className="bg-[#1A1A1A] mx-1" />
                                  <DropdownMenuItem 
                                    className="rounded-lg cursor-pointer font-bold gap-3 px-3 py-2 text-rose-500 focus:bg-rose-500/10 focus:text-rose-500" 
                                    onClick={() => onAction?.('delete', tx)}
                                  >
                                    <Trash2 size={14} /> 
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      }
                    })}
                  </React.Fragment>
                );
              }

              // Normal non-grouped rendering (users, projects, etc)
              return (
              <TableRow key={i} className="border-[#262626] hover:bg-[#1A1A1A] transition-colors group">
                {columns.map((col, j) => (
                  <TableCell key={j} className="py-6 px-6 whitespace-nowrap">
                    {col.accessorKey === 'status' ? (
                      <div className="flex">
                        <Badge 
                          variant="default" 
                          className={cn(
                            "capitalize px-4 py-1.5 border-0 font-black text-[9px] tracking-widest rounded-lg shadow-lg",
                            row[col.accessorKey] === 'transcribed' || row[col.accessorKey] === 'completed' || row[col.accessorKey] === 'aligned' || row[col.accessorKey] === 'success' || row[col.accessorKey] === 'captured'
                              ? "bg-gradient-to-r from-[#FF7A00] to-[#e66c00] text-white shadow-orange-500/20" 
                              : "bg-gradient-to-r from-amber-500 to-amber-400 text-white shadow-amber-500/20"
                          )}
                        >
                          {row[col.accessorKey]}
                        </Badge>
                      </div>
                    ) : col.accessorKey === 'name' ? (
                      <span className="text-sm font-bold text-white group-hover:text-[#FF7A00] transition-colors truncate max-w-[200px] sm:max-w-xs block">{row[col.accessorKey]}</span>
                    ) : col.accessorKey === 'created_at' ? (
                      <span className="text-[11px] font-bold text-[#A1A1A1]">
                        {row[col.accessorKey]}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-[#A1A1A1]">{row[col.accessorKey]}</span>
                    )}
                  </TableCell>
                ))}
                <TableCell className="text-right py-6 px-6 whitespace-nowrap">
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <button className="inline-flex size-10 items-center justify-center rounded-lg text-[#A1A1A1] hover:text-white hover:bg-white/10 transition-all">
                        <MoreHorizontal className="size-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-2xl bg-[#1A1A1A] border-[#262626] text-white">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel className="font-mono text-[10px] font-black uppercase tracking-widest text-[#A1A1A1] px-3 py-2">Actions</DropdownMenuLabel>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator className="bg-[#1A1A1A] mx-1" />

                      {(!section || section === 'projects') && (
                        <>
                          <DropdownMenuItem className="rounded-lg cursor-pointer font-bold gap-3 px-3 py-2 focus:bg-[#1A1A1A]" onClick={() => onAction?.('open', row)}>
                            <Pencil size={14} className="text-[#A1A1A1]" /> Open Editor
                          </DropdownMenuItem>
                          
                          {(row.status === 'aligned' || row.status === 'completed' || row.status === 'transcribed') && (
                            <DropdownMenuItem className="rounded-lg cursor-pointer font-bold gap-3 px-3 py-2 focus:bg-[#1A1A1A]" onClick={() => onAction?.('download', row)}>
                              <Download size={14} className="text-[#A1A1A1]" /> Export SRT
                            </DropdownMenuItem>
                          )}
                        </>
                      )}

                      {section === 'users' && (
                        <>
                          <DropdownMenuItem className="rounded-lg cursor-pointer font-bold gap-3 px-3 py-2 focus:bg-[#1A1A1A]" onClick={() => onAction?.('add_credits', row)}>
                            <PlusCircle size={14} className="text-[#A1A1A1]" /> Add Credits
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-lg cursor-pointer font-bold gap-3 px-3 py-2 focus:bg-[#1A1A1A]" onClick={() => onAction?.('edit_user', row)}>
                            <Pencil size={14} className="text-[#A1A1A1]" /> Edit User
                          </DropdownMenuItem>
                        </>
                      )}
                      {section === 'plans' && (
                        <>
                          <DropdownMenuItem className="rounded-lg cursor-pointer font-bold gap-3 px-3 py-2 focus:bg-[#1A1A1A]" onClick={() => onAction?.('edit_plan', row)}>
                            <Pencil size={14} className="text-[#A1A1A1]" /> Edit Plan
                          </DropdownMenuItem>
                        </>
                      )}

                      <DropdownMenuSeparator className="bg-[#1A1A1A] mx-1" />
                      <DropdownMenuItem 
                        className="rounded-lg cursor-pointer font-bold gap-3 px-3 py-2 text-rose-500 focus:bg-rose-500/10 focus:text-rose-500" 
                        onClick={() => onAction?.('delete', row)}
                      >
                        <Trash2 size={14} /> 
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
              );
            }) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length + 1} className="h-40 text-center text-[#A1A1A1] font-medium">
                  {isPayments ? "No payments found." : (isLedger ? "No ledger records found." : "No data found.")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 px-4">
          <p className="text-[10px] font-black text-[#A1A1A1] uppercase tracking-widest">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, processedData.length)} of {processedData.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="h-10 w-10 rounded-lg text-[#A1A1A1] hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </Button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`h-10 w-10 rounded-lg text-[10px] font-black transition-all ${
                    currentPage === i + 1 
                      ? 'bg-[#FF7A00] text-white shadow-none hover:shadow-[0_0_20px_rgba(255,122,0,0.4)]' 
                      : 'text-[#A1A1A1] hover:text-white hover:bg-[#1A1A1A]'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="h-10 w-10 rounded-lg text-[#A1A1A1] hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
