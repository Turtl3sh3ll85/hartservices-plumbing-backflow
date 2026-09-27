import { Checkbox } from "@/components/ui/checkbox";
import { ScrollText } from "lucide-react";

const TERMS = [
  {
    title: "1. PLUMBING SCOPE ONLY",
    body: `Hartservices Plumbing and Backflow LLC is a plumbing-specific contractor. Pricing covers plumbing labor and materials only. Unless explicitly itemized, the following are EXCLUDED:

Trades: Electrical (bonding/terminations), HVAC (condensate), and Irrigation.
Restoration: Sheetrock, painting, flooring, and landscaping/rock replacement.
Sub-Surface: Excavation, rock removal, and unmarked underground wires/pipes.
Insulation etc...`,
  },
  {
    title: "2. ACCESS & OBSTRUCTIONS",
    body: `The customer is responsible for providing clear access to the workspace. Hartservices is not responsible for moving personal property, furniture, or heavy appliances. If items must be moved to perform work, it is done at the owner's risk and may incur additional labor charges.`,
  },
  {
    title: "3. SITE CONDITION & CLEANING",
    body: `We provide a "Broom Clean" workspace for debris created during our work.

Trash Disposal: Job-related debris will be placed in the customer's on-site waste receptacle.

Existing Messes: We are not responsible for cleaning pre-existing clutter, pet waste, or dust. Professional deep cleaning or HEPA vacuuming is not provided.`,
  },
  {
    title: "4. SCHEDULING & TIMELINES",
    body: `Unless a rigid deadline is agreed upon in writing prior to acceptance, all jobs are performed without a fixed schedule. Hartservices works without time pressure to ensure quality. Any required time constraints must be disclosed upfront as they may impact the final estimate.`,
  },
  {
    title: "5. LIABILITY & LIMITATIONS",
    body: `While Hartservices will make every reasonable effort to protect the property and prevent damage, the customer acknowledges that plumbing work inherently requires operating in tight spaces and utilizing specialized chemical compounds (such as pipe dope, thread sealants, primers, and adhesives). Consequently, any incidental damage, staining, scratching, scuffing, or tearing that occurs in good faith to surrounding surfaces—including aged or brittle infrastructure, delicate wall treatments (such as wallpaper or custom paint), and third-party installed porous materials (such as unsealed natural stone), particularly where more durable alternatives were available and overlooked—shall be accepted by the customer as an inherent risk and cost of the project. Hartservices is fully indemnified against any such liability, restoration, or repair costs.`,
  },
  {
    title: "6. WORKMANSHIP WARRANTY & RIGHT TO CURE",
    body: `All services include a 1-year workmanship warranty effective from the date of first payment.

Right to Cure: In the event of a warranty claim, the customer agrees to provide Hartservices the first opportunity to inspect and repair the work before hiring a third party. Hartservices is not liable for costs incurred by unauthorized third-party repairs.`,
  },
  {
    title: "7. RIGHT TO CANCEL & EMERGENCY WAIVER",
    body: `Customers may have a statutory right to cancel this contract within three (3) business days of signing. However:

Commencement of Work: If the customer requests or allows work to begin prior to the end of the 3-day period, they remain fully responsible for payment of all labor performed and materials installed up to the point of cancellation.

Emergency Waiver: For emergency repairs (e.g., active leaks or loss of sanitary facilities), the customer's request for immediate service constitutes an explicit waiver of the 3-day right to cancel.`,
  },
  {
    title: "8. BINDING ACCEPTANCE",
    body: `Making a deposit or payment constitutes full legal acceptance of these terms. These conditions are provided on every estimate and invoice for transparency.`,
  },
];

const ACKNOWLEDGMENT =
  "By accepting this estimate or making a payment, I acknowledge that I have read, understand, and agree to the Hartservices Plumbing and Backflow LLC Service Terms & Conditions appended to this document, including the 1-year workmanship warranty, the emergency work waiver, and the limitations of liability for pre-existing structures.";

export default function ServiceTerms({ agreed, onChange, disabled = false }) {
  return (
    <div className="bg-card rounded-2xl shadow-sm border p-6 mt-4">
      <div className="flex items-center gap-1.5 text-sm font-medium mb-3">
        <ScrollText className="w-4 h-4" /> Service Terms &amp; Conditions
      </div>
      <div className="max-h-72 overflow-y-auto pr-2 space-y-3 text-sm text-muted-foreground border rounded-lg p-4 bg-muted/20">
        {TERMS.map((t) => (
          <div key={t.title}>
            <div className="font-medium text-foreground">{t.title}</div>
            <div className="mt-1 whitespace-pre-line leading-relaxed">{t.body}</div>
          </div>
        ))}
      </div>
      <p className="text-sm mt-4 leading-relaxed">{ACKNOWLEDGMENT}</p>
      <label className="flex items-start gap-2.5 mt-3 cursor-pointer select-none">
        <Checkbox checked={!!agreed} onCheckedChange={(v) => onChange(!!v)} disabled={disabled} className="mt-0.5" />
        <span className="text-sm font-medium">I Agree to These Conditions</span>
      </label>
    </div>
  );
}