import BusinessLayout from "@/components/layout/business-layout";
import { ContactAdmin } from "@/components/business/contact-admin";

export default function BusinessMessagesPage() {
  return (
    <BusinessLayout>
      <div className="max-w-6xl mx-auto">
        <ContactAdmin />
      </div>
    </BusinessLayout>
  );
}