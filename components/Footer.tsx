import { FaFacebookF, FaInstagram, FaLinkedinIn, FaYoutube } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import Logo from "./Logo";

const footerGroups = [
  { title: "Company", links: ["About Us", "Careers", "Contact Us", "Press"] },
  { title: "Resources", links: ["Help Center", "Blog", "Guides", "Terms of Service"] },
  { title: "Legal", links: ["Privacy Policy", "Cookie Policy", "Refund Policy"] },
];

const socialLinks = [
  { label: "Facebook", icon: FaFacebookF },
  { label: "Instagram", icon: FaInstagram },
  { label: "LinkedIn", icon: FaLinkedinIn },
  { label: "X", icon: FaXTwitter },
  { label: "YouTube", icon: FaYoutube },
];

export default function Footer() {
  return (
    <footer className="border-t border-black/10 bg-white px-5 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_2fr_0.8fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm font-medium leading-6 text-black/58">
              Your personal market shopper and intelligence partner.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h2 className="mb-3 text-sm font-black text-black">{group.title}</h2>
                <ul className="space-y-2">
                  {group.links.map((link) => (
                    <li key={link}>
                      <a className="text-sm font-medium text-black/58 hover:text-[#f10606]" href="#">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div>
            <h2 className="mb-3 text-sm font-black text-black">Follow Us</h2>
            <div className="flex flex-wrap gap-2">
              {socialLinks.map((social) => (
                <a className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff0f0] text-[#f10606] hover:bg-[#f10606] hover:text-white" href="#" key={social.label} aria-label={social.label}>
                  <social.icon size={15} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-9 flex flex-col gap-3 border-t border-black/10 pt-6 text-sm font-medium text-black/50 sm:flex-row sm:items-center sm:justify-between">
          <p>(c) 2024 Ojaboy. All rights reserved.</p>
          <p>Built for smarter market decisions.</p>
        </div>
      </div>
    </footer>
  );
}
