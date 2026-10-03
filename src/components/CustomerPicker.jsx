import { useState } from "react";
import { UserPlus, Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import GoogleContactsDialog from "@/components/GoogleContactsDialog"; // Using your existing component!

export default function CustomerSelector({ onContactSaved }) {
  const [isGooglePickerOpen, setIsGooglePickerOpen] = useState(false);
  
  // Selected Contact State
  const [selectedContact, setSelectedContact] = useState(null);
  
  // Missing Email Popup State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [tempContact, setTempContact] = useState(null);
  const [manualEmail, setManualEmail] = useState("");

  // Triggered when a contact is selected from your GoogleContactsDialog
  const handleGoogleContactPick = (contact) => {
    const name = contact.name || "";
    const phone = contact.phone || "";
    const email = contact.email || "";

    if (!email) {
      // No email found: Save data temporarily and show the popup modal
      setTempContact({ name, phone });
      setShowEmailModal(true);
    } else {
      // Email exists: Finalize selection immediately
      finalizeContact({ name, phone, email });
    }
  };

  const finalizeContact = (contactData) => {
    setSelectedContact(contactData);
    if (onContactSaved) onContactSaved(contactData);
  };

  const handleManualEmailSubmit = (e) => {
    e.preventDefault();
    finalizeContact({
      name: tempContact.name,
      phone: tempContact.phone,
      email: manualEmail
    });
    
    // Close the popup and reset
    setShowEmailModal(false);
    setTempContact(null);
    setManualEmail("");
  };

  return (
    <div className="space-y-4">
      {/* If no contact is selected, show the import button */}
      {!selectedContact ? (
        <Button onClick={() => setIsGooglePickerOpen(true)} variant="outline" className="w-full sm:w-auto">
          <UserPlus className="w-4 h-4 mr-2" />
          Import from Google Contacts
        </Button>
      ) : (
        /* If a contact IS selected, show a clean read-only display instead of 3 text boxes */
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

      {/* Your existing Google Contacts Integration */}
      <GoogleContactsDialog 
        open={isGooglePickerOpen} 
        onOpenChange={setIsGooglePickerOpen} 
        onPick={handleGoogleContactPick} 
      />

      {/* Missing Email Popup Modal */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Missing Email
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            We pulled <strong className="text-foreground">{tempContact?.name}</strong>'s info from Google Contacts, but they don't have an email saved. Please enter one below.
          </p>
          <form onSubmit={handleManualEmailSubmit} className="space-y-4 mt-2">
            <Input 
              type="email" 
              value={manualEmail} 
              onChange={(e) => setManualEmail(e.target.value)}
              placeholder="customer@example.com"
              required
              autoFocus
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowEmailModal(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Save & Continue
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
