import React, { useState } from 'react';

export default function CustomerSelector() {
  // Form fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  
  // Missing Email Popup State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [tempContact, setTempContact] = useState(null);
  const [manualEmail, setManualEmail] = useState('');

  const handleOpenContacts = async () => {
    // 1. Check if the device/browser supports the Contact Picker API
    const isSupported = 'contacts' in navigator && 'ContactsManager' in window;
    
    if (!isSupported) {
      alert('Your browser or device does not support the Contact Picker API.');
      return;
    }

    try {
      // 2. Open the native Google/Device Contacts screen
      const props = ['name', 'email', 'tel'];
      const opts = { multiple: false };
      const contacts = await navigator.contacts.select(props, opts);
      
      if (contacts.length > 0) {
        const selected = contacts[0];
        
        // The API returns arrays for each property, so we grab the first item
        const name = selected.name ? selected.name[0] : '';
        const phone = selected.tel ? selected.tel[0] : '';
        const email = selected.email ? selected.email[0] : '';

        // 3. Conditional Logic: Does this contact have an email?
        if (!email) {
          // No email found: Save data temporarily and show the popup modal
          setTempContact({ name, phone });
          setShowEmailModal(true);
        } else {
          // Email exists: Populate all fields immediately
          setCustomerName(name);
          setCustomerPhone(phone);
          setCustomerEmail(email);
        }
      }
    } catch (error) {
      console.error('Error selecting contact:', error);
    }
  };

  const handleManualEmailSubmit = () => {
    // Save the manually typed email alongside the pulled contact data
    setCustomerName(tempContact.name);
    setCustomerPhone(tempContact.phone);
    setCustomerEmail(manualEmail);
    
    // Close the popup and reset
    setShowEmailModal(false);
    setTempContact(null);
    setManualEmail('');
  };

  return (
    <div className="p-4 space-y-4">
      {/* Contact Picker Button */}
      <button 
        onClick={handleOpenContacts}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Select Customer from Contacts
      </button>

      {/* Populated Data Display (Your Form Fields) */}
      <div className="flex flex-col gap-2 mt-4">
        <input type="text" value={customerName} readOnly placeholder="Name" className="border p-2"/>
        <input type="text" value={customerPhone} readOnly placeholder="Phone" className="border p-2"/>
        <input type="text" value={customerEmail} readOnly placeholder="Email" className="border p-2"/>
      </div>

      {/* Missing Email Popup Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 p-6 rounded-lg w-full max-w-sm border border-zinc-700">
            <h3 className="text-white text-lg font-bold mb-2">Missing Email</h3>
            <p className="text-zinc-400 mb-4 text-sm">
              We pulled {tempContact?.name}'s info, but they don't have an email saved in your phone. Please enter one below.
            </p>
            <input 
              type="email" 
              value={manualEmail} 
              onChange={(e) => setManualEmail(e.target.value)}
              placeholder="customer@example.com"
              className="w-full border border-zinc-700 bg-zinc-800 text-white p-2 rounded mb-4"
            />
            <button 
              onClick={handleManualEmailSubmit}
              className="w-full bg-blue-600 text-white py-2 rounded font-semibold"
            >
              Save & Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}