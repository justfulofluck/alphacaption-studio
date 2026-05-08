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
import { MoreHorizontal, Download, Trash2, PlayIcon, PlusCircle, Pencil } from "lucide-react"
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
  return (
    <div className="px-4 lg:px-6 mt-4">
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map((col, i) => (
                <TableHead key={i} className="font-bold uppercase text-[10px] tracking-widest">{col.header}</TableHead>
              ))}
              <TableHead className="text-right font-bold uppercase text-[10px] tracking-widest">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? data.map((row, i) => (
              <TableRow key={i} className="hover:bg-muted/30 transition-colors">
                {columns.map((col, j) => (
                  <TableCell key={j} className="text-sm font-medium">
                    {col.accessorKey === 'status' ? (
                      <Badge 
                        variant="default" 
                        className={cn(
                          "capitalize px-3 py-0.5 border-0 font-black text-[10px] tracking-widest",
                          row[col.accessorKey] === 'captured' || row[col.accessorKey] === 'completed' || row[col.accessorKey] === 'active' 
                            ? "bg-emerald-500 hover:bg-emerald-600 text-white" 
                            : row[col.accessorKey] === 'pending'
                            ? "bg-amber-500 hover:bg-amber-600 text-white"
                            : "bg-rose-500 hover:bg-rose-600 text-white"
                        )}
                      >
                        {row[col.accessorKey]}
                      </Badge>
                    ) : col.accessorKey === 'plan' ? (
                      <Badge variant="secondary" className="capitalize">
                        {row[col.accessorKey]}
                      </Badge>
                    ) : col.accessorKey === 'amount' && section === 'payments' ? (
                      <span className="font-black text-zinc-900">
                        {row.currency === 'INR' ? '₹' : '$'}{row[col.accessorKey]}
                      </span>
                    ) : col.accessorKey === 'transaction_id' ? (
                      <span className="font-mono text-[10px] bg-zinc-100 px-2 py-1 rounded-lg text-zinc-500">
                        {row[col.accessorKey]}
                      </span>
                    ) : col.accessorKey === 'type' ? (
                      <Badge variant={row[col.accessorKey] === 'credit' ? 'default' : 'destructive'} className="capitalize bg-opacity-10 border-0 font-black tracking-widest text-[10px]">
                        {row[col.accessorKey] === 'credit' ? `+ ${row.amount}` : `- ${row.amount}`}
                      </Badge>
                    ) : col.accessorKey === 'created_at' ? (
                      <span className="text-[11px] font-bold text-zinc-500">
                        {new Date(row[col.accessorKey]).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                    ) : (
                      row[col.accessorKey]
                    )}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger 
                      render={
                        <Button variant="ghost" size="icon" className="size-8 rounded-xl hover:bg-zinc-100">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      } 
                    />
                    <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-xl border-zinc-100">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-2 py-1.5">Project Actions</DropdownMenuLabel>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator className="my-1" />

                      {/* Project Specific Actions */}
                      {(!section || section === 'projects') && (
                        <>
                          <DropdownMenuItem className="rounded-xl cursor-pointer font-bold gap-2" onClick={() => onAction?.('open', row)}>
                            <Pencil size={14} className="text-zinc-500" /> Open Editor
                          </DropdownMenuItem>
                          
                          {(row.status === 'aligned' || row.status === 'completed') && (
                            <DropdownMenuItem className="rounded-xl cursor-pointer font-bold gap-2" onClick={() => onAction?.('download', row)}>
                              <Download size={14} className="text-zinc-500" /> Export SRT
                            </DropdownMenuItem>
                          )}
                        </>
                      )}

                      {section === 'users' && (
                        <>
                          <DropdownMenuItem className="rounded-xl cursor-pointer font-bold gap-2" onClick={() => onAction?.('add_credits', row)}>
                            <PlusCircle size={14} className="text-zinc-500" /> Add Credits
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-xl cursor-pointer font-bold gap-2" onClick={() => onAction?.('edit_user', row)}>
                            <Pencil size={14} className="text-zinc-500" /> Edit User
                          </DropdownMenuItem>
                        </>
                      )}

                      {section === 'plans' && (
                        <DropdownMenuItem className="rounded-xl cursor-pointer font-bold gap-2" onClick={() => onAction?.('edit_plan', row)}>
                          <Pencil size={14} className="text-zinc-500" /> Edit Plan
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator className="my-1" />
                      <DropdownMenuItem 
                        className="rounded-xl cursor-pointer font-bold gap-2 text-destructive focus:bg-red-50 focus:text-destructive" 
                        onClick={() => onAction?.('delete', row)}
                      >
                        <Trash2 size={14} /> 
                        Delete {section === 'plans' ? 'Plan' : section === 'users' ? 'User' : 'Project'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="h-24 text-center text-muted-foreground">
                  No records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
