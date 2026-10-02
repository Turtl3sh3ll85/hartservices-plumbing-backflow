import { Paperclip, FileText, Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

/**
 * Dropdown that lists an invoice's customer-visible attachments and lets the
 * customer open/download each one. Used on portal invoice rows.
 *
 * Props:
 *  - attachments: array of InvoiceAttachment records for this invoice
 */
export default function InvoiceAttachmentsDropdown({ attachments = [] }) {
  if (!attachments.length) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="relative min-h-11 sm:min-h-9"
          aria-label={`View ${attachments.length} attachment${attachments.length === 1 ? "" : "s"}`}
        >
          <Paperclip className="w-4 h-4" />
          <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold leading-4 flex items-center justify-center">
            {attachments.length}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Attachments ({attachments.length})
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {attachments.map((att) => (
          <DropdownMenuItem key={att.id} asChild>
            <a
              href={att.drive_link}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 py-2"
            >
              <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm">{att.file_name}</span>
              <Download className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}