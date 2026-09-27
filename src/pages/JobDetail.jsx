import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, MapPin, Calendar, User, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import StatusBadge from "@/components/StatusBadge";
import EstimatesSection from "@/components/job/EstimatesSection";
import InvoicesSection from "@/components/job/InvoicesSection";
import ContractsSection from "@/components/job/ContractsSection";
import PhotosSection from "@/components/job/PhotosSection";
import FollowUpsSection from "@/components/job/FollowUpsSection";
import { fullAddress } from "@/lib/invoice";

export default function JobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [estimates, setEstimates] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const j = await base44.entities.Job.get(id);
      setJob(j);
      if (j.customer_id) {
        try { setCustomer(await base44.entities.Customer.get(j.customer_id)); } catch (e) {}
      }
      const [est, inv, con, pho, fu] = await Promise.all([
        base44.entities.Estimate.filter({ job_id: id }, "-created_date"),
        base44.entities.Invoice.filter({ job_id: id }, "-created_date"),
        base44.entities.Contract.filter({ job_id: id }, "-created_date"),
        base44.entities.Attachment.filter({ job_id: id }, "-created_date"),
        base44.entities.FollowUp.filter({ job_id: id }, "due_date"),
      ]);
      setEstimates(est);
      setInvoices(inv);
      setContracts(con);
      setPhotos(pho);
      setFollowups(fu);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const remove = async () => {
    if (!confirm("Delete this job and all its records?")) return;
    await base44.entities.Job.delete(id);
    window.location.href = "/jobs";
  };

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!job) return <p className="text-muted-foreground">Job not found.</p>;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2"><Link to="/jobs"><ArrowLeft className="w-4 h-4 mr-1" /> Back to jobs</Link></Button>

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-heading text-2xl font-semibold tracking-tight">{job.title}</h1>
              <StatusBadge status={job.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-muted-foreground">
              {customer && <div className="flex items-center gap-1.5"><User className="w-4 h-4" /><Link to={`/jobs?customer=${customer.id}`} className="hover:text-foreground">{customer.name}</Link></div>}
              {fullAddress(job, "job_") && <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{fullAddress(job, "job_")}</div>}
              {job.scheduled_date && <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{new Date(job.scheduled_date).toLocaleDateString()}</div>}
            </div>
            {job.description && <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">{job.description}</p>}
          </div>
          <div className="flex gap-1">
            <Button asChild variant="outline" size="sm"><Link to={`/jobs?edit=${job.id}`} onClick={(e) => e.preventDefault()}><Pencil className="w-4 h-4 mr-1" /> Edit</Link></Button>
            <Button variant="ghost" size="sm" onClick={remove}><Trash2 className="w-4 h-4 mr-1 text-destructive" /> Delete</Button>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="invoices">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
          <TabsTrigger value="estimates">Estimates ({estimates.length})</TabsTrigger>
          <TabsTrigger value="contracts">Contracts ({contracts.length})</TabsTrigger>
          <TabsTrigger value="photos">Photos ({photos.length})</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups ({followups.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="invoices" className="mt-4"><InvoicesSection job={job} invoices={invoices} reload={load} /></TabsContent>
        <TabsContent value="estimates" className="mt-4"><EstimatesSection job={job} estimates={estimates} reload={load} /></TabsContent>
        <TabsContent value="contracts" className="mt-4"><ContractsSection job={job} contracts={contracts} reload={load} /></TabsContent>
        <TabsContent value="photos" className="mt-4"><PhotosSection job={job} photos={photos} reload={load} /></TabsContent>
        <TabsContent value="followups" className="mt-4"><FollowUpsSection job={job} followups={followups} reload={load} /></TabsContent>
      </Tabs>
    </div>
  );
}