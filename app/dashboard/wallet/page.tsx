import { WalletCards } from "lucide-react";
import { CustomerMobilePlaceholder } from "@/components/CustomerMobilePlaceholder";

export default function WalletPage() {
  return (
    <CustomerMobilePlaceholder
      description="Your balance, payment history, refunds, and saved payment options will live here when wallet services are connected."
      icon={WalletCards}
      linkHref="/dashboard/orders"
      linkLabel="View payments"
      title="Wallet is coming"
    />
  );
}
