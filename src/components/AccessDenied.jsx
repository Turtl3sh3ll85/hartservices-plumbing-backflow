import { Link } from "react-router-dom";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <ShieldX className="w-10 h-10 text-muted-foreground mb-3" />
      <h1 className="font-heading text-xl font-semibold">Access denied</h1>
      <p className="text-sm text-muted-foreground mt-1">You don't have permission to view this page.</p>
      <Button asChild variant="outline" className="mt-5"><Link to="/">Go home</Link></Button>
    </div>
  );
}