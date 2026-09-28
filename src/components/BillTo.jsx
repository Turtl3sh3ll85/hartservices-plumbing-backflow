import { fullAddress } from "@/lib/invoice";

// Renders the "Bill to" block: company in bold if available (else the contact name),
// followed by the contact name (when a company is shown), email, phone, and address.
export default function BillTo({ customer, className = "" }) {
  if (!customer) return null;
  const name = customer.name;
  const company = customer.company;
  const address = fullAddress(customer);
  const email = customer.email;
  const phone = customer.phone;

  return (
    <div className={className}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Bill to</div>
      {company ? (
        <>
          <div className="font-semibold">{company}</div>
          {name && <div className="text-muted-foreground">{name}</div>}
        </>
      ) : (
        name && <div className="font-semibold">{name}</div>
      )}
      {email && <div className="text-muted-foreground">{email}</div>}
      {phone && <div className="text-muted-foreground">{phone}</div>}
      {address && <div className="text-muted-foreground">{address}</div>}
    </div>
  );
}