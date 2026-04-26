"use client"

import * as React from "react"
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
import { MoreHorizontal, Download, Trash2, PlayIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
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
  onAction?: (action: string, row: any) => void;
}

export function DashboardTable({ data, columns, title, onAction }: DashboardTableProps) {
  return (
    <div className="px-4 lg:px-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold tracking-tight">{title || "Recent Records"}</h2>
        <Badge variant="secondary" className="rounded-full">{data.length} Total</Badge>
      </div>
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
                      <Badge variant={row[col.accessorKey] === 'completed' || row[col.accessorKey] === 'active' ? 'default' : 'outline'} className="capitalize px-2 py-0">
                        {row[col.accessorKey]}
                      </Badge>
                    ) : col.accessorKey === 'plan' ? (
                      <Badge variant="secondary" className="capitalize">
                        {row[col.accessorKey]}
                      </Badge>
                    ) : (
                      row[col.accessorKey]
                    )}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger 
                      render={
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {row.audio_filename ? (
                        <>
                          <DropdownMenuItem onClick={() => onAction?.('play', row)}>
                            <PlayIcon size={14} className="mr-2" /> Play Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAction?.('download', row)}>
                            <Download size={14} className="mr-2" /> Download SRT
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <DropdownMenuItem onClick={() => onAction?.('manage', row)}>Manage User</DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground" onClick={() => onAction?.('delete', row)}>
                        <Trash2 size={14} className="mr-2" /> Delete
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
