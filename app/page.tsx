import Image from "next/image";
import AgentChatWidget from "@/components/AgentChatWidget";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import MarketPriceCarousel from "@/components/MarketPriceCarousel";
import {
  Bell,
  ChartLine,
  Check,
  ChevronRight,
  CircleHelp,
  FileText,
  MapPin,
  MessageSquare,
  Play,
  Scale,
  Send,
  ShoppingBag,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { FaApple, FaWhatsapp } from "react-icons/fa";
import { FaGooglePlay } from "react-icons/fa6";
import Login from "@/app/login/page"


export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Login/>
      <AgentChatWidget />
    </main>
  );
}
