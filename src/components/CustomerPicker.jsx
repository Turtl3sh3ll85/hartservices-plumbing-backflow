import { useState } from "react";
import { UserPlus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function CustomerSelector({ onContactSaved }) {
  // Form fields
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  
  // Missing Email Popup State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [tempContact, setTempContact] = useState(null);
  const [manualEmail, setManualEmail] = useState("");

  const handleOpenContacts = async () => {
    const isSupported = "contacts" in navigator && "ContactsManager" in window;
    
    if (!isSupported) {
      alert("Your browser or device does not support the Contact Picker API. Please use Chrome on Android.");
      return;
    }

    try {
      const props = ["name", "email", "tel"];
      const opts = { multiple: false };
      const contacts = await navigator.contacts.select(props, opts);
      
      if (contacts && contacts.length > 0) {
        const selected = contacts[0];
        const name = selected.name ? selected.name[0] : "";
        const phone = selected.tel ? selected.tel[0] : "";
        const email = selected.email ? selected.email[0] : "";

        if (!email) {
          // No email found: Save data temporarily and show the popup modal
          setTempContact({ name, phone });
          setShowEmailModal(true);
        } else {
          // Email exists: Populate all fields immediately
          setCustomerName(name);
          setCustomerPhone(phone);
          setCustomerEmail(email);
          if (onContactSaved) onContactSaved({ name, phone, email });
        }
      }
    } catch (error) {
      console.error("Error selecting contact:", error);
    }
  };

  const handleManualEmailSubmit = (e) => {
    e.preventDefault();
    setCustomerName(tempContact.name);
    setCustomerPhone(tempContact.phone);
    setCustomerEmail(manualEmail);
    
    if (onContactSaved) {
      onContactSaved({ name: tempContact.name, phone: tempContact.phone, email: manualEmail });
    }
    
    setShowEmailModal(false);
    setTempContact(null);
    setManualEmail("");
  };

  return (
    <div className="space-y-4">
      {/* Contact Picker Button */}
      <Button onClick={handleOpenContacts} variant="outline" className="w-full sm:w-auto">
        <UserPlus className="w-4 h-4 mr-2" />
        Import from Phone Contacts
      </Button>

      {/* Populated Data Display (Your Form Fields) */}
      <div className="grid gap-3 sm:grid-cols-3 mt-4">
        <div>
          <Label>Name</Label>
          <Input type="text" value={customerName} readOnly placeholder="Imported Name" />
        </div>
        <div>
          <Label>Phone</Label>
          <Input type="text" value={customerPhone} readOnly placeholder="Imported Phone" />
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" value={customerEmail} readOnly placeholder="Imported Email" />
        </div>
      </div>

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
            We pulled <strong className="text-foreground">{tempContact?.name}</strong>'s info, but they don't have an email saved in your phone. Please enter one below.
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