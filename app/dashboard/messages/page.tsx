import { MessageCircle } from "lucide-react";
import { CustomerMobilePlaceholder } from "@/components/CustomerMobilePlaceholder";

export default function MessagesPage() {
  return (
    <CustomerMobilePlaceholder
      description="Order updates and conversations with the Ojaboy support team will appear here."
      icon={MessageCircle}
      linkHref="/dashboard/support"
      linkLabel="Contact support"
      title="No messages yet"
    />
  );
}
