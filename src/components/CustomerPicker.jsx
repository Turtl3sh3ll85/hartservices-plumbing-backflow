import { useState } from "react";
import { UserPlus, Mail, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import GoogleContactsDialog from "@/components/GoogleContactsDialog";

export default function CustomerSelector({ onContactSaved }) {
  const { toast } = useToast();
  const [isGooglePickerOpen, setIsGooglePickerOpen] = useState(false);
  
  // Selected Contact State
  const [selectedContact, setSelectedContact] = useState(null);
  
  // Missing Email Popup State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [tempContact, setTempContact] = useState(null);
  const [manualEmail, setManualEmail] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleGoogleContactPick = (contact) => {
    const name = contact.name || "";
    const phone = contact.phone || "";
    const email = contact.email || "";

    if (!email) {
      // Store the FULL contact object so we have its Google ID for the update call later
      setTempContact({ ...contact, name, phone });
      setShowEmailModal(true);
    } else {
      finalizeContact({ ...contact, name, phone, email });
    }
  };

  const finalizeContact = (contactData) => {
    setSelectedContact(contactData);
    if (onContactSaved) onContactSaved(contactData);
  };

  const handleManualEmailSubmit = async (e) => {
    e.preventDefault();
    const emailStr = manualEmail.trim();
    if (!emailStr) return;

    setIsUpdating(true);

    try {
      // 1. Push the new email back to Google Contacts via your backend
      await base44.functions.invoke("updateGoogleContact", {
        contact_id: tempContact.id || tempContact.resourceName, 
        email: emailStr
      });
      toast({ title: "Google Contact updated with new email!" });
    } catch (err) {
      console.error("Failed to update Google Contact:", err);
      toast({ 
        title: "Google Sync Failed", 
        description: "Email was saved locally, but we couldn't push it to Google. Check your workspace permissions.", 
        variant: "destructive" 
      });
    }

    // 2. Finalize the local selection
    finalizeContact({
      ...tempContact,
      email: emailStr
    });
    
    setIsUpdating(false);
    closeEmailModal();
  };

  const closeEmailModal = () => {
    setShowEmailModal(false);
    setTempContact(null);
    setManualEmail("");
  };

  return (
    <div className="space-y-4">
      {!selectedContact ? (
        <Button onClick={() => setIsGooglePickerOpen(true)} variant="outline" className="w-full sm:w-auto">
          <UserPlus className="w-4 h-4 mr-2" />
          Import from Google Contacts
        </Button>
      ) : (
        <div className="flex items-center justify-between p-3 border rounded-md bg-card">
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">{selectedContact.name || "Unknown Name"}</div>
            <div className="text-sm text-muted-foreground truncate flex gap-2">
              <span>{selectedContact.email}</span>
              {selectedContact.phone && <span>• {selectedContact.phone}</span>}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSelectedContact(null)} 
            className="shrink-0 ml-2 hover:bg-destructive/10 hover:text-destructive"
            aria-label="Clear selected contact"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <GoogleContactsDialog 
        open={isGooglePickerOpen} 
        onOpenChange={setIsGooglePickerOpen} 
        onPick={handleGoogleContactPick} 
      />

      <Dialog open={showEmailModal}>
        <DialogContent 
          className="max-w-sm"
          onInteractOutside={(e) => e.preventDefault()} 
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Email Required
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{tempContact?.name}</strong> is missing an email address. Enter one below to update their Google Contact profile and proceed.
          </p>
          <form onSubmit={handleManualEmailSubmit} className="space-y-4 mt-2">
            <Input 
              type="email" 
              value={manualEmail} 
              onChange={(e) => setManualEmail(e.target.value)}
              placeholder="customer@example.com"
              required
              autoFocus
              disabled={isUpdating}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={closeEmailModal} disabled={isUpdating}>
                Cancel Import
              </Button>
              <Button type="submit" disabled={!manualEmail.trim() || isUpdating}>
                {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save to Google & Continue
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}