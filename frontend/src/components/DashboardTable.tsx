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
import { MoreHorizontal, Download, Trash2, PlayIcon, PlusCircle, Pencil, ChevronLeft, ChevronRight } from "lucide-react"
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
  
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const paginatedData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset to page 1 if data changes significantly
  React.useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  return (
    <div className="mt-4">
      <div className="rounded-[2.5rem] border border-white/5 bg-zinc-900/40 backdrop-blur-xl shadow-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              {columns.map((col, i) => (
                <TableHead key={i} className="font-black uppercase text-[10px] tracking-[0.2em] text-zinc-500 py-6 px-6">{col.header}</TableHead>
              ))}
              <TableHead className="text-right font-black uppercase text-[10px] tracking-[0.2em] text-zinc-500 py-6 px-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? paginatedData.map((row, i) => (
              <TableRow key={i} className="border-white/5 hover:bg-white/5 transition-colors group">
                {columns.map((col, j) => (
                  <TableCell key={j} className="py-6 px-6">
                    {col.accessorKey === 'status' ? (
                      <div className="flex">
                        <Badge 
                          variant="default" 
                          className={cn(
                            "capitalize px-4 py-1.5 border-0 font-black text-[9px] tracking-widest rounded-xl shadow-lg",
                            row[col.accessorKey] === 'transcribed' || row[col.accessorKey] === 'completed' || row[col.accessorKey] === 'aligned'
                              ? "bg-gradient-to-r from-[#ff7800] to-[#e66c00] text-white shadow-orange-500/20" 
                              : "bg-gradient-to-r from-amber-500 to-amber-400 text-white shadow-amber-500/20"
                          )}
                        >
                          {row[col.accessorKey]}
                        </Badge>
                      </div>
                    ) : col.accessorKey === 'name' ? (
                      <span className="text-sm font-bold text-white group-hover:text-[#ff7800] transition-colors truncate max-w-[200px] sm:max-w-xs block">{row[col.accessorKey]}</span>
                    ) : col.accessorKey === 'created_at' ? (
                      <span className="text-[11px] font-bold text-zinc-500">
                        {row[col.accessorKey]}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-zinc-400">{row[col.accessorKey]}</span>
                    )}
                  </TableCell>
                ))}
                <TableCell className="text-right py-6 px-6">
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <button className="inline-flex size-10 items-center justify-center rounded-xl text-zinc-500 hover:text-white hover:bg-white/10 transition-all">
                        <MoreHorizontal className="size-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-2xl bg-zinc-900 border-white/5 text-white">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-3 py-2">Project Actions</DropdownMenuLabel>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator className="bg-white/5 mx-1" />

                      {/* Project Specific Actions */}
                      {(!section || section === 'projects') && (
                        <>
                          <DropdownMenuItem className="rounded-xl cursor-pointer font-bold gap-3 px-3 py-2 focus:bg-white/5" onClick={() => onAction?.('open', row)}>
                            <Pencil size={14} className="text-zinc-500" /> Open Editor
                          </DropdownMenuItem>
                          
                          {(row.status === 'aligned' || row.status === 'completed' || row.status === 'transcribed') && (
                            <DropdownMenuItem className="rounded-xl cursor-pointer font-bold gap-3 px-3 py-2 focus:bg-white/5" onClick={() => onAction?.('download', row)}>
                              <Download size={14} className="text-zinc-500" /> Export SRT
                            </DropdownMenuItem>
                          )}
                        </>
                      )}

                      <DropdownMenuSeparator className="bg-white/5 mx-1" />
                      <DropdownMenuItem 
                        className="rounded-xl cursor-pointer font-bold gap-3 px-3 py-2 text-rose-500 focus:bg-rose-500/10 focus:text-rose-500" 
                        onClick={() => onAction?.('delete', row)}
                      >
                        <Trash2 size={14} /> 
                        Delete Project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length + 1} className="h-40 text-center text-zinc-500 font-medium">
                  No projects found. Start by creating a new one!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 px-4">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, data.length)} of {data.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="h-10 w-10 rounded-xl text-zinc-500 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </Button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`h-10 w-10 rounded-xl text-[10px] font-black transition-all ${
                    currentPage === i + 1 
                      ? 'bg-[#ff7800] text-white shadow-[0_0_15px_rgba(255,120,0,0.3)]' 
                      : 'text-zinc-500 hover:text-white hover:bg-white/5'
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
              className="h-10 w-10 rounded-xl text-zinc-500 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
