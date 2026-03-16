"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPaginationRange } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage:  number;
  totalPages:   number;
  onPageChange: (page: number) => void;
  className?:   string;
}

export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const range = getPaginationRange(currentPage, totalPages);

  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      {/* Prev */}
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      {/* Pages */}
      {range.map((item, i) =>
        item === "..." ? (
          <span key={`dots-${i}`} className="px-2 text-gray-400 text-sm select-none">
            …
          </span>
        ) : (
          <Button
            key={item}
            variant={item === currentPage ? "default" : "outline"}
            size="icon"
            className="h-9 w-9 text-sm"
            onClick={() => onPageChange(item as number)}
          >
            {item}
          </Button>
        )
      )}

      {/* Next */}
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}